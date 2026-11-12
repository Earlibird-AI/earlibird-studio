"""One-time setup for the video system:  python3 video-system/tools/setup.py

Creates video-system/.venv, installs the Python packages (faster-whisper for transcripts, Pillow for captions and
cards), checks ffmpeg, then runs `vs.py check`. Safe to run again. Windows: use `python` or `py` instead of `python3`.
"""
import os, platform, shutil, subprocess, sys

VS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENV = os.path.join(VS, ".venv")
PY = os.path.join(VENV, "Scripts", "python.exe") if os.name == "nt" else os.path.join(VENV, "bin", "python")
OS = platform.system()


def say(m):
    print(m, flush=True)


def ffmpeg_hint():
    if OS == "Darwin":
        return "brew install ffmpeg   (no Homebrew? first install it from https://brew.sh)"
    if OS == "Windows":
        return "winget install ffmpeg   (then close and reopen the terminal)"
    return "sudo apt install ffmpeg   (or your distro's package manager)"


def main():
    v = sys.version_info
    say(f"Python {v.major}.{v.minor} at {sys.executable}")
    if v < (3, 9):
        sys.exit("✗ Python 3.9 or newer is needed. Install Python 3.12 from https://www.python.org/downloads/ and run this again with it.")
    if v >= (3, 14):
        say("! Very new Python: if the install below fails, install Python 3.12 (python.org) and run setup with it.")
    if not os.path.exists(PY):
        say("creating video-system/.venv …")
        subprocess.run([sys.executable, "-m", "venv", VENV], check=True)
    say("installing packages (first time takes a minute) …")
    r = subprocess.run([PY, "-m", "pip", "install", "--upgrade", "pip", "-q"])
    r = subprocess.run([PY, "-m", "pip", "install", "-q", "-r", os.path.join(VS, "requirements.txt")])
    if r.returncode:
        sys.exit("✗ package install failed. Most often: Python is too new for faster-whisper. Install Python 3.12 from "
                 "https://www.python.org/downloads/, delete video-system/.venv, and run setup again with that Python.")
    say("✓ packages installed")
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        say("✗ ffmpeg is not installed. Install it with:\n    " + ffmpeg_hint())
    for d in ("workspace/1. To edit", "workspace/2. Finished"):
        os.makedirs(os.path.join(VS, d), exist_ok=True)
    say("")
    subprocess.run([PY, os.path.join(VS, "tools", "vs.py"), "check"])


if __name__ == "__main__":
    main()
