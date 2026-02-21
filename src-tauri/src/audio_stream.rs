//! Tiny local HTTP server that streams lecture audio files.
//!
//! WebKitGTK's GStreamer media pipeline cannot load audio from Tauri custom URI
//! schemes.  By serving files over plain `http://127.0.0.1:<port>/<lecture-id>`
//! we get reliable audio playback with proper MIME types, range-request support,
//! and zero extra crate dependencies.

use crate::db::queries::get_lecture_by_id;
use crate::db::AppDatabase;
use std::io::{Read, Seek, SeekFrom, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::thread;
use tauri::{AppHandle, Manager};

/// State stored in Tauri so the front-end can query the port.
pub struct AudioServerPort(pub u16);

/// Determine a MIME type from a file extension.
fn mime_for_extension(ext: Option<&str>) -> &'static str {
    match ext {
        Some("wav") => "audio/wav",
        Some("mp3") => "audio/mpeg",
        Some("ogg" | "oga") => "audio/ogg",
        Some("m4a" | "mp4" | "aac") => "audio/mp4",
        Some("webm") => "audio/webm",
        Some("flac") => "audio/flac",
        _ => "application/octet-stream",
    }
}

/// Resolve the best available audio file for a given lecture.
fn resolve_audio_path(app: &AppHandle, lecture_id: &str) -> Result<PathBuf, String> {
    // 1. Prefer the prepared WAV generated during transcription.
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let prepared = app_data_dir
            .join("prepared-audio")
            .join(format!("{lecture_id}-16khz-mono.wav"));
        if prepared.exists() {
            return Ok(prepared);
        }
    }

    // 2. Fall back to the original audio stored in the DB.
    let database = app
        .try_state::<AppDatabase>()
        .ok_or_else(|| "Database not initialised".to_string())?;
    let connection = database
        .connect()
        .map_err(|e| format!("DB connection: {e}"))?;
    let lecture = get_lecture_by_id(&connection, lecture_id)
        .map_err(|e| format!("DB query: {e}"))?
        .ok_or_else(|| format!("Lecture not found: {lecture_id}"))?;

    let path = PathBuf::from(&lecture.audio_path);
    if !path.exists() {
        return Err(format!("Audio file not found: {}", path.display()));
    }
    Ok(path)
}

// ────────────────────────────────────────────────────────────────────────────
// Minimal HTTP/1.1 request parser (only what we need)
// ────────────────────────────────────────────────────────────────────────────

struct HttpRequest {
    path: String,
    range: Option<String>,
}

fn parse_request(raw: &[u8]) -> Option<HttpRequest> {
    let text = std::str::from_utf8(raw).ok()?;
    let first_line = text.lines().next()?;
    let mut parts = first_line.split_whitespace();
    let _method = parts.next()?; // GET
    let raw_path = parts.next()?;

    // Decode percent-encoded path
    let path = percent_decode(raw_path.split('?').next().unwrap_or(raw_path));

    let mut range = None;
    for line in text.lines().skip(1) {
        let lower = line.to_ascii_lowercase();
        if lower.starts_with("range:") {
            range = Some(line["range:".len()..].trim().to_string());
            break;
        }
    }

    Some(HttpRequest { path, range })
}

fn percent_decode(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let bytes = input.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(h), Some(l)) = (hex_val(bytes[i + 1]), hex_val(bytes[i + 2])) {
                output.push((h << 4 | l) as char);
                i += 3;
                continue;
            }
        }
        output.push(bytes[i] as char);
        i += 1;
    }
    output
}

fn hex_val(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

fn parse_range(header: &str, file_size: u64) -> Option<(u64, u64)> {
    let spec = header.strip_prefix("bytes=")?;
    let (start_str, end_str) = spec.split_once('-')?;

    if start_str.is_empty() {
        let suffix: u64 = end_str.parse().ok()?;
        let start = file_size.saturating_sub(suffix);
        return Some((start, file_size - 1));
    }

    let start: u64 = start_str.parse().ok()?;
    if start >= file_size {
        return None;
    }
    let end = if end_str.is_empty() {
        file_size - 1
    } else {
        end_str.parse::<u64>().ok()?.min(file_size - 1)
    };
    if end < start {
        return None;
    }
    Some((start, end))
}

// ────────────────────────────────────────────────────────────────────────────
// Response helpers
// ────────────────────────────────────────────────────────────────────────────

fn write_error(stream: &mut std::net::TcpStream, status: u16, reason: &str, body: &str) {
    let response = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: text/plain\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes());
}

