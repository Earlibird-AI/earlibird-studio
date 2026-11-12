/* Video loading that works on any host.
   Some hosts (including GoHighLevel AI Studio's) serve .mp4 files without byte-range support or a video
   content type. iPhones won't play video served like that, and seeking breaks everywhere. So the first video
   probes the host once: with range support (206) videos stream as normal; without it each video is downloaded
   whole (they're small) and played from memory, which plays everywhere and seeks instantly.
   Force a mode for testing with ?media=blob or ?media=stream in the page address. */
(function () {
  const forced = (/[?&]media=(blob|stream)\b/.exec(location.search) || [])[1];
  const blobs = new Map();   // url → Promise<object URL>
  let mode = null;           // Promise<"stream" | "blob">

  function probe(url) {
    if (forced) return Promise.resolve(forced);
    if (location.protocol === "file:") return Promise.resolve("stream");
    return fetch(url, { headers: { Range: "bytes=0-1" }, cache: "no-store" })
      .then((r) => { try { r.body && r.body.cancel(); } catch (e) {} return r.status === 206 ? "stream" : "blob"; })
      .catch(() => "stream");
  }
  function blobURL(url) {
    if (!blobs.has(url)) {
      const type = /\.webm$/i.test(url) ? "video/webm" : "video/mp4";
      blobs.set(url, fetch(url)
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((b) => URL.createObjectURL(new Blob([b], { type }))));
    }
    return blobs.get(url);
  }
  /* set(video, url, clip?) → Promise that resolves once the source is attached.
     clip = {start, end}: starts at `start` (the caller keeps it looping inside the clip). */
  function set(v, url, clip) {
    v.dataset.want = url;
    if (!mode) mode = probe(url);
    return mode
      .then((m) => (m === "stream" ? url : blobURL(url)))
      .catch(() => url)
      .then((src) => {
        if (v.dataset.want !== url) return false;   // a newer source was requested meanwhile
        if (clip) v.addEventListener("loadedmetadata", () => { v.currentTime = clip.start; }, { once: true });
        v.src = src;
        if (v.autoplay) v.play().catch(() => {});
        return true;
      });
  }
  window.EBMedia = { set };
})();
