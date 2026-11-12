# Format recipes

How to make each format in the showcase with this toolkit. Two tools do the work:

- **`vs.py`** (this folder) handles everything on real footage: cuts, captions, title and pop-up cards, cutaways, end card, 16:9 and 9:16 versions, thumbnail. See `START-HERE.md`.
- **HyperFrames** builds designed scenes (drawings, cards, mock screens, motion graphics) from HTML and renders them to MP4. It's free and open source (Apache-2.0) and needs Node.js (nodejs.org). Run `npx hyperframes init my-scene`, write the scene as HTML with CSS/GSAP animation, preview with `npx hyperframes preview`, then render with `npx hyperframes render`. `npx hyperframes docs` has the full guide. Any HTML-to-video tool works the same way if you prefer another.

**Two ways to combine them:**
- **Footage first** (talking-head formats): `vs.py edit`, then add designed scenes as **cutaways** in `edit.json` (`{"file": "scene.mp4", "t": 42.0}`). They show full-screen while the voice continues. Add `"fit": "contain"` to show a 16:9 scene uncropped in the 9:16 version.
- **Scenes first** (faceless formats): build the whole video in HyperFrames with the voiceover as its audio track, render it, put the MP4 in a `1. To edit` folder, then run `vs.py edit`. It adds captions, title and end card (set `"title_card": false` if the scenes already have one).

Every scene uses your `brand.json` colours and fonts. Clean and clear beats on-brand: use the accent colour for one key word, the logo and the end card, and keep everything else neutral. Before you show anything, check it: `vs.py sheet` for footage, `npx hyperframes snapshot` for scenes.

---

## Talking-head formats (footage first)

### Clean (16:9, any length): the best first video
- **Bring:** a recording of you talking to camera.
- **Make:** `vs.py edit "[title]"`. Remove retakes in `edit.json`, set `highlight_words` (3–6 key words), `pop_words` for the one or two numbers that matter, and the thumbnail text. Render, check the sheet.
- **Done when:** no false starts, captions readable on a phone, end card shows your call to action.

### Explainer (16:9, 5–20 min)
- **Bring:** you on camera, talking through a topic in sections.
- **Make:** Clean as above, plus:
  - a **chapter card** at each new section (a `pop_words` entry with the section name and `"dur": 2`)
  - **one diagram or stat scene per section** as a HyperFrames cutaway (3–6 s): a simple chart that draws itself, a 3-step flow, a big number that counts up
- **Tip:** aim for a visual change every 20–40 s; keep scenes short and let the speaker carry the video.

### Case Study (16:9, 2–4 min)
- **Bring:** a customer interview on camera, their real numbers and logo (with their written OK).
- **Make:** footage first. HyperFrames cutaways for:
  1. a **results card** whose numbers count up (e.g. "3 hours saved a day")
  2. **quote cards**: their best line in big type with their name and business
  3. a **logo sign-off**

  Put the strongest result in the first 10 seconds.
- **Rule:** only real numbers the customer has approved.

### Paper Cards (16:9, 5–20 min)
- **Bring:** you on camera.
- **Make:** footage first. On each data point or punchline, a clean light "paper" page slides over you as a cutaway (4–6 s): a headline with one highlighted phrase, plus one visual (a line chart that draws, a number that ticks, a two-column before/after, a checklist that ticks off). Keep pages white or off-white with hairline borders and soft shadows. Your accent colour is only for the highlighted phrase.
- **Tip:** one idea per card; the card lands on the exact phrase (use the transcript times).

### Hype Reel (9:16, 30–90 s)
- **Bring:** a clip of you talking (any orientation).
- **Make:** `versions: ["9:16"]`, `caption_style: "upper"` or `"karaoke"`. Remove every pause and filler (lower `max_pause` in `config.json` to 0.35), add `pop_words` every few seconds, and add a short cutaway (an image, a screenshot or a 2 s scene) every 3–5 s so something changes on screen constantly. Open on the hook: the most surprising line first, even if you said it later.
- **Tip:** a 1.5 s pop word with the key number is the cheapest way to add energy.

---

## Screen formats

### Screen Demo (16:9, 1–15 min)
- **Bring:** a screen recording, plus an optional webcam recording.
- **Make:**
  1. Run `vs.py edit` on the screen recording to cut the dead time and add captions.
  2. For zooms and highlights, build short HyperFrames cutaways from screenshots of the key moments: zoom into the region, draw a soft highlight box, add a callout label.
  3. For a webcam bubble, ask your AI to overlay the webcam recording in a corner circle with ffmpeg before running `vs.py`.
