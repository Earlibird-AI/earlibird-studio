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
## This project

The site is a plain HTML/CSS/JS showcase in `public/showcase/` (no React, no build step). `src/routes/index.tsx`
redirects `/` to `/showcase/index.html`. Rebrand in `public/showcase/brand.js`, edit content in `public/showcase/data.js`, add videos with `scripts/add_video.py` (see CLAUDE.md); keep each media file under 25 MB.
Only Earlibird-made examples belong here: no client recordings or names, and no third-party reference material.
<!-- SHOWCASE:END -->
