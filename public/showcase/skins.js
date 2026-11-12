/* Earlibird Video Styles: live skin previews. The same 6 s of footage and words in every skin, drawn in HTML/CSS
   with GSAP. Skin tokens come from data.js (window.SHOWCASE.skins). */
(function () {
  const BR = window.BRAND || {};
  const hexA = (h, a) => { const n = parseInt(h.replace("#", ""), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  // brand.js recolorSkins: swap the skins' yellow for the brand accent
  const SK = window.SHOWCASE.skins.map((s) => {
    if (!BR.recolorSkins || !BR.accent) return s;
    const y = /#F3D053/gi, c = JSON.parse(JSON.stringify(s));
    c.ink.accent = BR.accent; if (/#F3D053/i.test(c.ring)) c.ring = BR.accent;
    for (const k of ["highlight", "card_bg", "card_border", "bg"]) if (typeof c.stage[k] === "string") c.stage[k] = c.stage[k].replace(y, BR.accent).replace(/rgba\(243,208,83,([.\d]+)\)/g, (_, a) => hexA(BR.accent, a));
    if (typeof c.ink.rim === "string") c.ink.rim = c.ink.rim.replace(/rgba\(243,208,83,([.\d]+)\)/g, (_, a) => hexA(BR.accent, a));
    return c;
  });
  const store = window.EB.store;
  const A = "media/skins/";
  const FONTS = ["Poppins", "Inter Tight", "Helvetica Neue", "Montserrat", "Space Grotesk", "Instrument Serif", "Anton"];
  // Safari can't play transparent WebM, so the "word behind the head" layer is skipped there.
  const alphaOK = !/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent) && document.createElement("video").canPlayType('video/webm; codecs="vp9"') !== "";
  // spoken words on the footage: [word, start s, key?]
  const W = [["down", .31], ["or", .52], ["heads", .63], ["down,", 1.04], ["I", 1.17], ["should", 1.21], ["say,", 1.47], ["simply", 1.79], ["getting", 2.09], ["stuff", 2.52], ["done", 2.83, 1],
    ["that", 3.08], ["needs", 3.31], ["to", 3.62], ["get", 3.87], ["done.", 3.96, 1], ["And", 4.36], ["all", 4.80], ["this", 4.96], ["time,", 5.37]];
  const CH = [[0, 4], [4, 7], [7, 11], [11, 14], [14, 16], [16, 20]];
  const P = [["Every", .0], ["new", .18], ["enquiry", .36], ["gets", .8], ["a", .92], ["reply", 1.0], ["before", 1.5], ["they", 1.72], ["call", 1.9], ["your", 2.1], ["competitor.", 2.28, 1],
    ["Here's", 3.4], ["the", 3.6], ["real", 3.7, 1], ["pipeline.", 3.95], ["Thirty-eight", 4.9], ["booked", 5.4, 1], ["calls.", 5.75]];
  const PC = [[0, 6], [6, 11], [11, 15], [15, 18]];
  let clocks = [], stageTL = null;

  const fontsOf = (s) => Object.assign({}, s.fonts, store.get("fonts-" + s.id, {}));
  function vars(el, s) {
    const f = fontsOf(s), i = s.ink, g = s.stage;
    const v = { "--bg": i.bg, "--raise": i.raise, "--text": i.text, "--dim": i.dim, "--acc": i.accent, "--acc-text": i.accent_text, "--glass": i.glass, "--rim": i.rim,
      "--fh": `"${f.head}"`, "--fhw": s.fonts.head_weight, "--fhc": s.fonts.head_case, "--fs": `"${f.serif}"`, "--fc": `"${f.caption}"`, "--fcw": s.fonts.caption_weight, "--fm": `"${s.fonts.mono}"`,
      "--capy": s.caption.y_pct + "%", "--sbg": g.bg, "--stext": g.text, "--sdim": g.dim, "--shl": g.highlight, "--scard": g.card_bg, "--scardt": g.card_text, "--scardb": g.card_border, "--scards": g.card_shadow, "--ring": s.ring };
    for (const k in v) el.style.setProperty(k, v[k]);
  }
  const words = (t) => t.split(" ").map((w) => `<span class="w">${w}</span>`).join(" ");
  function phoneHTML(s, cut) {
    const bw = s.big_word.font !== "none" && cut && alphaOK;
    return `<video class="bg" src="${A}chris-bg.mp4" muted playsinline loop autoplay></video>
      ${bw ? `<div class="L"><div class="big">done${s.period ? '<span class="p">.</span>' : ""}</div></div><video class="fg" src="${A}chris-fg.webm" muted playsinline loop autoplay></video>` : ""}
      <div class="L"><div class="scrim"></div><div class="mk">${BR.skinKicker || BR.name || ""}</div>
       <div class="hl"><div class="l1">${words("Heads down,")}</div><div class="l2w"><div class="l2"><span class="mark"><b></b>${words("getting it done")}</span>${s.period ? '<span class="dot">.</span>' : ""}</div></div></div>
       <div class="stat"><span class="lab">Hours back a week</span><span class="n">0</span><span class="u">hrs</span></div>
       <div class="cap"></div></div>`;
  }
  function makePhone(s, cut) {
    const el = document.createElement("div");
    el.className = `phone cap-${s.caption.mode} hl-${s.headline.mode} card-${s.card.mode} big-${s.big_word.font}`;
    vars(el, s); el.innerHTML = phoneHTML(s, cut); return el;
  }
  function phoneTL(root, s) {
    const q = (x) => root.querySelector(x), qa = (x) => root.querySelectorAll(x); const tl = gsap.timeline({ paused: true });
    const hl = q(".hl"), l1 = q(".l1"), l2 = q(".l2"), st = q(".stat"), big = q(".big"), mb = q(".mark b"), n = q(".stat .n"), mode = s.headline.mode;
    gsap.set([hl, st], { opacity: 0 }); if (big) gsap.set(big, { opacity: 0 });
    if (big) tl.fromTo(big, { opacity: 0, scale: 1.18, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: .2, ease: "power3.out" }, 2.83).to(big, { opacity: 0, filter: "blur(8px)", duration: .2, ease: "power2.in" }, 3.8);
    tl.set(hl, { opacity: 1 }, 3.96);
    if (mode === "stack") tl.fromTo(l1, { x: "8cqw", y: "100cqw", scale: .32, rotation: -3, filter: "blur(4px)" }, { x: 0, y: 0, scale: 1, rotation: 0, filter: "blur(0px)", duration: .2, ease: "power3.out" }, 3.96).fromTo(l2, { yPercent: 110 }, { yPercent: 0, duration: .14, ease: "power3.out" }, 4.09);
    else if (mode === "sticker") tl.fromTo(l1, { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: .18, ease: "back.out(2)" }, 3.96).fromTo(q(".mark"), { scale: .3, rotation: -14, opacity: 0 }, { scale: 1, rotation: -4, opacity: 1, duration: .22, ease: "back.out(2.2)" }, 4.12);
    else if (mode === "plate") tl.fromTo(l1, { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", duration: .14, ease: "power3.out" }, 3.96).fromTo(l2, { yPercent: 110 }, { yPercent: 0, duration: .14, ease: "power3.out" }, 4.1);
    else if (mode === "glass") tl.fromTo(hl, { y: "6cqw", filter: "blur(10px)", opacity: 0 }, { y: 0, filter: "blur(0px)", opacity: 1, duration: .24, ease: "power3.out" }, 3.96);
    else if (mode === "twotone") tl.fromTo(l1, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: .4, ease: "steps(11)" }, 3.96).fromTo(l2, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: .5, ease: "steps(16)" }, 4.38);
    else if (mode === "clean") tl.fromTo(qa(".hl .w"), { opacity: 0, filter: "blur(8px)", y: "2cqw" }, { opacity: 1, filter: "blur(0px)", y: 0, duration: .18, ease: "power3.out", stagger: .07 }, 3.96);
    else if (mode === "chrome") tl.fromTo(l1, { scale: 1.35, filter: "blur(14px)", opacity: 0 }, { scale: 1, filter: "blur(0px)", opacity: 1, duration: .22, ease: "power3.out" }, 3.96).fromTo(l2, { opacity: 0, x: "-4cqw" }, { opacity: 1, x: 0, duration: .18, ease: "power3.out" }, 4.15);
    if (mb) tl.fromTo(mb, { scaleX: 0 }, { scaleX: 1, duration: .24, ease: "power2.out" }, 4.3);
    if (s.card.mode === "sticker") tl.fromTo(st, { opacity: 0, scale: .6, rotation: -10 }, { opacity: 1, scale: 1, rotation: -3, duration: .22, ease: "back.out(2)" }, 4.55);
    else tl.fromTo(st, { opacity: 0, y: "6cqw", filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: .24, ease: "power3.out" }, 4.55);
    tl.fromTo(n, { textContent: 0 }, { textContent: 12, duration: .7, ease: "power2.out", snap: { textContent: 1 } }, 4.6);
    tl.to([st, hl], { opacity: 0, filter: "blur(8px)", duration: .2, ease: "power2.in", stagger: .08 }, 5.7); tl.duration(6); return tl;
  }
  function captioner(el, s, wl, chunks, stage) {
    let ci = -1;
    return (t) => {
      let c = -1; chunks.forEach(([a], i) => { if (t >= wl[a][1] - .06) c = i; }); if (stage && t > 6.9) c = -1;
      if (c !== ci) {
        ci = c; if (c < 0) { el.innerHTML = ""; return; }
        const [a, b] = chunks[c]; let h = '<span class="ts"></span>';
        for (let i = a; i < b; i++) {
          const [w, , k] = wl[i]; let txt = w, dot = "";
          if (s.period && /[.]$/.test(w)) { txt = w.slice(0, -1); dot = '<span class="dot">.</span>'; }
          h += `<span class="w${k ? " key" : ""}" data-i="${i}">${stage && k ? "<b></b>" : ""}${txt}</span>${dot} `;
        }
        el.innerHTML = h.trim();
      }
      if (c < 0) return; let last = null;
      el.querySelectorAll(".w").forEach((sp) => {
        const i = +sp.dataset.i, on = t >= wl[i][1]; sp.classList.toggle("on", on); if (on) last = sp;
        if (stage && wl[i][2]) { const b = sp.querySelector("b"); if (b) b.style.transform = `scaleX(${on ? Math.min(1, (t - wl[i][1]) / .25) : 0})`; }
      });
      el.querySelectorAll(".w").forEach((sp) => sp.classList.toggle("cur", sp === last));
      const ts = el.querySelector(".ts"); if (ts && last) { const st = wl[+last.dataset.i][1] + 8; ts.textContent = `00:${st.toFixed(2).padStart(5, "0")}`; }
    };
  }
  // play only what's on screen (saves battery on phones)
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => {
    e.target.querySelectorAll("video").forEach((v) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()));
  }), { rootMargin: "100px" }) : null;
  function register(root, s) {
    const v = root.querySelector("video.bg"), fg = root.querySelector("video.fg");
    clocks.push({ root, v, fg, tl: phoneTL(root, s), cap: captioner(root.querySelector(".cap"), s, W, CH, false) });
    if (io) io.observe(root);
  }
  function loop() {
    for (const c of clocks) {
      if (!c.root.isConnected || c.v.paused) continue; const t = c.v.currentTime; c.tl.seek(t, false); c.cap(t);
      if (c.fg && Math.abs(c.fg.currentTime - t) > .08 && !c.fg.seeking) c.fg.currentTime = t;
    }
    if (stageTL) stageTL.cap(stageTL.tl.time()); requestAnimationFrame(loop);
  }
  function buildOverview() {
    const o = document.getElementById("over"); o.innerHTML = "";
    SK.forEach((s) => {
      const c = document.createElement("button"); c.className = "ocard"; c.dataset.id = s.id; c.setAttribute("aria-label", "Open the " + s.name + " skin");
      const p = makePhone(s, false); c.appendChild(p);
      c.insertAdjacentHTML("beforeend", `<div class="nm">${s.name}</div><div class="ib">${s.best_for}</div>`);
      c.onclick = () => select(s.id, true); o.appendChild(c); register(p, s);
    });
  }
  function stageHTML(s) {
    return `<div class="stage ${s.stage.dark ? "dark" : ""}">
      <div class="s spk"><video src="${A}chris-bg.mp4" muted playsinline loop autoplay></video><div class="ring"></div></div>
      <div class="s pk">Lead responder</div>
      <div class="s ph">Every lead gets a reply in <span class="mark"><b></b>60 seconds</span>${s.period ? '<span class="dot">.</span>' : ""}</div>
      <div class="s win"><div class="bar"><i></i><i></i><i></i></div><img src="${A}screen.png" alt="A sales pipeline board with sample deals"></div>
      <div class="s chip2"><span class="lab">Booked this month</span>+<span class="pn">0</span></div>
      <div class="s note">real pipeline, not a mock-up ↘</div><div class="s pcap"></div></div>
      <p class="stagecap">The same skin as an explainer stage: you morph into a ringed bubble while a real screen, a stat and a handwritten note build around you. Sample data.</p>`;
  }
  function buildStage(s) {
    const d = document.getElementById("dstage"); if (stageTL) { stageTL.tl.kill(); stageTL = null; }
    d.innerHTML = stageHTML(s); const r = d.firstElementChild; vars(r, s);
    if (io) io.observe(r);
    const q = (x) => r.querySelector(x); const pt = gsap.timeline({ repeat: -1, repeatDelay: .2 });
    gsap.set([q(".pk"), q(".ph"), q(".win"), q(".chip2"), q(".note")], { opacity: 0 });
    pt.set(q(".spk"), { left: "50%", top: "0%", width: "50%", height: "100%", borderRadius: "0cqw" }).set(q(".ring"), { opacity: 0 })
      .fromTo(q(".pk"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .18, ease: "power3.out" }, .25)
      .fromTo(q(".ph"), { opacity: 0, y: 18, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: .24, ease: "power3.out" }, .36)
      .fromTo(q(".ph .mark b"), { scaleX: 0 }, { scaleX: 1, duration: .3, ease: "power2.out" }, .9)
      .to(q(".spk"), { left: "4%", top: "66%", width: "17.5%", height: "31%", borderRadius: "50%", duration: .34, ease: "power2.inOut" }, 2.6)
      .to(q(".ring"), { opacity: 1, duration: .15 }, 2.85).to(q(".ph"), { fontSize: "3.2cqw", width: "40%", duration: .34, ease: "power2.inOut" }, 2.6)
      .fromTo(q(".win"), { opacity: 0, y: 40, filter: "blur(12px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: .27, ease: "power3.out" }, 3.0)
      .fromTo(q(".note"), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: .2, ease: "power3.out" }, 3.75)
      .fromTo(q(".chip2"), { opacity: 0, scale: .82, x: -40, y: -30 }, { opacity: 1, scale: 1, x: 0, y: 0, duration: .24, ease: "back.out(1.4)" }, 4.9)
      .fromTo(q(".pn"), { textContent: 0 }, { textContent: 38, duration: .8, ease: "power2.out", snap: { textContent: 1 } }, 4.95)
      .to([q(".chip2"), q(".note"), q(".win"), q(".ph"), q(".pk")], { opacity: 0, filter: "blur(8px)", duration: .2, ease: "power2.in", stagger: .05 }, 7.0)
      .to(q(".spk"), { left: "50%", top: "0%", width: "50%", height: "100%", borderRadius: "0cqw", duration: .34, ease: "power2.inOut" }, 7.25).to(q(".ring"), { opacity: 0, duration: .1 }, 7.25).set({}, {}, 7.8);
    stageTL = { tl: pt, cap: captioner(q(".pcap"), s, P, PC, true) };
  }
  const sw = (c, l) => `<div><span style="background:${c}"></span><small>${l}</small></div>`;
  function buildInfo(s) {
    const f = fontsOf(s), chosen = store.get("skin", "modern") === s.id;
    const opt = (cur, def) => (FONTS.includes(def) ? FONTS : [def, ...FONTS]).map((x) => `<option ${x === cur ? "selected" : ""} value="${x}">${x}${x === def ? " (default)" : ""}</option>`).join("");
    document.getElementById("info").innerHTML = `<h3>${s.name}</h3><div class="ib">Best for: ${s.best_for}</div><p>${s.blurb}</p>
      <p class="pick"><button class="btn sm" id="useskin" ${chosen ? "disabled" : ""}>${chosen ? "✓ In your brief" : "Use this skin in my brief"}</button></p>
      <div class="box"><div class="eyebrow">On footage</div><div class="sw">${sw(s.ink.bg, s.ink.bg + " ground")}${sw(s.ink.raise, s.ink.raise + " plate")}${sw(s.ink.text, "text")}${sw(s.ink.dim, "unspoken")}${sw(s.ink.accent, s.ink.accent + " yellow")}</div>
       <div class="eyebrow" style="margin-top:12px">Explainer stage</div><div class="sw">${sw(s.stage.bg, "stage")}${sw(s.stage.text, "text")}${sw(s.stage.highlight, "highlight")}${sw(s.stage.card_bg, "card")}</div></div>
      <div class="box spec"><div class="eyebrow">Type</div>
       <div class="a" style="font-family:'${f.head}';font-weight:${s.fonts.head_weight};text-transform:${s.fonts.head_case}">Headline</div><div class="b">headlines, numbers, chips · ${f.head}</div>
       <div class="a" style="font-family:'${f.caption}';font-weight:${s.fonts.caption_weight};font-size:22px">Caption, readable at a glance${s.period ? '<span style="color:${s.ink.accent}">.</span>' : ""}</div><div class="b">captions · ${f.caption}</div>
       <div class="a" style="font-family:'${f.serif}';font-style:${/Serif/.test(f.serif) ? "italic" : "normal"}">big words</div><div class="b">big words and punch lines · ${f.serif}</div>
       <div class="fonts"><label>Headline font<select data-k="head">${opt(f.head, s.fonts.head)}</select></label><label>Caption font<select data-k="caption">${opt(f.caption, s.fonts.caption)}</select></label>
        <label>Big-word font<select data-k="serif">${opt(f.serif, s.fonts.serif)}</select></label><label>&nbsp;<button class="tab" id="reset" style="padding:6px 10px">Reset fonts</button></label></div></div>
      <div class="box"><div class="eyebrow">Signatures</div><ul>${s.signatures.map((x) => `<li>${x}</li>`).join("")}</ul><div class="eyebrow" style="margin-top:12px">Motion</div><p style="margin:6px 0 0">${s.motion}</p></div>`;
    document.querySelectorAll("#info select").forEach((sel) => (sel.onchange = () => { const o = store.get("fonts-" + s.id, {}); o[sel.dataset.k] = sel.value; store.set("fonts-" + s.id, o); refreshFonts(s); }));
    document.getElementById("reset").onclick = () => { store.set("fonts-" + s.id, {}); refreshFonts(s); };
    document.getElementById("useskin").onclick = () => { store.set("skin", s.id); buildInfo(s); window.EB.toast(`${s.name} added to your brief`); };
  }
  function refreshFonts(s) { document.querySelectorAll(`.ocard[data-id="${s.id}"] .phone, #dphone .phone, #dstage .stage`).forEach((el) => vars(el, s)); buildInfo(s); }
  function select(id, scroll) {
    const s = SK.find((x) => x.id === id);
    document.querySelectorAll("#tabs .tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.id === id));
    document.querySelectorAll(".ocard").forEach((c) => c.classList.toggle("sel", c.dataset.id === id));
    clocks = clocks.filter((c) => c.root.isConnected && !c.root.closest("#dphone"));
    const d = document.getElementById("dphone"); d.innerHTML = ""; const p = makePhone(s, true); d.appendChild(p); register(p, s);
    buildInfo(s); buildStage(s); if (scroll) document.getElementById("tabs").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  document.getElementById("tabs").innerHTML = SK.map((s) => `<button class="tab" role="tab" data-id="${s.id}" aria-selected="false">${s.name}</button>`).join("");
  document.querySelectorAll("#tabs .tab").forEach((t) => (t.onclick = () => select(t.dataset.id, false)));
  buildOverview();
  const saved = store.get("skin", "modern");
  select(SK.find((s) => s.id === saved) ? saved : "modern", false);
  requestAnimationFrame(loop);
})();
