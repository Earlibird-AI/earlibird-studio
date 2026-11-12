"""Add your own videos to the showcase.

  python3 scripts/add_video.py my-videos/promo.mp4 --name "Spring promo" --line "What it is, in one sentence."
  python3 scripts/add_video.py my-videos/*.mp4                 # add several (names come from the file names)
  python3 scripts/add_video.py my-videos/tour.mp4 --replace guided-tour   # use your video as that format's example
  python3 scripts/add_video.py my-videos/teaser.mp4 --extra-of sizzle-reel --label "Our teaser (30 s)"
  python3 scripts/add_video.py --remove why-it-worked          # take a format off the page
  python3 scripts/add_video.py --list                          # show what's on the page

Each video is compressed for the web (H.264, 720p, sound removed unless --sound), gets a poster image, and is
written to public/showcase/media/. Its card is added to public/showcase/data.js. Needs ffmpeg
(Mac: brew install ffmpeg · Windows: winget install ffmpeg · Linux: sudo apt install ffmpeg).
"""
import argparse, json, os, re, shutil, subprocess, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SITE = os.path.join(ROOT, "public", "showcase")
MEDIA = os.path.join(SITE, "media")
DATA = os.path.join(SITE, "data.js")
LIMIT_MB = 24          # hosts like Cloudflare cap a single file at 25 MiB
HAS = ["camera", "voice", "screens", "brief", "audio"]
USE = ["social", "youtube", "sales", "teach"]


def load():
    txt = open(DATA, encoding="utf-8").read()
    a, b = txt.index("{", txt.index("window.SHOWCASE")), txt.rindex("}")
    return txt[:a], json.loads(txt[a:b + 1]), txt[b + 1:]


def save(head, data, tail):
    with open(DATA, "w", encoding="utf-8") as f:
        f.write(head + json.dumps(data, ensure_ascii=False, indent=1) + tail)


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:48] or "video"


def need_ffmpeg():
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        sys.exit("ffmpeg is needed. Mac: brew install ffmpeg · Windows: winget install ffmpeg · Linux: sudo apt install ffmpeg")


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation:format=duration",
                          "-of", "json", path], capture_output=True, text=True)
    if out.returncode:
        sys.exit(f"Can't read {path}: {out.stderr.strip()[:300]}")
    j = json.loads(out.stdout)
    st = j["streams"][0]
    w, h = st["width"], st["height"]
    rot = next((abs(int(sd.get("rotation", 0))) for sd in st.get("side_data_list", []) if "rotation" in sd), 0)
    if rot in (90, 270):
        w, h = h, w
    return w, h, float(j["format"]["duration"])


def aspect_of(w, h):
    r = w / h
    for name, v in (("16:9", 16 / 9), ("9:16", 9 / 16), ("1:1", 1), ("4:5", .8), ("4:3", 4 / 3)):
        if abs(r - v) / v < .06:
            return name
    return f"{w}:{h}"


def length_of(d):
    return f"{round(d)} s" if d < 90 else f"{d / 60:.0f} min" if d >= 600 else f"{int(d // 60)}:{int(d % 60):02d} min"


def encode(src, name, sound):
    w, h, dur = probe(src)
    os.makedirs(MEDIA, exist_ok=True)
    out = os.path.join(MEDIA, name + ".mp4")
    scale = "scale='min(1280,iw)':-2" if w >= h else "scale=-2:'min(1280,ih)'"
    for crf in (26, 29, 32, 35):
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", f"{scale}:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow",
               "-crf", str(crf), "-movflags", "+faststart", "-map_metadata", "-1"]
        cmd += ["-c:a", "aac", "-b:a", "96k"] if sound else ["-an"]
        subprocess.run(cmd + [out], check=True)
        mb = os.path.getsize(out) / 1e6
        if mb <= LIMIT_MB:
            break
    else:
        print(f"  ! {name}.mp4 is still {mb:.0f} MB. Trim the video (shorter is better for a showcase) and try again.")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{min(max(dur * .45, .5), max(dur - .2, 0)):.2f}", "-i", out, "-frames:v", "1",
                    "-vf", "scale='min(960,iw)':-2", "-q:v", "5", os.path.join(MEDIA, name + ".jpg")], check=True)
    print(f"  ✓ media/{name}.mp4 ({mb:.1f} MB, {aspect_of(w, h)}, {length_of(dur)}) + poster")
    return aspect_of(w, h), length_of(dur)


