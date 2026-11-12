<!-- VIBE:BEGIN -->
> [!IMPORTANT]
> This project is connected to AI Studio. Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on AI Studio's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to AI Studio and show up in
> the editor, so keep the branch in a working state.
<!-- VIBE:END -->

<!-- SHOWCASE:BEGIN -->
## This project (for any AI assistant)

**Full instructions are in `CLAUDE.md`. Follow them whichever AI tool you are** (Claude, Cursor, Codex, Copilot, Gemini…).
This download has two parts: the **video system** (`video-system/`, turns raw footage into finished branded videos; start with
`video-system/START-HERE.md`) and the **showcase page** (`public/showcase/`, rebrand it and add their videos).

The site is a plain HTML/CSS/JS showcase in `public/showcase/` (no React, no build step). `src/routes/index.tsx`
redirects `/` to `/showcase/index.html`. Rebrand in `public/showcase/brand.js`, edit content in `public/showcase/data.js`, add videos with `scripts/add_video.py` (see CLAUDE.md); keep each media file under 25 MB.
Only add videos the owner has the rights to: no client recordings or names without their OK, and no one else's footage or music.
<!-- SHOWCASE:END -->
