# Earlibird Video Styles

A browsable showcase of Earlibird's video **formats**, **brand skins** and **effects**. Use it to pick a starting point for your own video, then copy a ready-to-fill brief.

Every example was made by Earlibird. Sample numbers, names and businesses in the examples are illustrative.

## Make it yours with Claude

1. Download this repo (**Code → Download ZIP** on GitHub) and unzip it.
2. Put your own videos in the `my-videos/` folder.
3. Open the folder in [Claude Code](https://claude.com/claude-code), or upload the zip to a Claude chat, and paste:

```
Read CLAUDE.md in this folder, then make this video showcase mine.
My business: [name, website, what we do]
My brand: [logo file, main colour]
Keep: [all formats / just the ones I list]
My videos are in the my-videos folder: add them to the page.
```

Claude rebrands the page (`public/showcase/brand.js`), keeps the formats, skins and effects you want, and adds your videos with `scripts/add_video.py`. It compresses each video for the web, makes a poster and adds the card. `CLAUDE.md` has the full checklist.

Want the whole workflow, from ideas to finished videos? Copy the [AI video system folder kit](https://drive.google.com/drive/folders/1b8i3hR3aMaPbKizJHUO4G5-n1r9eQ1oD) on Google Drive: folders, a step-by-step guide, Claude instructions and templates.

Earlibird's example videos, logo and footage are included as references. Credit Earlibird if you keep them on a page you publish, or swap in your own.

## Look at it

- **Live site:** the AI Studio subdomain this repo is published to.
- **On your computer:** clone or download this repo, then run:

```bash
python3 scripts/serve.py
```

Open <http://localhost:4870/showcase/index.html>. Keep the terminal open while you browse; press Ctrl+C to stop.

You can also double-click `public/showcase/index.html`. It works, but video seeking is smoother through the small server above.

## What's inside

### Formats: the shape of the video

| Format | Shape | Length | You bring | Good for |
|---|---|---|---|---|
| Explainer | 16:9 | 5–20 min | You on camera | YouTube long-form, teaching, opinion pieces |
| Clean | 16:9 | Any | You on camera | Quick updates, podcasts, talking-head posts |
| Case Study | 16:9 | 2–4 min | A client interview, their numbers and logo | Sales assets, testimonials, website proof |
| Paper Cards | 16:9 | 5–20 min | You on camera | YouTube with data and punchlines |
| Napkin Sketch | 16:9 | 2–10 min | A voiceover and script | Concept videos, "how X works" |
| Marker Paper | 16:9 | 1–3 min | A plain-speak script, then a voiceover | "[Topic] for busy owners" explainers |
| Animated Sketch | 16:9 | 1–10 min | A voiceover, script and music track | Story-led concept videos with energy |
| Screen Demo | 16:9 | 1–15 min | A screen recording (+ webcam) | Tutorials, onboarding, walkthroughs |
| Hype Reel | 9:16 | 30–90 s | A clip of you talking | Reels, TikTok, Shorts |
| Why It Worked | 9:16 | 30–60 s | A ~100-word script, a freebie, a voiceover | Explaining a result, with a lead magnet |
| Sizzle Reel | 16:9 | 20–40 s | A short brief and a music track | Launches, features, ads, website heroes |
| Guided Tour | 16:9 | 30 s–3 min | Screenshots (or a URL) and the steps | Onboarding, how-tos, faceless walkthroughs |
| AI Call Replay | 16:9 | Length of the call | A call recording and transcript | Showing an AI receptionist at work |

### Skins: the look you put on any format

Classic, Modern, Editorial, Glass, Layered, Product and Tech. On the site, each skin plays on the same six seconds of footage, so you can compare them like for like, swap fonts, and add your pick to your brief.

### Effects: the building blocks

Two reels with every effect labelled: 37 vertical (9:16) and 77 landscape (16:9). Search the list and tap an effect to jump to it.

## How the site works

The showcase is plain HTML, CSS and JavaScript with no build step:

```
public/showcase/
  index.html   page structure
  styles.css   all styling
  brand.js     business name, logo, colours and page text: edit this to rebrand
  data.js      formats, skins (design tokens) and effect timestamps: edit this to change content
  app.js       format grid, filters, shortlist, brief copy, effects reels
  skins.js     live skin previews
  media.js     video loading that also works on hosts without byte-range support (e.g. AI Studio)
  media/       web-compressed example videos (.mp4) and posters (.jpg)
```

Your saved formats, chosen skin and font picks are stored in your browser only.

The rest of the repo is the GoHighLevel AI Studio project template (TanStack Start). Its home route (`src/routes/index.tsx`) redirects to `/showcase/index.html`, which is how the site is served on the AI Studio subdomain. See [docs/ghl-ai-studio-setup.md](docs/ghl-ai-studio-setup.md).

## Adding or changing an example

```bash
python3 scripts/add_video.py my-videos/promo.mp4 --name "Spring promo" --line "What it is, in one sentence."
python3 scripts/add_video.py my-videos/tour.mp4 --replace guided-tour     # your video as that format's example
python3 scripts/add_video.py --remove why-it-worked                       # take a format off the page
python3 scripts/add_video.py --list
```

The script needs [ffmpeg](https://ffmpeg.org) (Mac: `brew install ffmpeg`). It keeps every file under the 25 MB hosting limit and strips audio unless you pass `--sound`. Card text is in `public/showcase/data.js`.

Hosted on AI Studio? Commit to `main`, let AI Studio pull the change, then publish again to update the live subdomain.
