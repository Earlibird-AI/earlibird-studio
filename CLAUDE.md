# Instructions for Claude (or any AI assistant)

This download, made by Earlibird, has two parts. The person who downloaded it wants both working for their own business.

1. **The video system** (`video-system/`): turns their raw footage into finished, branded videos. **Part A** below.
2. **The showcase page** (`public/showcase/`): a website of video formats, skins and effects, which they can rebrand and fill with their own videos. **Part B** below.

If they don't say which they want, ask. Most start with Part A setup, then Part B. Everything else (`src/`, `package.json` and so on) is a GoHighLevel AI Studio template that only matters if they host the page on AI Studio, so leave it alone otherwise.

# Part A: the video system

Read `video-system/START-HERE.md` (the person's guide) and `video-system/FORMATS.md` (how to make each format). The tool is `video-system/tools/vs.py`. Run commands from this folder; on Windows use `python` or `py` instead of `python3`.

## A1. First-time setup

1. Check `ffmpeg` and Python 3.9+ are installed, and install what's missing after asking. Mac: `brew install ffmpeg`, and Homebrew from brew.sh if needed. Windows: `winget install ffmpeg`.
2. Run `python3 video-system/tools/setup.py`. If the package install fails, the usual cause is a Python that's too new: install Python 3.12 from python.org, delete `video-system/.venv`, and run setup with it.
3. Ask for their brand and fill in `video-system/brand.json`:
   - name, website, call to action
   - logo (copy it into `video-system/` and point to it; a light logo for the dark end card)
   - colours: accent, background, text, dim
   - caption style: `pill`, `karaoke`, `box` or `upper`
   - fonts (optional: copy their .ttf/.otf files into `video-system/fonts/`)
4. Ask where their folders are and fill in `video-system/config.json`. If they use Google Drive, find the Drive for desktop path for their "1. To edit" and "2. Finished" folders:
   - Mac: `~/Library/CloudStorage/GoogleDrive-*/My Drive/...`
   - Windows: usually `G:\My Drive\...`

   Otherwise keep the local `workspace/` defaults.
5. Run `python3 video-system/tools/vs.py check` until everything is ✓.

## A2. When they say "edit [title]"

1. `python3 video-system/tools/vs.py transcribe "[title]"`, then read `_work/transcript.txt` in that video's folder and its `notes.txt` if there is one.
2. `python3 video-system/tools/vs.py plan "[title]"` writes `edit.json`. Then improve it yourself (times are seconds in the raw footage, from the transcript):
   - `remove`: false starts, retakes (keep the LAST good take of a repeated line), rambles, and anything notes.txt says to cut. Use `[start, end, "why"]`.
   - `title` and `thumbnail.text`: short and punchy (3–6 words). Set `thumbnail.time` to a moment with a good expression.
   - `highlight_words`: 3–8 key words. `pop_words`: 1–4 key numbers or phrases, as `{"t": seconds, "text": "21x"}`.
   - `fix_words`: names and brand words the transcript got wrong.
   - `versions` (`16:9`, `9:16`), `cta`, `caption_style` if notes.txt asks.
   - For designed formats, build scenes as `FORMATS.md` describes and add them as `cutaways`.
3. `python3 video-system/tools/vs.py render "[title]"`.
4. `python3 video-system/tools/vs.py sheet "[title]"` and **look at the contact sheet images**. Check:
   - captions are readable and don't cover a face or logo (move them with `caption_y`)
   - title cards are clear of the face (`text_y`)
   - cuts aren't jarring
   - the end card is right

   Fix `edit.json` and render again until it's good.
5. Tell them where the files are (16:9/9:16 MP4s, thumbnail, .srt caption files), what you cut, and anything you weren't sure about. Change things when they ask in plain words.

## A3. Rules for videos

- Never modify the raw footage. Only use music, images and footage they own or have rights to (`music` in edit.json only with their own track).
- No customer's private details without their OK.
- Clean and clear beats on-brand: the accent colour is for key words, the logo and the end card only.
- Never publish or post anything for them without asking.
- For a style they admire, help them write a style card in their own words (`video-system/templates/style-card.md`). Never copy someone's footage, music, graphics or exact look.

# Part B: the showcase page

The whole site is `public/showcase/`: plain HTML, CSS and JavaScript, no build step.

## B1. Start by asking (one short round)

1. Business name, website and a one-line description of what they do.
2. Logo file (PNG or SVG) and main brand colour. The page background is near-black, so they need a light or white version of the logo. If they only have a dark one, offer to use their name as text instead.
3. Which formats to keep: all of them, or only some (run `python3 scripts/add_video.py --list`).
4. Their videos. Ask them to put the files in `my-videos/`. For each one, get a title, one sentence on what it is, and whether it should be a new card or replace an Earlibird example.
5. Should the page keep Earlibird's example videos where they haven't got their own? Default: yes, with a credit line.

## B2. Rebrand checklist

- [ ] `public/showcase/brand.js`: every field (name, website, logo, icon, accent, page text, brief title, footer, skin kicker). Write in their voice and keep it short.
- [ ] Copy their logo into `public/showcase/media/brand/` and point `logo` and `icon` at it.
- [ ] `accent`: their brand colour, if it reads on near-black. If it's dark, use a lighter tint. Set `recolorSkins: true` to show the skins in their colour.
- [ ] `downloadUrl` and `repoUrl`: set to "" to hide the "Make your own" box, unless they want to share their own code.
- [ ] `driveKitUrl` points to Earlibird's Drive folder kit. Keep it if they want visitors to see it, set it to their own kit, or set it to "" to hide the line.
- [ ] If any Earlibird example videos remain, keep a credit in `footer`, for example "Some example videos by Earlibird (earlibird.ai)."
- [ ] `README.md`: replace the title and intro with theirs.
- [ ] Only if they use AI Studio: update the title and description in `src/routes/__root.tsx`.

## B3. Formats and their videos

- Add a new card: `python3 scripts/add_video.py my-videos/file.mp4 --name "…" --line "…" --good "…" --bring "…" --has camera --use social`
- Use their video as a format's example: `python3 scripts/add_video.py my-videos/file.mp4 --replace <format-id>`
- Add a second example to a format: `python3 scripts/add_video.py my-videos/file.mp4 --extra-of <format-id> --label "…"`
- Remove a format: `python3 scripts/add_video.py --remove <format-id>`
- The scripts need Python 3. On Windows, run them with `python` or `py` instead of `python3`. If Python is missing, install it: Mac `xcode-select --install` or `brew install python`; Windows `winget install Python.Python.3.12`.
- The script needs ffmpeg. If it's missing, install it for them: `brew install ffmpeg` (Mac), `winget install ffmpeg` (Windows) or `sudo apt install ffmpeg` (Linux).
- Card text lives in `public/showcase/data.js`. After adding videos, edit `line`, `good`, `bring`, `length`, `has` and `use` there. Allowed `has`: camera, voice, screens, brief, audio. Allowed `use`: social, youtube, sales, teach. Rename the filter labels in the `has` and `use` maps at the bottom of the file.
- Format names and descriptions are free to rewrite. These styles are starting points, not fixed products.

## B4. Skins and effects

- Skins (`data.js` → `skins`) are design tokens: colours, fonts, caption/headline/card modes. Remove the ones they don't want, or tweak colours and fonts. The preview footage (`media/skins/chris-*`) is Earlibird's. Keep it, or swap `chris-bg.mp4` for their own vertical clip. The "word behind the head" layer (`chris-fg.webm`) needs a cut-out matte, so delete that file if they swap footage: the previews still work without it.
- Effects (`data.js` → `effects`) are two Earlibird reels with timestamps. Keep them (with the credit) or delete the `effects` entries and the reel files. If you delete all of them, also remove the Effects section and its nav link from `index.html`.

## B5. Rules for the page

- Only add videos they own or have permission to use. Strip the audio (the default) unless they own the music and the voices. No client recordings or personal details without the client's OK.
- Keep every media file under 24 MB (the script compresses to fit). Shorter clips make a better showcase.
- Don't publish, push or make anything public without asking them first.

## B6. Preview and publish

- Preview: `python3 scripts/serve.py`, then open http://localhost:4870/showcase/index.html (keep the terminal open).
- Publish: the `public/showcase/` folder is the whole site, so any static host works (Netlify drag-and-drop, Cloudflare Pages, GitHub Pages). For GoHighLevel AI Studio, follow `docs/ghl-ai-studio-setup.md`.

## Without a terminal

The video system (Part A) needs an AI that can run commands on their computer: the Claude desktop app (Code tab), Claude Code, Cursor, Codex, GitHub Copilot or Gemini CLI. If they're in a chat without a terminal, tell them so and help them install one of those (it takes a few minutes). Meanwhile you can still plan videos, write scripts and edit `brand.js` / `data.js` and give the files back.

## File map

```
public/showcase/index.html   page structure (sections, nav)
public/showcase/brand.js     business name, logo, colours, page text
public/showcase/data.js      formats, skins, effects (content)
public/showcase/app.js       format grid, filters, shortlist, brief, effects
public/showcase/skins.js     live skin previews
public/showcase/media.js     video loading (works on hosts without byte-range support)
public/showcase/styles.css   styling
public/showcase/media/       videos (.mp4), posters (.jpg), brand/, skins/
my-videos/                   drop raw videos here for the showcase page (not uploaded to git)
video-system/                the video system: START-HERE.md, FORMATS.md, STYLE-MENU.md, brand.json, config.json, tools/, templates/
scripts/add_video.py         compress + add/replace/remove videos
scripts/serve.py             local preview server
```
