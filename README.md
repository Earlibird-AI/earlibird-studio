# Earlibird Video Styles

A browsable showcase of Earlibird's video **formats**, **brand skins** and **effects**. Use it to pick a starting point for your own video, then copy a ready-to-fill brief.

Every example was made by Earlibird. Sample numbers, names and businesses in the examples are illustrative.

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
  data.js      formats, skins (design tokens) and effect timestamps: edit this to change content
  app.js       format grid, filters, shortlist, brief copy, effects reels
  skins.js     live skin previews
  media/       web-compressed example videos (.mp4) and posters (.jpg)
```

Your saved formats, chosen skin and font picks are stored in your browser only.

The rest of the repo is the GoHighLevel AI Studio project template (TanStack Start). Its home route (`src/routes/index.tsx`) redirects to `/showcase/index.html`, which is how the site is served on the AI Studio subdomain. See [docs/ghl-ai-studio-setup.md](docs/ghl-ai-studio-setup.md).

## Adding or changing an example

1. Add a small web version of the video to `public/showcase/media/` as `<id>.mp4` (H.264, 720p, no more than about 10 MB, and always under 25 MB) plus a `<id>.jpg` poster.
2. Add or edit its entry in `public/showcase/data.js`.
3. Commit to `main`. AI Studio pulls the change and rebuilds the preview. Publish again to update the live subdomain.
