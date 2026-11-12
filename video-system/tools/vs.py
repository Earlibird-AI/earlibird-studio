"""Video system: turn raw talking footage into finished, branded videos.

  python3 video-system/tools/vs.py check                 # is everything installed?
  python3 video-system/tools/vs.py list                  # videos waiting in "1. To edit"
  python3 video-system/tools/vs.py edit "My title"       # transcribe + plan + render in one go
  python3 video-system/tools/vs.py transcribe "My title" # → _work/transcript.txt (timed, for the AI to read)
  python3 video-system/tools/vs.py plan "My title"       # → edit.json (the edit decisions; the AI refines it)
  python3 video-system/tools/vs.py render "My title"     # edit.json → finished videos + thumbnail + captions
  python3 video-system/tools/vs.py sheet "My title"      # contact sheet of the finished video(s) to check by eye

"My title" can be part of a folder name in "1. To edit", or a path to a folder. Raw footage is never changed.
Needs ffmpeg + ffprobe, and the Python packages in requirements.txt (run tools/setup.py once).
"""
import json, math, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VS = os.path.dirname(HERE)

# Re-run inside video-system/.venv when it exists (created by setup.py).
_venv_py = os.path.join(VS, ".venv", "Scripts" if os.name == "nt" else "bin", "python.exe" if os.name == "nt" else "python")
if os.path.exists(_venv_py) and os.path.realpath(sys.prefix) != os.path.realpath(os.path.join(VS, ".venv")) and not os.environ.get("VS_NO_VENV"):
    os.execv(_venv_py, [_venv_py, os.path.abspath(__file__)] + sys.argv[1:])

VIDEO_EXT = (".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi")
FPS = 30


# ── config, brand, helpers ────────────────────────────────────────────────────────────────────────────────────
def load_json(p, default=None):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def vs_path(p):
    return p if os.path.isabs(p) else os.path.normpath(os.path.join(VS, p))


CFG = load_json(os.path.join(VS, "config.json"), {}) or {}
BRAND = load_json(os.path.join(VS, "brand.json"), {}) or {}


def say(*a):
    print(*a, flush=True)


def die(msg):
    say("✗ " + msg)
    sys.exit(1)


def run(cmd, quiet=True):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        die("command failed: " + " ".join(cmd[:6]) + " …\n" + (r.stderr or r.stdout)[-1500:])
    return r.stdout


def probe(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate:stream_side_data=rotation",
               "-of", "json", path])
    j = json.loads(out)
    v = next((s for s in j["streams"] if s.get("codec_type") == "video"), None)
    if not v:
        die(f"no video stream in {path}")
    w, h = v["width"], v["height"]
    rot = next((abs(int(sd.get("rotation", 0))) for sd in v.get("side_data_list", []) if "rotation" in sd), 0)
    if rot in (90, 270):
        w, h = h, w
    has_audio = any(s.get("codec_type") == "audio" for s in j["streams"])
    return dict(w=w, h=h, dur=float(j["format"]["duration"]), audio=has_audio)


def hex_rgba(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def color(name, default):
    return BRAND.get("colors", {}).get(name, default)


def font(role, size):
    from PIL import ImageFont
    p = vs_path(BRAND.get("fonts", {}).get(role, "fonts/poppins-800-normal.ttf"))
    try:
        return ImageFont.truetype(p, size)
    except OSError:
        return ImageFont.truetype(vs_path("fonts/poppins-800-normal.ttf"), size)


def find_project(arg):
    if arg and os.path.isdir(arg):
        return os.path.abspath(arg)
    base = vs_path(CFG.get("to_edit", "workspace/1. To edit"))
    if not os.path.isdir(base):
        die(f'"To edit" folder not found: {base}  (set "to_edit" in video-system/config.json)')
    names = sorted(d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d)))
    hits = [d for d in names if (arg or "").lower() in d.lower()]
    if len(hits) == 1:
        return os.path.join(base, hits[0])
    if not hits:
        die(f'no folder matching "{arg}" in {base}. Folders: ' + (", ".join(names) or "(none)"))
    die(f'"{arg}" matches several folders: ' + ", ".join(hits))


def clips_in(folder):
    vids = sorted(os.path.join(folder, f) for f in os.listdir(folder)
                  if f.lower().endswith(VIDEO_EXT) and not f.startswith("."))
    if not vids:
        die(f"no video files in {folder}")
    return vids


def notes_of(folder):
    """notes.txt → {lowercase key: value} ("Format: Clean" → {"format": "Clean"})"""
    p = os.path.join(folder, "notes.txt")
    out = {}
    if os.path.exists(p):
        for line in open(p, encoding="utf-8", errors="ignore"):
            if ":" in line:
                k, v = line.split(":", 1)
                out[k.strip().lower()] = v.strip()
    return out


