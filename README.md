
<div align="center">
  <h1>Knowte</h1>
  <img src="public/Knowte.png" alt="Knowte Logo" width="200">
</div>

**Transform lecture audio into structured learning materials — completely private, fully offline.**

Knowte is a desktop application that turns lecture recordings into structured notes, interactive quizzes, flashcards, mind maps, and related research papers. All processing happens locally on your machine using [Ollama](https://ollama.ai) for LLM inference and [Whisper](https://github.com/openai/whisper) for transcription. No data ever leaves your device.

---

## Demo

<div align="center">
  <img src="public/Knowte.gif" alt="Knowte Demo" />
</div>

---

## Features

- 🎙️ **Audio & Video Input** — Upload audio/video files or record directly from your microphone. Supports MP3, WAV, M4A, OGG, WebM, MP4, MKV, and more.
- 📺 **YouTube Import** — Paste a YouTube URL and Knowte downloads and transcribes the audio using `yt-dlp`.
- 📝 **Transcription** — Local speech-to-text using [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) with model sizes from tiny (~75 MB) to large (~3 GB).
- 📖 **Structured Notes** — LLM-generated notes organised into topics, key points, examples, key terms, and takeaways.
- ✅ **Interactive Quiz** — Auto-generated multiple choice, true/false, and short-answer questions with explanations and score tracking.
- 🃏 **Flashcards** — Anki-style flashcards with card-flip animations, three-pile study mode, and Anki `.apkg` / `.txt` export.
- 🧠 **Mind Map** — Visual tree of lecture concepts using React Flow, with PNG and SVG export.
- 🔬 **Research Papers** — Related academic papers via the Semantic Scholar API (optional, requires internet).
- 💡 **Explain This** — Select any text and get a contextual AI explanation, with "simpler" / "deeper" controls.
- 📚 **Lecture Library** — Persistent SQLite-backed history of all lectures with full-text search.
- 🔒 **100% Local & Private** — No cloud API calls (except the optional Semantic Scholar paper search). Audio and transcripts never leave your machine.

---

## Prerequisites

### 1. Ollama

Ollama runs language models locally. Download and install it from **[ollama.ai](https://ollama.ai)**, then pull a model:

```bash
# Recommended — good balance of quality and speed (~4.7 GB)
ollama pull llama3.1:8b

# Lightweight option (~2.3 GB)
ollama pull phi3:mini
```

Verify it's running:

```bash
curl http://localhost:11434/api/tags
```

### 2. ffmpeg

Knowte bundles platform-specific `ffmpeg` and `yt-dlp` binaries. For development see [CONTRIBUTING.md](docs/CONTRIBUTING.md).

---

## Quick Start

1. **Install prerequisites** (Ollama + a model — see above)
2. **Download Knowte** from the [Releases](../../releases) page and install it
3. **On first launch**, the setup wizard guides you through:
   - Verifying Ollama is running
   - Choosing a language model
   - Downloading a Whisper transcription model
   - Setting your academic level for personalised outputs
4. **Upload a lecture** — drag and drop an audio/video file, or paste a YouTube URL
5. **Click "Process Knowte"** — Knowte transcribes and generates all materials automatically

---

## Building from Source

### Requirements

| Tool | Version | Install |
|------|---------|---------|
| [Rust](https://rustup.rs) | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| [Bun](https://bun.sh) | ≥ 1.0 | `curl -fsSL https://bun.sh/install \| bash` |
| Tauri CLI | v2 | included in `devDependencies` |
| Ollama | any | [ollama.ai](https://ollama.ai) |

### Development

```bash
git clone https://github.com/GxAditya/Knowte.git
cd knowte
bun install
bun run tauri dev
```

### Production Build

```bash
npx tsc --noEmit       # Type-check
bun run tauri build    # Build installer
```

Build artefacts are in `src-tauri/target/release/bundle/`:

| Platform | Formats |
|----------|---------|
| Linux | `.deb`, `.AppImage`, `.rpm` |
| macOS | `.dmg` |
| Windows | `.msi`, `.exe` (NSIS) |

---


## Tech Stack

<div align="center">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-v2-0F1724?style=for-the-badge&logo=tauri&logoColor=white" />
  <img alt="Rust" src="https://img.shields.io/badge/Rust-stable-DE8C33?style=for-the-badge&logo=rust&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-4.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img alt="Zustand" src="https://img.shields.io/badge/Zustand-state-111827?style=for-the-badge&logo=zustand&logoColor=white" />
  <img alt="React Router" src="https://img.shields.io/badge/React_Router-v7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img alt="Bun" src="https://img.shields.io/badge/Bun-%3E%3D1.0-000000?style=for-the-badge&logo=bun&logoColor=white" />
  <br/>
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-database-003B57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img alt="whisper.cpp" src="https://img.shields.io/badge/whisper.cpp-transcription-7C3AED?style=for-the-badge" />
  <img alt="Ollama" src="https://img.shields.io/badge/Ollama-local_LLM-0EA5A4?style=for-the-badge" />
  <img alt="React Flow" src="https://img.shields.io/badge/React_Flow-diagram-00C2A8?style=for-the-badge&logo=reactflow" />
  <img alt="yt-dlp" src="https://img.shields.io/badge/yt--dlp-downloader-FF6B6B?style=for-the-badge" />
  <img alt="ffmpeg" src="https://img.shields.io/badge/ffmpeg-media-232323?style=for-the-badge" />
</div>

---

## Data & Privacy

All user data — audio files, transcripts, notes, quizzes, flashcards — lives in SQLite in the platform app data directory:

| Platform | Path |
|----------|------|
| Linux | `~/.local/share/com.knowte.app/` |
| macOS | `~/Library/Application Support/com.knowte.app/` |
| Windows | `%APPDATA%\com.knowte.app\` |

The **only** optional external network call is to [Semantic Scholar](https://www.semanticscholar.org/product/api) for related paper search (disable in Settings → Research).

---

## License

GPL 3.0 License — see [LICENSE](docs/LICENSE) for details.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.
