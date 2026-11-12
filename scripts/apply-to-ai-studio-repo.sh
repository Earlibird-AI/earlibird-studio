#!/bin/bash
# Copies this showcase into a repo created by GoHighLevel AI Studio's Git Sync (TanStack Start template),
# without touching its package.json, lockfile or config. Usage: bash scripts/apply-to-ai-studio-repo.sh <clone>
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DST="${1:?usage: apply-to-ai-studio-repo.sh <path to the AI Studio repo clone>}"
[ -f "$DST/package.json" ] && [ -d "$DST/src/routes" ] || { echo "Not an AI Studio TanStack project: $DST"; exit 1; }
mkdir -p "$DST/public" "$DST/docs" "$DST/scripts" "$DST/my-videos"
rsync -a --delete --exclude .DS_Store "$SRC/public/showcase/" "$DST/public/showcase/"
cp "$SRC/src/routes/index.tsx" "$DST/src/routes/index.tsx"
cp "$SRC/README.md" "$SRC/CLAUDE.md" "$DST/"
cp "$SRC/my-videos/README.md" "$DST/my-videos/"
cp "$SRC/docs/ghl-ai-studio-setup.md" "$DST/docs/"
cp "$SRC/scripts/serve.py" "$SRC/scripts/add_video.py" "$SRC/scripts/apply-to-ai-studio-repo.sh" "$DST/scripts/"
grep -q '^my-videos/\*' "$DST/.gitignore" 2>/dev/null || printf '\nmy-videos/*\n!my-videos/README.md\n' >> "$DST/.gitignore"
python3 - "$DST/src/routes/__root.tsx" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
for a, b in [('"AI Studio App"', '"Earlibird Video Styles"'),
             ('"AI Studio Generated Project"', '"Browse Earlibird\'s video formats, brand skins and effects."'),
             ('content: "AI Studio" }', 'content: "Earlibird AI" }')]:
    s = s.replace(a, b)
open(p, "w").write(s)
PY
if ! grep -q "public/showcase" "$DST/AGENTS.md" 2>/dev/null; then
  sed -n '/SHOWCASE:BEGIN/,/SHOWCASE:END/p' "$SRC/AGENTS.md" >> "$DST/AGENTS.md"
fi
echo "Copied. Review and commit in: $DST"
git -C "$DST" status --short | head -40
