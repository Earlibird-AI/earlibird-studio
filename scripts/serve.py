"""Preview the showcase locally: python3 scripts/serve.py [port]  →  http://localhost:4870/showcase/
Serves public/ with HTTP Range support so videos can seek (Python's built-in server can't).
--no-range imitates hosts that ignore Range and send .mp4 without a content type (the page copes with both)."""
import http.server, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
PORT = int(ARGS[0]) if ARGS else 4870
NO_RANGE = "--no-range" in sys.argv


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def guess_type(self, path):
        if NO_RANGE and str(path).endswith((".mp4", ".webm")):
            return "application/octet-stream"
        return super().guess_type(path)

    def end_headers(self):
        if not NO_RANGE:
            self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if self.path in ("/", ""):
            self.send_response(302); self.send_header("Location", "/showcase/index.html"); self.end_headers(); return
        rng = None if NO_RANGE else self.headers.get("Range")
        path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path):
            return super().do_GET()
        m = re.match(r"bytes=(\d*)-(\d*)", rng)
        size = os.path.getsize(path)
        a = int(m.group(1)) if m and m.group(1) else 0
        b = int(m.group(2)) if m and m.group(2) else size - 1
        b = min(b, size - 1)
        if a > b:
            self.send_response(416); self.send_header("Content-Range", f"bytes */{size}"); self.end_headers(); return
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {a}-{b}/{size}")
        self.send_header("Content-Length", str(b - a + 1))
        self.end_headers()
        with open(path, "rb") as f:
            f.seek(a)
            left = b - a + 1
            while left > 0:
                chunk = f.read(min(1 << 16, left))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    return
                left -= len(chunk)


if __name__ == "__main__":
    print(f"Showcase on http://localhost:{PORT}/showcase/index.html  (Ctrl+C to stop)")
    http.server.ThreadingHTTPServer(("", PORT), H).serve_forever()