def work_dir(folder):
    d = os.path.join(folder, "_work")
    os.makedirs(d, exist_ok=True)
    return d


def ts(t):
    return f"{int(t // 60):02d}:{t % 60:04.1f}"


# ── check ─────────────────────────────────────────────────────────────────────────────────────────────────────
def cmd_check(_):
    ok = True
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool):
            say(f"✓ {tool}")
        else:
            ok = False
            say(f"✗ {tool} missing. Mac: brew install ffmpeg · Windows: winget install ffmpeg · Linux: sudo apt install ffmpeg")
    for mod, pip in (("PIL", "Pillow"), ("faster_whisper", "faster-whisper")):
        try:
            __import__(mod)
            say(f"✓ {pip}")
        except ImportError:
            ok = False
            say(f"✗ {pip} missing. Run: python3 video-system/tools/setup.py")
    for role in ("headline", "caption"):
        p = vs_path(BRAND.get("fonts", {}).get(role, ""))
        say(("✓" if os.path.exists(p) else "✗") + f" {role} font: {p}")
    logo = BRAND.get("logo")
    if logo:
        say(("✓" if os.path.exists(vs_path(logo)) else "✗") + f" logo: {vs_path(logo)}")
    for k in ("to_edit", "finished"):
        p = vs_path(CFG.get(k, ""))
        say(("✓" if os.path.isdir(p) else "✗") + f" {k} folder: {p}")
    say("Ready." if ok else "Fix the ✗ items above, then run check again.")
    return ok


def cmd_list(_):
    base = vs_path(CFG.get("to_edit", "workspace/1. To edit"))
    fin = vs_path(CFG.get("finished", "workspace/2. Finished"))
    for d in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        if os.path.isdir(os.path.join(base, d)):
            state = "finished" if os.path.isdir(os.path.join(fin, d)) else ("planned" if os.path.exists(os.path.join(base, d, "edit.json")) else "to do")
            say(f"{state:<9} {d}")


