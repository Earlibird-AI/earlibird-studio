# Video system: start here

This folder turns your raw footage into finished, branded videos, with your AI assistant doing the work. You record, drop the file in a folder, and say **"edit [title]"**. Your AI:
- cuts out the silences, false starts and retakes
- adds word-by-word captions in your brand
- adds a title card and pop-up words
- adds an end card with your call to action
- makes 16:9 and 9:16 versions
- makes a thumbnail and caption files
- checks its own work

It works with any AI assistant that can run commands on your computer: the Claude desktop app (Code tab), Claude Code, Cursor, Codex, GitHub Copilot or Gemini CLI. The instructions it follows are in `CLAUDE.md` (and `AGENTS.md`) at the top of this download.

## 1. One-time setup (about 10 minutes)

Open this whole download folder in your AI and say:

> **Set up the video system for me.** Read CLAUDE.md and video-system/START-HERE.md.

Your AI will:
1. **Check Python and ffmpeg**, and install them if missing (it asks first; on a Mac it may need your password):
   - Mac: `brew install ffmpeg` (Homebrew from brew.sh)
   - Windows: `winget install ffmpeg`
2. **Run** `python3 video-system/tools/setup.py`. This creates a private Python environment and installs the transcription and caption tools. On Windows, use `python` instead of `python3`.
3. **Ask for your brand** and fill in `video-system/brand.json`: name, website, call to action, logo file, colours, and caption style (`pill`, `karaoke`, `box` or `upper`). A light logo works best on the dark end card.
4. **Ask where your folders are** and fill in `video-system/config.json`:
   - **Google Drive:** install Google Drive for desktop, then point `to_edit` and `finished` at your Drive folders. Mac example: `/Users/you/Library/CloudStorage/GoogleDrive-you@email.com/My Drive/My video system/1. To edit`. Windows example: `G:\My Drive\My video system\1. To edit`.
   - **No Drive:** keep the defaults (`video-system/workspace/1. To edit` and `2. Finished`).
5. **Run** `python3 video-system/tools/vs.py check`. Everything should show ✓.

## 2. Every video

1. **Record.** Landscape or vertical, camera at eye level, light in front of you, a quiet room. Mistakes are fine: just say the line again.
2. **Drop it in.** Make a folder in **1. To edit** named `YYYY-MM-DD Title`, for example `2026-11-20 Why speed matters`, and put the video in it. Several clips are joined in name order.
3. **Optional notes.** Copy `video-system/templates/video-notes.txt` into the folder as `notes.txt` and fill it in: format, versions, call to action, must-include, what to cut.
4. **Say "edit Why speed matters".**
5. **Review** the result in **2. Finished/2026-11-20 Why speed matters/**:
   - `Why speed matters 16x9.mp4` and/or `9x16.mp4`
   - `… thumbnail.jpg`
   - `.srt` caption files for YouTube, Instagram or LinkedIn
6. **Ask for changes in plain words**, for example "cut the bit about pricing", "captions higher", "make 'two minutes' pop up", or "use karaoke captions". Your AI edits `edit.json` in the video's folder and renders again.

Raw footage is never changed. The working files live in the video folder's `_work/` subfolder.

## 3. Formats, skins and effects

- **Formats** are the shape of the video (Clean, Explainer, Hype Reel, Sizzle Reel, Napkin Sketch…). The talking-head formats come straight out of this tool. The designed formats build scenes with a free HTML-to-video renderer. Recipes for all 13 are in `video-system/FORMATS.md`.
- **Skins** are the look: your `brand.json` colours and fonts plus a caption style. The showcase page shows seven to borrow from.
- **Effects** are the moves inside a video. The showcase's effects reels show 114 of them, so name the ones you like in your notes.

## 4. Grow your own styles

1. Put videos you admire in a **Reference inbox** folder (links, screenshots, screen recordings).
2. Ask your AI to "study the references and describe what makes them work".
3. Write a **style card** with `video-system/templates/style-card.md`. Use your own words, your brand and your own name for it.
4. Ask for "a 20-second test of my [style] style on my latest video". Keep what works, then add it to `video-system/STYLE-MENU.md`.

References are for learning only. Never publish anyone else's footage, music, graphics or exact look.

## 5. If something goes wrong

| What happened | What to do |
|---|---|
| `ffmpeg missing` | Mac `brew install ffmpeg` · Windows `winget install ffmpeg`, then reopen the terminal |
| `faster-whisper missing` or the install fails | Run setup again. If it still fails, install Python 3.12 from python.org, delete `video-system/.venv`, and run setup with that Python |
| The first transcription is slow | It downloads the speech model once (about 250 MB for `small`). For speed, set `"whisper_model": "base"` in config.json |
| Words spelled wrong (names, brand words) | Add them to `fix_words` in the video's `edit.json`, e.g. `{"earlybird": "Earlibird"}` |
| Captions cover a face or a logo | Set `caption_y` in `edit.json` (0 top, 1 bottom), e.g. `0.8` |
| The title card covers a face | Set `text_y` in `edit.json`, e.g. `0.1` |
| Want music | Put a track you own in the video folder and set `"music": "track.mp3"` in `edit.json` |
