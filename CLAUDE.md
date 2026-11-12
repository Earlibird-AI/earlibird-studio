# Instructions for Claude (or any AI assistant): make this video showcase someone's own

This folder is a video styles showcase: a static website listing video **formats** (with example videos), brand **skins** (live previews) and **effects** (two reels with jump-to timestamps). It was built by Earlibird. The person who downloaded it wants their own version: rebranded for their business, with the formats they want and their own videos.

The whole site is `public/showcase/`: plain HTML, CSS and JavaScript, no build step. Everything else is a GoHighLevel AI Studio project template (`src/`, `package.json` and so on). It only matters if they host on AI Studio, so leave it alone otherwise.

## Start by asking (one short round)

1. Business name, website and a one-line description of what they do.
2. Logo file (PNG or SVG) and main brand colour. The page background is near-black, so they need a light or white version of the logo. If they only have a dark one, offer to use their name as text instead.
3. Which formats to keep: all of them, or only some (run `python3 scripts/add_video.py --list`).
4. Their videos. Ask them to put the files in `my-videos/`. For each one, get a title, one sentence on what it is, and whether it should be a new card or replace an Earlibird example.
5. Should the page keep Earlibird's example videos where they haven't got their own? Default: yes, with a credit line.

## Rebrand checklist

- [ ] `public/showcase/brand.js`: every field (name, website, logo, icon, accent, page text, brief title, footer, skin kicker). Write in their voice and keep it short.
- [ ] Copy their logo into `public/showcase/media/brand/` and point `logo` and `icon` at it.
- [ ] `accent`: their brand colour, if it reads on near-black. If it's dark, use a lighter tint. Set `recolorSkins: true` to show the skins in their colour.
- [ ] `downloadUrl` and `repoUrl`: set to "" to hide the "Make your own" box, unless they want to share their own code.
- [ ] `driveKitUrl` points to Earlibird's Drive folder kit. Keep it if they want visitors to see it, set it to their own kit, or set it to "" to hide the line.
- [ ] If any Earlibird example videos remain, keep a credit in `footer`, for example "Some example videos by Earlibird (earlibird.ai)."
- [ ] `README.md`: replace the title and intro with theirs.
- [ ] Only if they use AI Studio: update the title and description in `src/routes/__root.tsx`.

## Formats and their videos

- Add a new card: `python3 scripts/add_video.py my-videos/file.mp4 --name "…" --line "…" --good "…" --bring "…" --has camera --use social`
- Use their video as a format's example: `python3 scripts/add_video.py my-videos/file.mp4 --replace <format-id>`
- Add a second example to a format: `python3 scripts/add_video.py my-videos/file.mp4 --extra-of <format-id> --label "…"`
- Remove a format: `python3 scripts/add_video.py --remove <format-id>`
- The scripts need Python 3. On Windows, run them with `python` or `py` instead of `python3`. If Python is missing, install it: Mac `xcode-select --install` or `brew install python`; Windows `winget install Python.Python.3.12`.
- The script needs ffmpeg. If it's missing, install it for them: `brew install ffmpeg` (Mac), `winget install ffmpeg` (Windows) or `sudo apt install ffmpeg` (Linux).
- Card text lives in `public/showcase/data.js`. After adding videos, edit `line`, `good`, `bring`, `length`, `has` and `use` there. Allowed `has`: camera, voice, screens, brief, audio. Allowed `use`: social, youtube, sales, teach. Rename the filter labels in the `has` and `use` maps at the bottom of the file.
- Format names and descriptions are free to rewrite. These styles are starting points, not fixed products.

## Skins and effects

- Skins (`data.js` → `skins`) are design tokens: colours, fonts, caption/headline/card modes. Remove the ones they don't want, or tweak colours and fonts. The preview footage (`media/skins/chris-*`) is Earlibird's. Keep it, or swap `chris-bg.mp4` for their own vertical clip. The "word behind the head" layer (`chris-fg.webm`) needs a cut-out matte, so delete that file if they swap footage: the previews still work without it.
- Effects (`data.js` → `effects`) are two Earlibird reels with timestamps. Keep them (with the credit) or delete the `effects` entries and the reel files. If you delete all of them, also remove the Effects section and its nav link from `index.html`.

## Rules

- Only add videos they own or have permission to use. Strip the audio (the default) unless they own the music and the voices. No client recordings or personal details without the client's OK.
- Keep every media file under 24 MB (the script compresses to fit). Shorter clips make a better showcase.
- Don't publish, push or make anything public without asking them first.

## Preview and publish

- Preview: `python3 scripts/serve.py`, then open http://localhost:4870/showcase/index.html (keep the terminal open).
- Publish: the `public/showcase/` folder is the whole site, so any static host works (Netlify drag-and-drop, Cloudflare Pages, GitHub Pages). For GoHighLevel AI Studio, follow `docs/ghl-ai-studio-setup.md`.

## In a Claude chat without a terminal

Edit `brand.js` and `data.js` directly and give the files back. For videos, ask them to run the `add_video.py` command themselves, or to supply already-small MP4s (under 24 MB) with a JPG poster of the same name.

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
my-videos/                   drop raw videos here (not uploaded to git)
scripts/add_video.py         compress + add/replace/remove videos
scripts/serve.py             local preview server
```