# ── transcribe ────────────────────────────────────────────────────────────────────────────────────────────────
def source_video(folder):
    """One clip → used as is. Several → joined in name order into _work/joined.mp4."""
    clips = clips_in(folder)
    if len(clips) == 1:
        return clips[0]
    out = os.path.join(work_dir(folder), "joined.mp4")
    if os.path.exists(out) and os.path.getmtime(out) > max(os.path.getmtime(c) for c in clips):
        return out
    p0 = probe(clips[0])
    W, H = (p0["w"], p0["h"])
    W, H = W - W % 2, H - H % 2
    cmd = ["ffmpeg", "-v", "error", "-y"]
    for c in clips:
        cmd += ["-i", c]
    parts = "".join(f"[{i}:v]scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={FPS}[v{i}];"
                    f"[{i}:a]aresample=48000[a{i}];" for i in range(len(clips)))
    cat = "".join(f"[v{i}][a{i}]" for i in range(len(clips))) + f"concat=n={len(clips)}:v=1:a=1[v][a]"
    run(cmd + ["-filter_complex", parts + cat, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-c:a", "aac", out])
    say(f"joined {len(clips)} clips → {out}")
    return out


def cmd_transcribe(args, quiet=False):
    folder = find_project(args.title)
    src = source_video(folder)
    wd = work_dir(folder)
    tj = os.path.join(wd, "transcript.json")
    if os.path.exists(tj) and os.path.getmtime(tj) > os.path.getmtime(src) and not getattr(args, "force", False):
        if not quiet:
            say(f"transcript already up to date: {os.path.join(wd, 'transcript.txt')}")
        return folder, load_json(tj)
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        die("faster-whisper is not installed. Run: python3 video-system/tools/setup.py")
    model_name = CFG.get("whisper_model", "small")
    say(f"transcribing with whisper '{model_name}' (first run downloads the model)…")
    model = WhisperModel(model_name, device="auto", compute_type="int8")
    segs, info = model.transcribe(src, word_timestamps=True, vad_filter=True, beam_size=5)
    words, lines = [], []
    for s in segs:
        ws = [dict(w=w.word.strip(), s=round(w.start, 3), e=round(w.end, 3)) for w in (s.words or []) if w.word.strip()]
        words += ws
        lines.append(dict(s=round(s.start, 2), e=round(s.end, 2), text=s.text.strip()))
    data = dict(source=os.path.basename(src), language=info.language, duration=probe(src)["dur"], words=words, lines=lines)
    with open(tj, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=0)
    with open(os.path.join(wd, "transcript.txt"), "w", encoding="utf-8") as f:
        f.write(f"# {os.path.basename(folder)}  ({data['language']}, {data['duration']:.1f}s). Times are in the raw footage.\n")
        for i, l in enumerate(lines, 1):
            f.write(f"[{i:03d}] {ts(l['s'])}–{ts(l['e'])}  {l['text']}\n")
    say(f"✓ transcript: {os.path.join(wd, 'transcript.txt')} ({len(words)} words)")
    return folder, data


# ── plan ──────────────────────────────────────────────────────────────────────────────────────────────────────
def auto_keep(words, dur, max_pause, pad=0.12):
    """speech regions: words closer than max_pause are one region; long silences are dropped"""
    if not words:
        return [[0.0, round(dur, 2)]]
    regions = [[max(0.0, words[0]["s"] - pad), words[0]["e"] + pad]]
    for w in words[1:]:
        if w["s"] - regions[-1][1] <= max_pause:
            regions[-1][1] = w["e"] + pad
        else:
            regions.append([max(0.0, w["s"] - pad), w["e"] + pad])
    return [[round(a, 2), round(min(b, dur), 2)] for a, b in regions]


def cmd_plan(args):
    import argparse
    folder, tr = cmd_transcribe(argparse.Namespace(title=args.title, force=False), quiet=True)
    ej = os.path.join(folder, "edit.json")
    if os.path.exists(ej) and not getattr(args, "force", False):
        say(f"edit.json already exists (use --force to start again): {ej}")
        return folder
    n = notes_of(folder)
    name = re.sub(r"^\d{4}-\d{2}-\d{2}\s*", "", os.path.basename(folder)).strip()
    versions = ["16:9"]
    vtxt = (n.get("versions", "") + " " + n.get("version", "")).lower()
    if "9:16" in vtxt or "reel" in vtxt or "vertical" in vtxt or "short" in vtxt:
        versions.append("9:16")
    src = probe(os.path.join(folder, "_work", "joined.mp4") if os.path.exists(os.path.join(folder, "_work", "joined.mp4")) else clips_in(folder)[0])
    if src["h"] > src["w"]:
        versions = ["9:16"] + (["16:9"] if "16:9" in vtxt else [])
    plan = {
        "_help": "Edit decisions. Times are seconds in the RAW footage (see _work/transcript.txt). cutaways = list of {file, t, dur}: a scene video or image in this folder, shown full-screen from raw time t while the voice continues. Add fit = contain to show all of it (no cropping) on the brand background. text_y / caption_y = height of the title cards / captions (0 top, 1 bottom; null = default for the shape). Move them if they cover a face or logo. Change anything, then run render.",
        "title": name,
        "title_card": True,
        "keep": auto_keep(tr["words"], tr["duration"], float(CFG.get("max_pause", 0.6))),
        "remove": [],
        "captions": True,
        "caption_style": BRAND.get("caption_style", "pill"),
        "highlight_words": [w.strip() for w in re.split(r"[,;]", n.get("highlight", "")) if w.strip()],
        "pop_words": [],
        "cutaways": [],
        "fix_words": {},
        "end_card": True,
        "cta": n.get("call to action", BRAND.get("cta", "")),
        "versions": versions,
        "vertical_focus": 0.5,
        "text_y": None,
        "caption_y": None,
        "thumbnail": {"time": None, "text": n.get("thumbnail text", name)},
        "music": None,
        "music_volume": 0.12,
    }
    with open(ej, "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)
    say(f"✓ plan: {ej}  ({len(plan['keep'])} speech sections, versions {', '.join(versions)})")
    say("  Next: read _work/transcript.txt, add retakes/mistakes to \"remove\", set highlight_words, pop_words and thumbnail, then render.")
    return folder


# ── render helpers ────────────────────────────────────────────────────────────────────────────────────────────
def subtract(keep, remove):
    out = []
    for a, b in keep:
        parts = [[a, b]]
        for r in remove:
            ra, rb = float(r[0]), float(r[1])
            nxt = []
            for x, y in parts:
                if rb <= x or ra >= y:
                    nxt.append([x, y])
                else:
                    if ra > x:
                        nxt.append([x, ra])
                    if rb < y:
                        nxt.append([rb, y])
            parts = nxt
        out += [p for p in parts if p[1] - p[0] >= 0.08]
    return sorted(out)


def remap(t, segs):
    """raw time → time in the cut, or None if t was cut out"""
    acc = 0.0
    for a, b in segs:
        if a <= t <= b:
            return acc + (t - a)
        acc += b - a
    return None


def norm_word(w):
    return re.sub(r"[^\w'%$€£#]+", "", w.lower())


def caption_chunks(words, max_chars, max_words=4):
    chunks, cur = [], []
    for w in words:
        text = " ".join(x["w"] for x in cur + [w])
        gap = w["t"] - cur[-1]["te"] if cur else 0
        if cur and (len(text) > max_chars or len(cur) >= max_words or gap > 0.45 or re.search(r"[.?!,;:]$", cur[-1]["w"])):
            chunks.append(cur)
            cur = []
        cur.append(w)
    if cur:
        chunks.append(cur)
    return chunks


def rounded(draw, box, r, fill):
    draw.rounded_rectangle(box, radius=r, fill=fill)


def draw_caption(W, H, chunk, cur_i, style, vertical, hl):
    """one caption state as a transparent PNG band: (image, y position)"""
    from PIL import Image, ImageDraw
    acc = hex_rgba(color("accent", "#F3D053"))
    txt = hex_rgba(color("text", "#FFFFFF"))
    dim = hex_rgba(color("dim", "#A3A39E"))
    size = int(H * (0.043 if vertical else 0.052))
    if style == "upper":
        size = int(size * 1.08)
    f = font("caption", size)
    words = [w["w"].upper() if style == "upper" else w["w"] for w in chunk]
    space = f.getlength(" ")
    widths = [f.getlength(w) for w in words]
    maxw = W * (0.84 if vertical else 0.72)
    lines, line, lw = [], [], 0
    for i, wd in enumerate(widths):
        if line and lw + space + wd > maxw:
            lines.append(line)
            line, lw = [], 0
        lw += (space if line else 0) + wd
        line.append(i)
    lines.append(line)
    lh = int(size * 1.25)
    band_h = lh * len(lines) + int(size * 0.9)
    img = Image.new("RGBA", (W, band_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad_x, pad_y = int(size * 0.55), int(size * 0.28)
    total_w = max(sum(widths[i] for i in ln) + space * (len(ln) - 1) for ln in lines)
    y0 = int(size * 0.45)
    if style in ("pill", "box"):
        bx0 = (W - total_w) / 2 - pad_x
        fill = (18, 19, 22, 236) if style == "pill" else hex_rgba(color("background", "#16171A"), 238)
        rounded(d, (bx0, y0 - pad_y, bx0 + total_w + 2 * pad_x, y0 + lh * len(lines) + pad_y - int(size * 0.18)),
                int(size * (0.42 if style == "pill" else 0.16)), fill)
    for li, ln in enumerate(lines):
        lw = sum(widths[i] for i in ln) + space * (len(ln) - 1)
        x = (W - lw) / 2
        y = y0 + li * lh
        for i in ln:
            key = norm_word(chunk[i]["w"]) in hl
            if style in ("pill", "box"):
                col = acc if (i == cur_i and key) or (key and i < cur_i) else (txt if i <= cur_i else dim)
            else:
                col = acc if i == cur_i or (key and i <= cur_i) else txt
            kw = dict(font=f, fill=col)
            if style in ("karaoke", "upper"):
                kw.update(stroke_width=max(2, size // 14), stroke_fill=(0, 0, 0, 230))
            d.text((x, y), words[i], **kw)
            x += widths[i] + space
    y_pos = int(H * (0.72 if vertical else 0.86)) - band_h // 2
    return img, y_pos


def text_block(W, H, title, vertical, plate=True, scale=1.0, y=0.2):
    """title / pop-word card: big headline on a rounded plate, as a full-frame transparent PNG"""
    from PIL import Image, ImageDraw
    size = int(H * (0.058 if vertical else 0.075) * scale)
    f = font("headline", size)
    t = title.upper() if BRAND.get("uppercase_titles") else title
    maxw = W * (0.8 if vertical else 0.7)
    words, lines, cur = t.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if cur and f.getlength(test) > maxw:
            lines.append(cur)
            cur = w
        else:
            cur = test
    lines.append(cur)
    lh = int(size * 1.15)
    tw = max(f.getlength(l) for l in lines)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = W / 2, H * y
    th = lh * len(lines)
    if plate:
        px, py = size * 0.6, size * 0.45
        d.rounded_rectangle((cx - tw / 2 - px, cy - th / 2 - py, cx + tw / 2 + px, cy + th / 2 + py * 0.7), radius=int(size * 0.35),
                            fill=hex_rgba(color("background", "#16171A"), 225))
    acc = hex_rgba(color("accent", "#F3D053"))
    for i, l in enumerate(lines):
        lw_ = f.getlength(l)
        d.text((cx - lw_ / 2, cy - th / 2 + i * lh), l, font=f, fill=hex_rgba(color("text", "#FFFFFF")))
    # accent underline under the block (one brand moment)
    uw = min(tw * 0.35, size * 3)
    d.rounded_rectangle((cx - uw / 2, cy + th / 2 + size * 0.12, cx + uw / 2, cy + th / 2 + size * 0.2), radius=4, fill=acc)
    return img


def end_card(W, H, cta, vertical):
    from PIL import Image, ImageDraw
    bg = hex_rgba(color("background", "#16171A"))
    img = Image.new("RGBA", (W, H), bg)
    d = ImageDraw.Draw(img)
    acc = hex_rgba(color("accent", "#F3D053"))
    y = H * 0.36
    logo = BRAND.get("logo")
    if logo and os.path.exists(vs_path(logo)):
        L = Image.open(vs_path(logo)).convert("RGBA")
        lw = int(W * (0.5 if vertical else 0.26))
        L = L.resize((lw, int(L.height * lw / L.width)))
        img.alpha_composite(L, (int((W - L.width) / 2), int(y - L.height / 2)))
        y += L.height / 2 + H * 0.06
    else:
        f = font("headline", int(H * 0.08))
        n = BRAND.get("name", "")
        d.text(((W - f.getlength(n)) / 2, y - H * 0.04), n, font=f, fill=hex_rgba(color("text", "#FFFFFF")))
        y += H * 0.08
    if cta:
        size = int(H * (0.045 if vertical else 0.055))
        f = font("headline", size)
        while f.getlength(cta) > W * 0.78 and size > 18:
            size -= 2
            f = font("headline", size)
        tw = f.getlength(cta)
        px, py = H * 0.03, H * 0.018
        d.rounded_rectangle(((W - tw) / 2 - px, y, (W + tw) / 2 + px, y + f.size * 1.25 + 2 * py), radius=int(H * 0.04), fill=acc)
        d.text(((W - tw) / 2, y + py), cta, font=f, fill=hex_rgba(color("background", "#16171A")))
        y += f.size * 1.25 + 2 * py + H * 0.04
    site = BRAND.get("website", "")
    if site:
        f = font("caption", int(H * 0.032))
        d.text(((W - f.getlength(site)) / 2, y), site, font=f, fill=hex_rgba(color("dim", "#A3A39E")))
    return img


def write_srt(path, chunks):
    def t(x):
        x = max(0, x)
        return f"{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{int(x % 60):02d},{int(round((x % 1) * 1000)) % 1000:03d}"
    with open(path, "w", encoding="utf-8") as f:
        for i, (a, b, text) in enumerate(chunks, 1):
            f.write(f"{i}\n{t(a)} --> {t(b)}\n{text}\n\n")


# ── render ────────────────────────────────────────────────────────────────────────────────────────────────────
def cut_video(folder, src, segs, info):
    """raw → _work/cut.mp4: kept sections joined, audio levelled, 30 fps, even size"""
    out = os.path.join(work_dir(folder), "cut.mp4")
    W, H = info["w"] - info["w"] % 2, info["h"] - info["h"] % 2
    fl, cat = [], ""
    for i, (a, b) in enumerate(segs):
        fl.append(f"[0:v]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS,scale={W}:{H},fps={FPS}[v{i}]")
        if info["audio"]:
            fl.append(f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={max(0, b - a - 0.03):.3f}:d=0.03[a{i}]")
        cat += f"[v{i}]" + (f"[a{i}]" if info["audio"] else "")
    fl.append(cat + f"concat=n={len(segs)}:v=1:a={1 if info['audio'] else 0}[v]" + ("[a0x]" if info["audio"] else ""))
    if info["audio"]:
        fl.append("[a0x]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]")
    script = os.path.join(work_dir(folder), "cut_filter.txt")
    with open(script, "w") as f:
        f.write(";\n".join(fl))
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex_script", script, "-map", "[v]"]
    if info["audio"]:
        cmd += ["-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    run(cmd + ["-c:v", "libx264", "-crf", "17", "-preset", "fast", "-pix_fmt", "yuv420p", out])
    return out


def caption_track(wd, tag, W, H, chunks_t, style, vertical, hl, total, cap_y):
    """caption states → PNG band sequence + ffconcat list (durations) to overlay as one stream"""
    d = os.path.join(wd, f"cap_{tag}")
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    from PIL import Image
    blank = os.path.join(d, "blank.png")
    events = []   # (start, end, png, y)
    k = 0
    band_y = None
    for ci, (chunk, start, end) in enumerate(chunks_t):
        for wi, w in enumerate(chunk):
            a = w["t"] if wi else start
            b = chunk[wi + 1]["t"] if wi + 1 < len(chunk) else end
            img, y = draw_caption(W, H, chunk, wi, style, vertical, hl)
            p = os.path.join(d, f"c{k:05d}.png")
            img.save(p)
            k += 1
            events.append((a, b, p, y, img.height))
    band_h = max((e[4] for e in events), default=10)
    band_y = int(H * float(cap_y)) - band_h // 2
    Image.new("RGBA", (W, band_h), (0, 0, 0, 0)).save(blank)
    # pad every PNG to the same band height (concat needs one size)
    for a, b, p, y, h in events:
        if h != band_h:
            im = Image.open(p)
            c = Image.new("RGBA", (W, band_h), (0, 0, 0, 0))
            c.paste(im, (0, (band_h - h) // 2))
            c.save(p)
    lst = os.path.join(d, "list.ffconcat")
    t = 0.0
    with open(lst, "w") as f:
        f.write("ffconcat version 1.0\n")
        for a, b, p, _, _ in events:
            if a - t > 0.001:
                f.write(f"file '{os.path.basename(blank)}'\nduration {a - t:.3f}\n")
            f.write(f"file '{os.path.basename(p)}'\nduration {max(0.034, b - a):.3f}\n")
            t = max(t, b)
        if total - t > 0.001:
            f.write(f"file '{os.path.basename(blank)}'\nduration {total - t:.3f}\n")
        f.write(f"file '{os.path.basename(blank)}'\n")
    return lst, band_y


def render_version(folder, cut, plan, words_t, aspect, out_path):
    wd = work_dir(folder)
    info = probe(cut)
    vertical = aspect == "9:16"
    W, H = (1080, 1920) if vertical else (1920, 1080)
    src_vertical = info["h"] > info["w"]
    total = info["dur"]
    # framing
    if vertical and not src_vertical:
        fx = float(plan.get("vertical_focus", 0.5))
        frame = f"crop=ih*9/16:ih:(iw-ow)*{fx:.3f}:0,scale={W}:{H}"
    elif not vertical and src_vertical:
        frame = (f"split[bgs][fgs];[bgs]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:2,eq=brightness=-0.15[bg];"
                 f"[fgs]scale=-2:{H}[fg];[bg][fg]overlay=(W-w)/2:0")
    else:
        frame = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"
    inputs = ["-i", cut]
    fl = [f"[0:v]{frame},setsar=1[base]"]
    last = "base"
    n_in = 1
    # cutaways: scene videos / images full-screen over the speaker (voice continues)
    for cw in plan.get("cutaways", []):
        fpath = os.path.join(folder, cw["file"])
        t = remap(float(cw["t"]), plan["_segs"])
        if t is None or not os.path.exists(fpath):
            say(f"  ! cutaway skipped ({cw.get('file')}): file missing or its time was cut")
            continue
        is_img = fpath.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
        dur = float(cw.get("dur") or (3.0 if is_img else probe(fpath)["dur"]))
        dur = max(0.2, min(dur, total - t))
        inputs += (["-loop", "1", "-t", f"{dur:.3f}", "-i", fpath] if is_img else ["-i", fpath])
        bgc = color("background", "#16171A").lstrip("#")
        fit = (f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=0x{bgc}"
               if cw.get("fit") == "contain" else f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}")
        fl.append(f"[{n_in}:v]{fit},setsar=1,fps={FPS},"
                  f"trim=0:{dur:.3f},setpts=PTS-STARTPTS+{t:.3f}/TB[cw{n_in}]")
        fl.append(f"[{last}][cw{n_in}]overlay=0:0:eof_action=pass[v{n_in}]")
        last, n_in = f"v{n_in}", n_in + 1
    hl = {norm_word(x) for x in plan.get("highlight_words", [])}
    text_y = plan.get("text_y") if plan.get("text_y") is not None else (0.13 if vertical else 0.2)
    cap_y = plan.get("caption_y") if plan.get("caption_y") is not None else (0.72 if vertical else 0.86)
    # captions
    style = plan.get("caption_style", "pill")
    if plan.get("captions", True) and words_t:
        maxc = 22 if vertical else 32
        chunks = caption_chunks(words_t, maxc)
        chunks_t = []
        for i, ch in enumerate(chunks):
            start = ch[0]["t"]
            nxt = chunks[i + 1][0]["t"] if i + 1 < len(chunks) else total
            end = min(nxt, ch[-1]["te"] + 0.6)
            chunks_t.append((ch, start, end))
        lst, band_y = caption_track(wd, aspect.replace(":", "x"), W, H, chunks_t, style, vertical, hl, total, cap_y)
        inputs += ["-f", "concat", "-safe", "0", "-i", lst]
        fl.append(f"[{n_in}:v]format=rgba,setpts=PTS-STARTPTS[cap]")
        fl.append(f"[{last}][cap]overlay=0:{band_y}:eof_action=pass:format=auto[v{n_in}]")
        last, n_in = f"v{n_in}", n_in + 1
        write_srt(os.path.splitext(out_path)[0] + ".srt", [(s, e, " ".join(w["w"] for w in c)) for c, s, e in chunks_t])
    # title card (first ~2.8 s) and pop words
    overlays = []
    if plan.get("title_card", True) and plan.get("title"):
        overlays.append((0.15, min(2.9, total - 0.2), text_block(W, H, plan["title"], vertical, y=float(text_y))))
    for pw in plan.get("pop_words", []):
        t = remap(float(pw["t"]), plan["_segs"])
        if t is not None:
            overlays.append((t, min(t + float(pw.get("dur", 1.4)), total), text_block(W, H, str(pw["text"]), vertical, scale=1.25, y=float(pw.get("y", text_y)))))
    for j, (a, b, img) in enumerate(overlays):
        p = os.path.join(wd, f"ov_{aspect.replace(':', 'x')}_{j}.png")
        img.save(p)
        d = max(0.3, b - a)
        inputs += ["-loop", "1", "-t", f"{d:.3f}", "-i", p]
        fl.append(f"[{n_in}:v]format=rgba,fade=t=in:st=0:d=0.18:alpha=1,fade=t=out:st={max(0, d - 0.22):.3f}:d=0.22:alpha=1,setpts=PTS-STARTPTS+{a:.3f}/TB[o{n_in}]")
        fl.append(f"[{last}][o{n_in}]overlay=0:0:eof_action=pass[v{n_in}]")
        last, n_in = f"v{n_in}", n_in + 1
    fl.append(f"[{last}]format=yuv420p[main]")
    has_audio = info["audio"]
    amap = "0:a" if has_audio else None
    # music bed (optional, only music they own)
    music = plan.get("music")
    if music and os.path.exists(os.path.join(folder, music)) and has_audio:
        inputs += ["-stream_loop", "-1", "-i", os.path.join(folder, music)]
        fl.append(f"[{n_in}:a]volume={float(plan.get('music_volume', 0.12))},atrim=0:{total:.3f}[mus];[0:a][mus]amix=inputs=2:duration=first:normalize=0[amain]")
        amap, n_in = "[amain]", n_in + 1
    # end card
    if plan.get("end_card", True):
        p = os.path.join(wd, f"end_{aspect.replace(':', 'x')}.png")
        end_card(W, H, plan.get("cta", ""), vertical).convert("RGB").save(p)
        inputs += ["-loop", "1", "-t", "3", "-framerate", str(FPS), "-i", p]
        fl.append(f"[{n_in}:v]scale={W}:{H},setsar=1,fps={FPS},format=yuv420p,fade=t=in:st=0:d=0.3[end]")
        n_in += 1
        if has_audio:
            inputs += ["-f", "lavfi", "-t", "3", "-i", "anullsrc=r=48000:cl=stereo"]
            src_a = amap if amap.startswith("[") else "[0:a]"
            fl.append(f"{src_a}aresample=48000,aformat=channel_layouts=stereo[am];[{n_in}:a]aformat=channel_layouts=stereo[ae];[main][am][end][ae]concat=n=2:v=1:a=1[vout][aout]")
            amap, n_in = "[aout]", n_in + 1
        else:
            fl.append("[main][end]concat=n=2:v=1:a=0[vout]")
    else:
        fl.append("[main]null[vout]")
    script = os.path.join(wd, f"render_{aspect.replace(':', 'x')}.txt")
    with open(script, "w") as f:
        f.write(";\n".join(fl))
    cmd = ["ffmpeg", "-v", "error", "-y"] + inputs + ["-filter_complex_script", script, "-map", "[vout]"]
    if amap:
        cmd += ["-map", amap, "-c:a", "aac", "-b:a", "160k"]
    run(cmd + ["-c:v", "libx264", "-crf", "20", "-preset", "medium", "-movflags", "+faststart", "-r", str(FPS), out_path])
    return out_path


def thumbnail(folder, cut, plan, out_path):
    from PIL import Image, ImageDraw, ImageFilter
    info = probe(cut)
    t = plan.get("thumbnail", {}).get("time")
    tt = remap(float(t), plan["_segs"]) if t is not None else info["dur"] * 0.35
    tt = min(max(0.1, tt or 0.1), info["dur"] - 0.1)
    frame = os.path.join(work_dir(folder), "thumb_frame.jpg")
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{tt:.2f}", "-i", cut, "-frames:v", "1",
         "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "2", frame])
    img = Image.open(frame).convert("RGBA")
    shade = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for x in range(img.width // 2):   # darken the left half so text reads
        sd.line([(x, 0), (x, img.height)], fill=(0, 0, 0, int(170 * (1 - x / (img.width / 2)))))
    img.alpha_composite(shade)
    text = (plan.get("thumbnail", {}).get("text") or plan.get("title", "")).upper()
    f = font("headline", 92)
    words, lines, cur = text.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if cur and f.getlength(test) > 620:
            lines.append(cur)
            cur = w
        else:
            cur = test
    lines.append(cur)
    d = ImageDraw.Draw(img)
    y = 360 - len(lines) * 52
    acc = hex_rgba(color("accent", "#F3D053"))
    for i, l in enumerate(lines[:4]):
        col = acc if i == len(lines[:4]) - 1 else (255, 255, 255, 255)
        d.text((60, y), l, font=f, fill=col, stroke_width=4, stroke_fill=(0, 0, 0, 255))
        y += 104
    img.convert("RGB").save(out_path, quality=90)
    return out_path


def cmd_render(args):
    folder = find_project(args.title)
    ej = os.path.join(folder, "edit.json")
    if not os.path.exists(ej):
        folder = cmd_plan(args)
    plan = load_json(ej)
    tr = load_json(os.path.join(folder, "_work", "transcript.json"))
    if not tr:
        _, tr = cmd_transcribe(args, quiet=True)
    src = source_video(folder)
    info = probe(src)
    segs = subtract(plan["keep"], plan.get("remove", []))
    if not segs:
        die("nothing left to keep: check keep/remove in edit.json")
    plan["_segs"] = segs
    say(f"cutting: {len(segs)} sections, {sum(b - a for a, b in segs):.1f}s of {info['dur']:.1f}s")
    cut = cut_video(folder, src, segs, info)
    fixes = {norm_word(k): v for k, v in plan.get("fix_words", {}).items()}
    words_t = []
    for w in tr["words"]:
        t0, t1 = remap(w["s"], segs), remap(w["e"], segs)
        if t0 is None and t1 is None:
            continue
        t0 = t0 if t0 is not None else t1 - 0.05
        t1 = t1 if t1 is not None else t0 + 0.2
        text = fixes.get(norm_word(w["w"]), w["w"])
        words_t.append(dict(w=text, t=round(t0, 3), te=round(t1, 3)))
    name = re.sub(r"^\d{4}-\d{2}-\d{2}\s*", "", os.path.basename(folder)).strip() or "video"
    out_dir = os.path.join(vs_path(CFG.get("finished", "workspace/2. Finished")), os.path.basename(folder))
    os.makedirs(out_dir, exist_ok=True)
    outs = []
    for aspect in plan.get("versions", ["16:9"]):
        tag = "16x9" if aspect == "16:9" else "9x16"
        say(f"rendering {aspect}…")
        outs.append(render_version(folder, cut, plan, words_t, aspect, os.path.join(out_dir, f"{name} {tag}.mp4")))
    outs.append(thumbnail(folder, cut, plan, os.path.join(out_dir, f"{name} thumbnail.jpg")))
    for o in outs:
        say(f"✓ {o}")
    say("Check it: vs.py sheet \"%s\"" % (args.title or folder))


def cmd_sheet(args):
    folder = find_project(args.title)
    out_dir = os.path.join(vs_path(CFG.get("finished", "workspace/2. Finished")), os.path.basename(folder))
    vids = [os.path.join(out_dir, f) for f in sorted(os.listdir(out_dir)) if f.endswith(".mp4")] if os.path.isdir(out_dir) else []
    if not vids:
        die("nothing rendered yet: run render first")
    for v in vids:
        d = probe(v)["dur"]
        out = os.path.splitext(v)[0] + " - sheet.jpg"
        run(["ffmpeg", "-v", "error", "-y", "-i", v, "-vf", f"fps=12/{d:.2f},scale=480:-2,tile=4x3", "-frames:v", "1", "-q:v", "4", out])
        say(f"✓ {out}  (12 frames across the video: look at it to check captions, cuts and cards)")


def cmd_edit(args):
    import argparse
    cmd_transcribe(argparse.Namespace(title=args.title, force=False), quiet=True)
    cmd_plan(args)
    cmd_render(args)


def main():
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["check", "list", "transcribe", "plan", "render", "edit", "sheet"])
    ap.add_argument("title", nargs="?", default="", help='folder name (or part of it) in "1. To edit", or a folder path')
    ap.add_argument("--force", action="store_true", help="transcribe: redo the transcript · plan/edit: start a fresh edit.json")
    a = ap.parse_args()
    if a.command not in ("check", "list") and not a.title:
        ap.error("give the video's title (its folder name in \"1. To edit\")")
    dict(check=cmd_check, list=cmd_list, transcribe=cmd_transcribe, plan=cmd_plan, render=cmd_render, edit=cmd_edit, sheet=cmd_sheet)[a.command](a)


if __name__ == "__main__":
    main()
