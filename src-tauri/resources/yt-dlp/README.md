# Bundled yt-dlp

Place platform-specific yt-dlp binaries in these paths before creating release bundles:

- `src-tauri/resources/yt-dlp/linux/yt-dlp`
- `src-tauri/resources/yt-dlp/macos/yt-dlp`
- `src-tauri/resources/yt-dlp/windows/yt-dlp.exe`

Runtime resolution order in Cognote:

1. Installed yt-dlp in app data: `<app_data>/tools/yt-dlp/`
2. Bundled yt-dlp in the app's `resources/yt-dlp/<platform>/` directory
3. `yt-dlp` from system `PATH`

Unlike ffmpeg startup provisioning, yt-dlp is provisioned lazily when YouTube import is used.