fn handle_connection(stream: &mut std::net::TcpStream, app: &AppHandle) {
    let mut buf = vec![0u8; 8192];
    let n = match stream.read(&mut buf) {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    buf.truncate(n);

    let request = match parse_request(&buf) {
        Some(r) => r,
        None => {
            write_error(stream, 400, "Bad Request", "Malformed HTTP request");
            return;
        }
    };

    // Path is `/<lecture-id>` — strip the leading `/`
    let lecture_id = request.path.trim_start_matches('/');
    if lecture_id.is_empty() {
        write_error(stream, 400, "Bad Request", "Missing lecture ID");
        return;
    }

    let audio_path = match resolve_audio_path(app, lecture_id) {
        Ok(p) => p,
        Err(msg) => {
            write_error(stream, 404, "Not Found", &msg);
            return;
        }
    };

    let file_size = match std::fs::metadata(&audio_path) {
        Ok(m) => m.len(),
        Err(_) => {
            write_error(stream, 500, "Internal Server Error", "Cannot stat file");
            return;
        }
    };

    let mime = mime_for_extension(audio_path.extension().and_then(|e| e.to_str()));

    // ── Range request ──────────────────────────────────────────────────
    if let Some(ref range_header) = request.range {
        if let Some((start, end)) = parse_range(range_header, file_size) {
            let length = end - start + 1;
            let mut file = match std::fs::File::open(&audio_path) {
                Ok(f) => f,
                Err(_) => {
                    write_error(stream, 500, "Internal Server Error", "Cannot open file");
                    return;
                }
            };
            if file.seek(SeekFrom::Start(start)).is_err() {
                write_error(stream, 500, "Internal Server Error", "Seek failed");
                return;
            }

            let header = format!(
                "HTTP/1.1 206 Partial Content\r\n\
                 Content-Type: {mime}\r\n\
                 Content-Length: {length}\r\n\
                 Content-Range: bytes {start}-{end}/{file_size}\r\n\
                 Accept-Ranges: bytes\r\n\
                 Access-Control-Allow-Origin: *\r\n\
                 Connection: close\r\n\r\n"
            );
            if stream.write_all(header.as_bytes()).is_err() {
                return;
            }

            let mut remaining = length;
            let mut chunk = vec![0u8; 65536];
            while remaining > 0 {
                let to_read = (remaining as usize).min(chunk.len());
                match file.read(&mut chunk[..to_read]) {
                    Ok(0) => break,
                    Ok(n) => {
                        if stream.write_all(&chunk[..n]).is_err() {
                            return;
                        }
                        remaining -= n as u64;
                    }
                    Err(_) => return,
                }
            }
            return;
        }
    }

    // ── Full file response ─────────────────────────────────────────────
    let mut file = match std::fs::File::open(&audio_path) {
        Ok(f) => f,
        Err(_) => {
            write_error(stream, 500, "Internal Server Error", "Cannot open file");
            return;
        }
    };

    let header = format!(
        "HTTP/1.1 200 OK\r\n\
         Content-Type: {mime}\r\n\
         Content-Length: {file_size}\r\n\
         Accept-Ranges: bytes\r\n\
         Access-Control-Allow-Origin: *\r\n\
         Connection: close\r\n\r\n"
    );
    if stream.write_all(header.as_bytes()).is_err() {
        return;
    }

    let mut chunk = vec![0u8; 65536];
    loop {
        match file.read(&mut chunk) {
            Ok(0) => break,
            Ok(n) => {
                if stream.write_all(&chunk[..n]).is_err() {
                    return;
                }
            }
            Err(_) => return,
        }
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

/// Start the audio server on a random port.  Returns the port number.
/// The server runs in a background thread and lives for the app's lifetime.
pub fn start_audio_server(app: &AppHandle) -> u16 {
    let listener =
        TcpListener::bind("127.0.0.1:0").expect("Failed to bind audio server to loopback");
    let port = listener.local_addr().unwrap().port();

    let app_handle = app.clone();

    thread::spawn(move || {
        for stream in listener.incoming() {
            match stream {
                Ok(mut tcp_stream) => {
                    let app_clone = app_handle.clone();
                    thread::spawn(move || {
                        handle_connection(&mut tcp_stream, &app_clone);
                    });
                }
                Err(_) => continue,
            }
        }
    });

    port
}
