# Your videos go here

Drop your video files (MP4 or MOV) into this folder, then ask Claude to add them to the page. To do it yourself, run:

```bash
python3 scripts/add_video.py my-videos/your-video.mp4 --name "Your title" --line "One sentence about it."
```

Files in this folder stay on your computer: they're excluded from git. The compressed copies the page uses go into `public/showcase/media/`.