def unique(name, data):
    taken = {f["id"] for f in data["formats"]} | {os.path.splitext(x)[0] for x in os.listdir(MEDIA)}
    n, k = name, 2
    while n in taken:
        n, k = f"{name}-{k}", k + 1
    return n


def csv(v, allowed, flag):
    items = [x.strip() for x in (v or "").split(",") if x.strip()]
    bad = [x for x in items if x not in allowed]
    if bad:
        sys.exit(f"{flag} accepts: {', '.join(allowed)} (got {', '.join(bad)})")
    return items


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("videos", nargs="*", help="video files to add")
    ap.add_argument("--name", help="card title (default: from the file name)")
    ap.add_argument("--id", help="short id used for the files (default: from the name)")
    ap.add_argument("--line", default="", help="one-sentence description")
    ap.add_argument("--good", default="", help="what it's good for")
    ap.add_argument("--bring", default="", help="what someone needs to make one")
    ap.add_argument("--length", help="typical length to show (default: this video's length)")
    ap.add_argument("--has", help=f"comma list of: {', '.join(HAS)}")
    ap.add_argument("--use", help=f"comma list of: {', '.join(USE)}")
    ap.add_argument("--sound", action="store_true", help="keep the audio (only if you own the music and voices)")
    ap.add_argument("--note", default="", help="small print shown under the description")
    ap.add_argument("--first", action="store_true", help="put the new card first instead of last")
    ap.add_argument("--replace", metavar="ID", help="use this video as the example for an existing format")
    ap.add_argument("--extra-of", metavar="ID", help="add this video as a second example on an existing format")
    ap.add_argument("--label", help="button text for --extra-of")
    ap.add_argument("--remove", metavar="ID", help="remove a format card")
    ap.add_argument("--list", action="store_true", help="list the formats on the page")
    a = ap.parse_args()
    head, data, tail = load()
    F = data["formats"]
    find = lambda i: next((f for f in F if f["id"] == i), None) or sys.exit(f"No format with id '{i}'. Run --list to see them.")

    if a.list:
        for f in F:
            print(f"{f['id']:<26} {f['name']:<24} {f['aspect']:<6} {'(yours)' if f.get('mine') else ''}")
        return
    if a.remove:
        f = find(a.remove)
        F.remove(f)
        save(head, data, tail)
        print(f"Removed '{f['name']}' from the page (its media files are left in media/).")
        return
    if not a.videos:
        ap.error("give at least one video file (or --list / --remove)")
    has, use = csv(a.has, HAS, "--has"), csv(a.use, USE, "--use")
    need_ffmpeg()
    if (a.replace or a.extra_of) and len(a.videos) != 1:
        sys.exit("--replace and --extra-of take exactly one video")

    for path in a.videos:
        if not os.path.isfile(path):
            print(f"  skip {path}: not a file")
            continue
        base = os.path.splitext(os.path.basename(path))[0]
        title = a.name if (a.name and len(a.videos) == 1) else re.sub(r"[-_]+", " ", base).strip().title()
        fid = unique(slug(a.id or title), data)
        print(f"{os.path.basename(path)} → {fid}")
        aspect, length = encode(path, fid, a.sound)
        if a.replace:
            f = find(a.replace)
            f.update(src=fid, poster=fid, aspect=aspect, sound=a.sound, mine=True)
            for k in ("clip", "note", "extra"):
                f.pop(k, None)
            if a.note:
                f["note"] = a.note
            print(f"  ✓ '{f['name']}' now shows your video")
        elif a.extra_of:
            f = find(a.extra_of)
            f["extra"] = dict(src=fid, label=a.label or f"{title} ({length})")
            print(f"  ✓ added as a second example on '{f['name']}'")
        else:
            entry = dict(id=fid, name=title, aspect=aspect, length=a.length or length,
                         has=has, use=use,
                         line=a.line or "Add a one-sentence description in data.js.",
                         good=a.good or "Add what it's good for in data.js.", bring=a.bring or "Add what's needed to make one in data.js.",
                         mine=True)
            if a.sound:
                entry["sound"] = True
            if a.note:
                entry["note"] = a.note
            F.insert(0, entry) if a.first else F.append(entry)
            print(f"  ✓ card '{title}' added")
    save(head, data, tail)
    print("Done. Preview: python3 scripts/serve.py → http://localhost:4870/showcase/index.html")


if __name__ == "__main__":
    main()
