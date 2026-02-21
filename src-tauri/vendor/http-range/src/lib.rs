//! Minimal HTTP Range header implementation for Tauri asset protocol

use std::fmt;

/// Represents a byte range in an HTTP Range header
#[derive(Debug, Clone, PartialEq)]
pub struct ByteRange {
    /// Start of the range (inclusive)
    pub start: u64,
    /// End of the range (inclusive)
    pub end: u64,
    /// Length of the range
    pub length: u64,
}

impl fmt::Display for ByteRange {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "bytes={}-{}", self.start, self.end)
    }
}

/// HTTP Range header parser
/// Parses "bytes=start-end" format
#[derive(Debug, Clone, PartialEq)]
pub struct HttpRange {
    /// The parsed byte ranges
    pub ranges: Vec<ByteRange>,
}

impl HttpRange {
    /// Parse an HTTP Range header
    /// 
    /// # Arguments
    /// * `range` - The range header value (e.g., "bytes=0-100")
    /// * `size` - The total size of the content
    /// 
    /// # Returns
    /// * `Ok(HttpRange)` if the header is valid
    /// * `Err(())` if the header is invalid
    pub fn parse(range: &str, size: u64) -> Result<HttpRange, ()> {
        HttpRange::new(range, size).ok_or(())
    }

    /// Create a new HttpRange
    /// 
    /// # Arguments
    /// * `range` - The range header value (e.g., "bytes=0-100")
    /// * `size` - The total size of the content
    /// 
    /// # Returns
    /// * `Some(HttpRange)` if the header is valid
    /// * `None` if the header is invalid
    pub fn new(range: &str, size: u64) -> Option<HttpRange> {
        let range = range.trim();
        
        if !range.starts_with("bytes=") {
            return None;
        }
        
        let range_spec = &range[6..]; // Skip "bytes="
        
        if range_spec.is_empty() {
            return None;
        }
        
        // Handle multiple ranges (though typically only one is used)
        let mut ranges = Vec::new();
        
        for part in range_spec.split(',') {
            let part = part.trim();
            if part.is_empty() {
                continue;
            }
            
            // Check for suffix range (last N bytes)
            if part.starts_with('-') {
                let num = part[1..].parse::<u64>().ok()?;
                let start = size.saturating_sub(num);
                let length = num;
                ranges.push(ByteRange {
                    start,
                    end: size.saturating_sub(1),
                    length,
                });
                continue;
            }
            
            // Parse start-end format
            if let Some(pos) = part.find('-') {
                let start_str = &part[..pos];
                let end_str = &part[pos + 1..];
                
                let start: u64 = start_str.parse().ok()?;
                
                // "start-" means from start to end
                if end_str.is_empty() {
                    if start >= size {
                        continue;
                    }
                    let length = size - start;
                    ranges.push(ByteRange {
                        start,
                        end: size.saturating_sub(1),
                        length,
                    });
                    continue;
                }
                
                let end: u64 = end_str.parse().ok()?;
                
                if start > end || start >= size {
                    continue;
                }
                
                let end = end.min(size - 1);
                let length = end - start + 1;
                
                ranges.push(ByteRange { start, end, length });
            }
        }
        
        if ranges.is_empty() {
            None
        } else {
            Some(HttpRange { ranges })
        }
    }

    /// Get an iterator over the byte ranges
    pub fn iter(&self) -> std::slice::Iter<'_, ByteRange> {
        self.ranges.iter()
    }
}

/// Parse a range header string and return a result
/// 
/// This is a convenience function that calls `HttpRange::new`
pub fn http_range(range: &str, size: u64) -> Option<HttpRange> {
    HttpRange::new(range, size)
}

/// Calculate the content length for a range
pub fn range_content_length(range: &ByteRange) -> u64 {
    range.end.saturating_sub(range.start).saturating_add(1)
}

/// Format a Content-Range header
pub fn format_content_range(range: &ByteRange, total: u64) -> String {
    format!("bytes {}-{}/{}", range.start, range.end, total)
}
