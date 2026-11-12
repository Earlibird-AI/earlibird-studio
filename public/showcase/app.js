/* Earlibird Video Styles: formats grid, filters, saved shortlist, brief copy, effects reels. Plain JS, no build step. */
(function () {
  const D = window.SHOWCASE;
  const $ = (s, r = document) => r.querySelector(s);
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem("eb-" + k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("eb-" + k, JSON.stringify(v)); } catch (e) {} },
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const media = (n, ext) => `media/${n}.${ext}`;
  const canHover = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* brand (brand.js) */
  const B = Object.assign({ name: "", accent: "#F3D053" }, window.BRAND || {});
  const setText = (sel, v) => { if (v != null && $(sel)) $(sel).textContent = v; };
  if (B.pageTitle) {
    document.title = B.pageTitle;
    document.querySelectorAll('meta[property="og:title"]').forEach((m) => m.setAttribute("content", B.pageTitle));
  }
  if (B.icon) document.querySelector('link[rel="icon"]').href = B.icon;
  document.documentElement.style.setProperty("--y", B.accent);
  $("#b-logo").innerHTML = B.logo ? `<img src="${esc(B.logo)}" alt="${esc(B.name)}" height="32">` : `<span class="txt">${esc(B.name)}</span>`;
  $("#b-logo").setAttribute("aria-label", `${B.name}, back to top`);
  setText("#b-eyebrow", B.eyebrow); setText("#b-h1", B.heroTitle); setText("#b-h1i", B.heroItalic); setText("#b-lede", B.lede);
  setText("#b-cta-title", B.ctaTitle); setText("#b-cta-text", B.ctaText); setText("#b-footer", B.footer);
  if (B.website) { $("#b-cta").href = B.website; setText("#b-cta", B.websiteLabel || B.website.replace(/^https?:\/\//, "")); } else $("#b-cta").hidden = true;
  if (B.downloadUrl) { $("#b-dl").href = B.downloadUrl; } else $("#own").hidden = true;
  if (B.repoUrl) $("#b-repo").href = B.repoUrl; else $("#b-repo").hidden = true;
  if (B.driveKitUrl) $("#b-kit").href = B.driveKitUrl; else $("#b-kit-wrap").hidden = true;
  $("#own-copy").onclick = () => copy($("#own-prompt").textContent, "Prompt copied");

  $("#n-formats").textContent = D.formats.length;
  $("#n-skins").textContent = D.skins.length;
  $("#n-effects").textContent = D.effects.reduce((a, e) => a + e.list.length, 0);

  /* toast */
  let tt;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 1800); }
  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast(msg); } catch (e2) { toast("Couldn't copy: select and copy the text manually"); }
      ta.remove();
    }
  }

  /* saved shortlist */
  let saved = new Set(store.get("saved", []));
  const isSaved = (id) => saved.has(id);
  function toggleSave(id) {
    saved.has(id) ? saved.delete(id) : saved.add(id);
    store.set("saved", [...saved]);
    syncSaves();
  }
  function syncSaves() {
    document.querySelectorAll("[data-save]").forEach((b) => {
      const on = isSaved(b.dataset.save);
      b.setAttribute("aria-pressed", on);
      b.textContent = b.classList.contains("star") ? (on ? "★" : "☆") : (on ? "★ Saved" : "☆ Save");
      if (b.classList.contains("star")) b.setAttribute("aria-label", (on ? "Remove " : "Save ") + b.dataset.name);
    });
    const n = saved.size;
    $("#tray").hidden = n === 0;
    $("#tray-n").textContent = `${n} saved`;
    applyFilters();
  }

  /* brief */
  const skinName = () => { const id = store.get("skin", "modern"); const s = D.skins.find((x) => x.id === id); return s ? s.name : "Modern"; };
  function brief(list) {
    const one = (f) => [
      `Format: ${f.name} (${f.aspect}, ${f.length})`,
      `What I'll bring: ${f.bring}`,
    ].join("\n");
    return [
      B.briefTitle || `${(B.name || "").toUpperCase()} VIDEO BRIEF`,
      "",
      list.map(one).join("\n\n"),
      "",
      `Skin: ${skinName()}`,
      "Business / brand:",
      "Who it's for:",
      "Where it will be posted:",
      "Key message (one line):",
      "Call to action:",
      "Deadline:",
      "Notes:",
    ].join("\n");
  }

  /* filters */
  const state = { has: new Set(), use: new Set(), aspect: "all", savedOnly: false };
  function chips(el, entries, onClick) {
    el.innerHTML = entries.map(([k, label]) => `<button class="chip" data-k="${k}" aria-pressed="false">${esc(label)}</button>`).join("");
    el.querySelectorAll("button").forEach((b) => (b.onclick = () => onClick(b.dataset.k, b)));
  }
  chips($("#f-has"), Object.entries(D.has), (k) => { state.has.has(k) ? state.has.delete(k) : state.has.add(k); applyFilters(); });
  chips($("#f-use"), Object.entries(D.use), (k) => { state.use.has(k) ? state.use.delete(k) : state.use.add(k); applyFilters(); });
  chips($("#f-aspect"), [["all", "All"], ["16:9", "Landscape 16:9"], ["9:16", "Vertical 9:16"]], (k) => { state.aspect = k; applyFilters(); });
  $("#f-saved").onclick = () => { state.savedOnly = !state.savedOnly; applyFilters(); };
  $("#f-reset").onclick = () => { state.has.clear(); state.use.clear(); state.aspect = "all"; state.savedOnly = false; applyFilters(); };

  const matches = (f) =>
    (!state.has.size || f.has.some((h) => state.has.has(h))) &&
    (!state.use.size || f.use.some((u) => state.use.has(u))) &&
    (state.aspect === "all" || f.aspect === state.aspect) &&
    (!state.savedOnly || isSaved(f.id));

  function applyFilters() {
    document.querySelectorAll("#f-has .chip").forEach((b) => b.setAttribute("aria-pressed", state.has.has(b.dataset.k)));
    document.querySelectorAll("#f-use .chip").forEach((b) => b.setAttribute("aria-pressed", state.use.has(b.dataset.k)));
    document.querySelectorAll("#f-aspect .chip").forEach((b) => b.setAttribute("aria-pressed", state.aspect === b.dataset.k));
    $("#f-saved").setAttribute("aria-pressed", state.savedOnly);
    let n = 0;
    D.formats.forEach((f) => { const show = matches(f); if (show) n++; $(`.card[data-id="${f.id}"]`).classList.toggle("dim", !show); });
    const filtered = state.has.size || state.use.size || state.aspect !== "all" || state.savedOnly;
    $("#f-reset").hidden = !filtered;
    $("#f-count").textContent = filtered
      ? (n ? `${n} of ${D.formats.length} formats fit` : "Nothing fits all of those. Try removing a filter.")
      : `${D.formats.length} formats`;
  }

  /* cards */
  const grid = $("#grid");
  const posterOf = (f) => f.poster || f.id;
  const srcOf = (f) => (f.clip ? f.clip.src : f.src || f.id);
  grid.innerHTML = D.formats.map((f) => `
    <article class="card" data-id="${f.id}" tabindex="0" role="button" aria-label="Open ${esc(f.name)}">
      <div class="thumb ${f.aspect === "9:16" ? "tall" : ""}">
        <img src="${media(posterOf(f), "jpg")}" alt="" loading="lazy">
        <span class="play" aria-hidden="true">▶</span>${f.sound ? '<span class="snd">Sound on</span>' : ""}
      </div>
      <div class="cbody">
        <div class="cname"><h3>${esc(f.name)}</h3><button class="star" data-save="${f.id}" data-name="${esc(f.name)}" aria-pressed="false">☆</button></div>
        <p class="cline">${esc(f.line)}</p>
        <div class="tags"><span class="tag">${f.aspect}</span><span class="tag">${esc(f.length)}</span>${f.has.map((h) => `<span class="tag">${esc(D.has[h])}</span>`).join("")}</div>
      </div>
    </article>`).join("");

  grid.querySelectorAll(".card").forEach((card) => {
    const f = D.formats.find((x) => x.id === card.dataset.id);
    card.addEventListener("click", (e) => { if (e.target.closest(".star")) return; openModal(f.id); });
    card.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".star")) { e.preventDefault(); openModal(f.id); } });
    card.querySelector(".star").onclick = (e) => { e.stopPropagation(); toggleSave(f.id); };
    if (canHover) {   // muted hover preview on desktop
      const th = card.querySelector(".thumb");
      let v = null;
      card.addEventListener("mouseenter", () => {
        if (!v) {
          v = document.createElement("video");
          Object.assign(v, { muted: true, loop: !f.clip, playsInline: true, preload: "auto" });
          v.src = media(srcOf(f), "mp4") + (f.clip ? `#t=${f.clip.start},${f.clip.end}` : "");
          if (f.clip) v.addEventListener("timeupdate", () => { if (v.currentTime >= f.clip.end) v.currentTime = f.clip.start; });
          th.appendChild(v);
        }
        v.play().catch(() => {});
      });
      card.addEventListener("mouseleave", () => { if (v) v.pause(); });
    }
  });

  /* modal */
  const dlg = $("#modal");
  let cur = null, curSrc = null;
  function setVideo(f, src, clip) {
    const box = $("#m-vid");
    box.innerHTML = "";
    const v = document.createElement("video");
    Object.assign(v, { controls: true, playsInline: true, autoplay: true, muted: !f.sound, loop: !clip, preload: "auto" });
    v.setAttribute("playsinline", "");
    v.poster = media(clip ? posterOf(f) : src === srcOf(f) ? posterOf(f) : src, "jpg");
    v.src = media(src, "mp4") + (clip ? `#t=${clip.start},${clip.end}` : "");
    if (clip) v.addEventListener("timeupdate", () => { if (v.currentTime >= clip.end || v.currentTime < clip.start - 0.5) v.currentTime = clip.start; });
    box.appendChild(v);
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    curSrc = src;
  }
  function openModal(id) {
    const f = D.formats.find((x) => x.id === id);
    cur = f;
    $(".mwrap").classList.toggle("tall", f.aspect === "9:16");
    setVideo(f, srcOf(f), f.clip);
    $("#m-tags").innerHTML = `<span class="tag">${f.aspect}</span><span class="tag">${esc(f.length)}</span>${f.sound ? '<span class="tag">Sound on</span>' : ""}`;
    $("#m-name").textContent = f.name;
    $("#m-line").textContent = f.line;
    $("#m-good").textContent = f.good;
    $("#m-bring").textContent = f.bring;
    $("#m-note").hidden = !f.note;
    $("#m-note").textContent = f.note || "";
    const sb = $("#m-save"); sb.dataset.save = f.id; sb.dataset.name = f.name;
    const ex = $("#m-extra");
    ex.hidden = !f.extra;
    if (f.extra) { ex.textContent = "▶ " + f.extra.label; ex.setAttribute("aria-pressed", "false"); }
    syncSaves();
    if (!dlg.open) { dlg.showModal(); document.body.style.overflow = "hidden"; }
    history.replaceState(null, "", "#format-" + f.id);
  }
  function closeModal() {
    $("#m-vid").innerHTML = "";
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener("close", () => {
    if (dlg.open) return;   // reopened before this event fired
    $("#m-vid").innerHTML = ""; document.body.style.overflow = ""; history.replaceState(null, "", "#formats");
  });
  $("#m-close").onclick = closeModal;
  dlg.addEventListener("click", (e) => { if (e.target === dlg) closeModal(); });
  $("#m-save").onclick = () => toggleSave(cur.id);
  $("#m-copy").onclick = () => copy(brief([cur]), "Brief copied");
  $("#m-extra").onclick = () => {
    const on = curSrc === cur.extra.src;
    setVideo(cur, on ? srcOf(cur) : cur.extra.src, on ? cur.clip : null);
    $("#m-extra").textContent = on ? "▶ " + cur.extra.label : "◀ Back to the main example";
    $("#m-extra").setAttribute("aria-pressed", String(!on));
  };
  const visible = () => D.formats.filter(matches);
  function step(d) { const L = visible().length ? visible() : D.formats; const i = L.findIndex((x) => x.id === cur.id); openModal(L[(i + d + L.length) % L.length].id); }
  $("#m-prev").onclick = () => step(-1);
  $("#m-next").onclick = () => step(1);
  dlg.addEventListener("keydown", (e) => {
    if (e.target.closest("video, input, select")) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  /* tray */
  $("#tray-copy").onclick = () => copy(brief(D.formats.filter((f) => isSaved(f.id))), "Shortlist brief copied");
  $("#tray-clear").onclick = () => { saved.clear(); store.set("saved", []); syncSaves(); };

  /* effects reels */
  const fxv = $("#fxvideo"), fxl = $("#fxlist"), fxq = $("#fxq");
  let reel = null, curFx = -1;
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const nice = (s) => (s.charAt(0) + s.slice(1).toLowerCase()).replace(/\b(l3|ui|cta|url|ai)\b/g, (m) => m.toUpperCase()).replace(/b&w/g, "B&W");
  $("#etabs").innerHTML = D.effects.map((e) => `<button class="tab" role="tab" data-id="${e.id}" aria-selected="false">${esc(e.title)} · ${e.list.length}</button>`).join("");
  $("#etabs").querySelectorAll(".tab").forEach((b) => (b.onclick = () => pickReel(b.dataset.id)));
  function renderList() {
    const q = fxq.value.trim().toLowerCase();
    const rows = reel.list.filter((x) => !q || x.name.toLowerCase().includes(q));
    fxl.innerHTML = rows.length
      ? rows.map((x) => `<li><button data-t="${x.t}" data-n="${x.n}"><span class="n">${String(x.n).padStart(2, "0")}</span><span>${esc(nice(x.name))}</span><span class="t">${fmt(x.t)}</span></button></li>`).join("")
      : `<li class="empty">No effect matches "${esc(q)}".</li>`;
    fxl.querySelectorAll("button").forEach((b) => (b.onclick = () => { fxv.currentTime = +b.dataset.t + 0.05; fxv.play().catch(() => {}); }));
    curFx = -1; markFx();
  }
  function markFx() {
    if (!reel) return;
    const t = fxv.currentTime;
    let k = -1;
    reel.list.forEach((x, i) => { if (t >= x.t - 0.02) k = i; });
    if (k === curFx) return;
    curFx = k;
    fxl.querySelectorAll("button").forEach((b) => b.classList.toggle("cur", k >= 0 && +b.dataset.n === reel.list[k].n));
    const c = fxl.querySelector("button.cur");
    if (c && !fxv.paused) { const top = c.offsetTop - fxl.offsetTop; if (top < fxl.scrollTop || top > fxl.scrollTop + fxl.clientHeight - 40) fxl.scrollTo({ top: top - 60, behavior: "smooth" }); }
  }
  function pickReel(id) {
    reel = D.effects.find((e) => e.id === id);
    $("#etabs").querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.id === id));
    $(".fx").classList.toggle("tall", reel.aspect === "9:16");
    fxv.poster = media(reel.src, "jpg");
    fxv.src = media(reel.src, "mp4");
    renderList();
  }
  fxv.addEventListener("timeupdate", markFx);
  fxq.addEventListener("input", renderList);
  pickReel(D.effects[0].id);

  /* deep link: #format-<id> */
  syncSaves();
  const m = location.hash.match(/^#format-(.+)$/);
  if (m && D.formats.some((f) => f.id === m[1])) openModal(m[1]);

  window.EB = { toast, store };
})();