- **Tip:** zoom whenever the text on screen would be too small to read on a phone.

### Guided Tour (16:9, 30 s–3 min, faceless)
- **Bring:** screenshots (or a website address to capture with `npx hyperframes capture`), the steps, and optionally a voiceover.
- **Make:** scenes first. One HyperFrames scene per step: the screenshot in a clean browser window, a slow zoom to the area that matters, a highlight box, a click spot and a caption that types on ("Step 2 · Connect your calendar"). Render with your voiceover or a music track you own, then run `vs.py` for the end card.

### AI Call Replay (16:9, length of the call)
- **Bring:** the call recording (everyone's OK) and its transcript.
- **Make:** scenes first.
  1. Build one HyperFrames scene: two rounded glass "call pills" (the AI agent with a small "AI" badge, the caller with their initials), each with a waveform that moves only while that person is speaking.
  2. Add a title line ("AI receptionist takes a booking") and a running call clock.
  3. Drive who's speaking from the transcript times (run `vs.py transcribe` on the audio first to get them).
  4. Render with the call audio, then `vs.py edit` adds the speaker captions and end card.
- **Rule:** remove or bleep names, addresses and phone numbers unless the people have agreed.

---

## Faceless and designed formats (scenes first)

### Napkin Sketch (16:9, 2–10 min)
- **Bring:** your voiceover and its script.
- **Make:**
  1. Run `vs.py transcribe` on the voiceover to get word times.
  2. In HyperFrames, lay out one big off-white board with a hand-drawn look (rough.js draws sketchy shapes; a handwriting font like Caveat or Kalam).
  3. Each drawing appears on the word that names it.
  4. The camera pans from scene to scene, then pulls back at the end to show the whole board, then a title card.
- **Tip:** simple stick figures, arrows and labelled boxes; one idea per scene; colour only for meaning.

### Marker Paper (16:9, 1–3 min)
- **Bring:** a plain-speak script (one short line per drawing), then your voiceover.
- **Make:** like Napkin Sketch, but one sheet of paper filled left to right and top to bottom with bold black marker drawings, each with a short handwritten label, and a yellow highlighter swipe on the key word. Finish with a pull-back to the whole sheet.
- **Script tip:** "[Topic] for busy owners", short sentences, one idea per line.

### Animated Sketch (16:9, 1–10 min)
- **Bring:** your voiceover, its script and a music track you own.
- **Make:** HyperFrames scenes with simple coloured characters that move (walk in, wave, react), a world that keeps gently moving (clouds, a sun, a passing van), and a small sound effect on each action (use sounds you have the rights to). Mix the music under the voice at about −20 dB.
- **Tip:** story first: a character with a problem, the moment it gets solved, the result.

### Why It Worked (9:16, 30–60 s)
- **Bring:** a ~100-word script, a hook idea, your freebie and your voiceover.
- **Make:**
  1. A scroll-stopping first 2 seconds: a striking visual or a social post as a card.
  2. Then the script one or two words at a time, big, centred, on a dark background.
  3. Proof shots as cards, and a "comment [KEYWORD] for the [freebie]" ending.
- **Workflow:** scenes first in HyperFrames, `versions: ["9:16"]`.

### Sizzle Reel (16:9 or 9:16, 20–40 s)
- **Bring:** a short brief (product, 3–5 messages, call to action) and a music track you own. No footage needed.
- **Make:** HyperFrames, scene changes on the beat (`npx hyperframes beats` finds them):
  1. two-line kinetic headlines
  2. mock product screens (a chat thread, a form being filled, a notification arriving) with a moving cursor
  3. a "Meet [product]" logo reveal
  4. a quick feature list
  5. a call-to-action button the cursor clicks

  Then `vs.py edit` with `"captions": false` for the end card, or end on your own CTA scene.

---

## Adding your own format

1. Write a style card (`templates/style-card.md`) for it.
2. Make a 20-second test with the recipes above.
3. When it works, add a recipe section here and a line to `STYLE-MENU.md`.

To show it on your showcase page, run `python3 scripts/add_video.py <example.mp4> --name "…" --line "…"`.
