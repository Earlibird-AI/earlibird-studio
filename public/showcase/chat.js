/* Earlibird Shareable Video Studio — chat widget on the headless chat core.
   Vanilla JS (no build step). Loads the core ES module at runtime after first paint. */
(function () {
  "use strict";

  // --- Config (from connected chat_widget integration) ---
  const CFG = {
    chatWidgetId: "6afd27f7a68c8c5d03aaabe5",
    locationId: "sGgXYawKu1ybZ1Py30sp",
    coreUrl: "https://widgets.leadconnectorhq.com/chat-widget-core/core.esm.js",
    marketplaceUrl: "https://services.leadconnectorhq.com",
    source: "ai-studio-native",
  };

  // --- Copy (site-owned presentation) ---
  const COPY = {
    panelHeading: "Need a video?",
    subHeading: "EARLIBIRD STUDIO",
    teaser: "Tell us what you're after and we'll point you at the right kit.",
    quickReplies: ["See formats", "See brand skins", "See effects", "Start a brief"],
    loadingConfig: "Opening chat…",
    retry: "Try again",
    loadOlder: "Load earlier messages",
    historyLoading: "Loading…",
    connecting: "Connecting…",
    reconnecting: "Reconnecting…",
    offline: "You're offline — messages will send when you're back.",
    composerPlaceholder: "Type a message…",
    sendLabel: "Send",
    attachLabel: "Attach a file",
    formSubmit: "Start chat",
    formSubmitting: "Sending…",
    restart: "Start a new chat",
    unsupported: "This chat type isn't supported here.",
  };

  // --- Helpers ---
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtTime = (t) => {
    if (!t) return "";
    const d = new Date(t);
    return isNaN(d) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const kind = (u) =>
    /\.(mp4|mov|webm)(\?|$)/i.test(u) ? "video" :
    /\.(mp3|m4a|wav|ogg)(\?|$)/i.test(u) ? "audio" :
    /\.(png|jpe?g|gif|webp|heic)(\?|$)/i.test(u) ? "image" : "file";

  // --- Build DOM shell ---
  const root = el("div", "eb-chat-root");
  root.innerHTML = `
    <div id="eb-chat">
      <button class="eb-launch" aria-label="Chat with Earlibird">
        <span class="eb-teaser"><b>${esc(COPY.panelHeading)}</b><span>${esc(COPY.teaser)}</span><span class="eb-x" aria-label="Dismiss">×</span></span>
        <span class="eb-fab" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
        <span class="eb-badge" id="eb-badge"></span>
      </button>
      <div class="eb-panel" role="dialog" aria-modal="false" aria-label="Chat with Earlibird">
        <div class="eb-head">
          <span class="eb-av">E</span>
          <div><h3>${esc(COPY.panelHeading)}</h3><div class="eb-sub">${esc(COPY.subHeading)}</div></div>
          <button class="eb-close" aria-label="Close chat">×</button>
        </div>
        <div class="eb-body">
          <div class="eb-thread" id="eb-thread"></div>
          <div id="eb-cards"></div>
          <div id="eb-compose"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);

  const chatEl = root.querySelector("#eb-chat");
  const launchBtn = root.querySelector(".eb-launch");
  const fab = root.querySelector(".eb-fab");
  const teaser = root.querySelector(".eb-teaser");
  const teaserX = root.querySelector(".eb-teaser .eb-x");
  const closeBtn = root.querySelector(".eb-close");
  const badge = root.querySelector("#eb-badge");
  const thread = root.querySelector("#eb-thread");
  const cardsEl = root.querySelector("#eb-cards");
  const composeEl = root.querySelector("#eb-compose");

  let chat = null;
  let state = {};
  let openIntent = false;
  let dismissedTeaser = false;
  let text = "";
  let formValues = {};
  let formConsent = false;
  let phoneCountry = null;
  let phoneOpen = false;
  let phoneQuery = "";
  let renderedMsgIds = new Set();

  // --- Core loader (cached) ---
  let corePromise = null;
  function loadCore() {
    return (corePromise ||= import(/* @vite-ignore */ CFG.coreUrl));
  }

  // --- Status line ---
  function statusLine() {
    const existing = thread.querySelector(".eb-status");
    if (existing) existing.remove();
    if (state.error && !state.config) return; // handled in cards
    let msg = "";
    if (state.connection === "reconnecting") msg = COPY.reconnecting;
    else if (state.connection === "offline") msg = COPY.offline;
    else if (state.connection === "connecting" && state.messages && state.messages.length) msg = COPY.connecting;
    if (msg) {
      const s = el("div", "eb-status", esc(msg));
      thread.appendChild(s);
    }
  }

  // --- Render messages ---
  function renderMessages() {
    const msgs = state.messages || [];
    // Append new messages
    msgs.forEach((m) => {
      const id = m.id || m.dateAdded + (m.body || "");
      if (renderedMsgIds.has(id)) return;
      renderedMsgIds.add(id);
      appendMessage(m, false);
    });
    // Scroll to bottom if near bottom
    scrollNearBottom();
    statusLine();
  }

  function appendMessage(m, prepend) {
    const wrap = el("div", "eb-msg " + (m.direction || "in"));
    if (m.direction === "system") wrap.classList.add("sys");
    if (m.status === "pending") wrap.classList.add("pending");
    if (m.status === "failed") wrap.classList.add("failed");
    let inner = "";
    if (m.direction !== "system") {
      inner += `<div class="eb-bub">${esc(m.body || "")}</div>`;
      if (m.attachments && m.attachments.length) {
        inner += `<div class="eb-att">${m.attachments.map(renderAtt).join("")}</div>`;
      }
      inner += `<div class="eb-time">${esc(fmtTime(m.dateAdded))}</div>`;
      if (m.status === "failed") inner += `<div class="eb-retry" data-retry>Retry</div>`;
    } else {
      inner = `<div class="eb-bub">${esc(m.body || "")}</div>`;
    }
    wrap.innerHTML = inner;
    if (m.status === "failed") {
      wrap.querySelector("[data-retry]")?.addEventListener("click", () => chat?.retryMessage?.(m.id));
    }
    if (prepend) thread.insertBefore(wrap, thread.firstChild);
    else thread.appendChild(wrap);
  }

  function renderAtt(u) {
    const k = kind(u);
    if (k === "image") return `<img src="${esc(u)}" alt="attachment">`;
    if (k === "video") return `<video src="${esc(u)}" controls></video>`;
    if (k === "audio") return `<audio src="${esc(u)}" controls></audio>`;
    return `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.split("/").pop())}</a>`;
  }

  function scrollNearBottom() {
    const near = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 120;
    if (near) thread.scrollTop = thread.scrollHeight;
  }

  // --- Quick replies ---
  function renderQuickReplies() {
    const existing = thread.querySelector(".eb-quick");
    if (existing) existing.remove();
    const showQuick =
      state.activeChatType === "liveChat" &&
      (state.messages || []).length === 0 &&
      !state.showContactForm &&
      !state.feedbackRequested &&
      !state.feedbackSubmitted &&
      !state.ended;
    if (!showQuick) return;
    const q = el("div", "eb-quick");
    COPY.quickReplies.forEach((r) => {
      const b = el("button", null, esc(r));
      b.addEventListener("click", () => {
        if (chat && state.canSend) {
          chat.sendMessage({ text: r, attachments: [] });
        }
      });
      q.appendChild(b);
    });
    thread.appendChild(q);
  }

  // --- Typing ---
  function renderTyping() {
    const existing = thread.querySelector(".eb-typing");
    if (existing) existing.remove();
    if (state.agentTyping && state.activeChatType === "liveChat") {
      const t = el("div", "eb-typing", "<span></span><span></span><span></span>");
      thread.appendChild(t);
      scrollNearBottom();
    }
  }

  // --- Cards (form / feedback / ended / error / loading) ---
  function renderCards() {
    cardsEl.innerHTML = "";

    // No config yet
    if (!state.config) {
      if (state.error) {
        const c = el("div", "eb-card");
        c.innerHTML = `<p>${esc(state.error.message || "Chat couldn't open.")}</p><button class="eb-btn">${esc(COPY.retry)}</button>`;
        c.querySelector(".eb-btn").addEventListener("click", () => { chat?.open?.(); });
        cardsEl.appendChild(c);
      } else {
        const c = el("div", "eb-card");
        c.innerHTML = `<p>${esc(COPY.loadingConfig)}</p>`;
        cardsEl.appendChild(c);
      }
      composeEl.innerHTML = "";
      return;
    }

    // Chat type selection
    if (state.awaitingChatTypeSelection) {
      const c = el("div", "eb-card");
      c.innerHTML = `<h4>How would you like to chat?</h4>
        <div class="eb-thumbs" style="flex-direction:column">
          <button data-type="liveChat">Live Chat</button>
          <button data-type="emailChat">SMS / Email</button>
        </div>`;
      c.querySelectorAll("button").forEach((b) => {
        b.addEventListener("click", () => chat?.setActiveChatType?.(b.dataset.type));
      });
      cardsEl.appendChild(c);
      composeEl.innerHTML = "";
      return;
    }

    // Email chat
    if (state.activeChatType === "emailChat") {
      if (state.contactFormSubmitted) {
        const c = el("div", "eb-card");
        c.innerHTML = `<h4>Thanks!</h4><p>We've got your details and will be in touch.</p>`;
        cardsEl.appendChild(c);
      } else if (state.showContactForm || state.config.contactForm?.enabled) {
        renderContactForm();
      }
      composeEl.innerHTML = "";
      return;
    }

    // Live chat
    if (state.activeChatType === "liveChat") {
      let cardShown = false;
      if (state.showContactForm) { renderContactForm(); cardShown = true; }
      else if (state.feedbackRequested) { renderFeedback(); cardShown = true; }
      else if (state.feedbackSubmitted) { renderFeedbackDone(); cardShown = true; }
      else if (state.ended) { renderEnded(); cardShown = true; }

      if (!cardShown) renderComposer();
      else composeEl.innerHTML = "";
      return;
    }

    // Unsupported
    const c = el("div", "eb-card");
    c.innerHTML = `<p>${esc(COPY.unsupported)}</p>`;
    cardsEl.appendChild(c);
    composeEl.innerHTML = "";
  }

  // --- Contact form ---
  function renderContactForm() {
    const fields = state.config.contactForm?.fields || [];
    const comp = state.config.compliance || {};
    const c = el("div", "eb-card");
    const form = el("form", "eb-form");
    form.innerHTML = `<h4>Before we start</h4>`;

    fields.forEach((f) => {
      const val = formValues[f.value] ?? "";
      const wrap = el("div", "eb-field");
      wrap.innerHTML = `<label>${esc(f.label || f.value)}${f.required ? " *" : ""}</label>`;
      if (f.dataType === "PHONE") {
        const dial = phoneCountry ? `+${countryDial(phoneCountry)}` : "+1";
        const pw = el("div", "eb-phone");
        pw.innerHTML = `
          <button type="button" class="eb-dial" data-dial>${esc(dial)}</button>
          <input type="tel" name="${esc(f.value)}" placeholder="${esc(f.placeholder || "")}" ${f.required ? "required" : ""} value="${esc(val)}">`;
        wrap.appendChild(pw);
      } else if (f.dataType === "TEXTAREA") {
        wrap.innerHTML += `<textarea name="${esc(f.value)}" placeholder="${esc(f.placeholder || "")}" ${f.required ? "required" : ""}>${esc(val)}</textarea>`;
      } else if (f.dataType === "EMAIL") {
        wrap.innerHTML += `<input type="email" name="${esc(f.value)}" placeholder="${esc(f.placeholder || "")}" ${f.required ? "required" : ""} value="${esc(val)}">`;
      } else {
        wrap.innerHTML += `<input type="text" name="${esc(f.value)}" placeholder="${esc(f.placeholder || "")}" ${f.required ? "required" : ""} value="${esc(val)}">`;
      }
      form.appendChild(wrap);
    });

    // Consent
    if (comp.showConsentCheckbox) {
      const cons = el("div", "eb-consent");
      cons.innerHTML = `<input type="checkbox" ${comp.defaultConsentCheck ? "checked" : ""}><span>${esc(comp.consentText || "")}</span>`;
      const cb = cons.querySelector("input");
      cb.checked = formConsent || !!comp.defaultConsentCheck;
      cb.addEventListener("change", () => (formConsent = cb.checked));
      form.appendChild(cons);
    }

    // Error
    if (state.error && state.error.field) {
      const e = el("div", "eb-err", esc(state.error.message || "Invalid"));
      form.appendChild(e);
    } else if (state.error) {
      const e = el("div", "eb-err", esc(state.error.message || ""));
      form.appendChild(e);
    }

    const btn = el("button", "eb-btn", esc(state.requestState === "in_progress" ? COPY.formSubmitting : COPY.formSubmit));
    btn.type = "submit";
    btn.disabled = state.requestState === "in_progress" || !!state.captchaRequired;
    form.appendChild(btn);

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      submitForm(fields, comp);
    });

    // Phone country picker
    const dialBtn = form.querySelector("[data-dial]");
    if (dialBtn) dialBtn.addEventListener("click", (ev) => { ev.preventDefault(); toggleCountryPicker(c, dialBtn); });

    c.appendChild(form);
    cardsEl.appendChild(c);

    // Wire inputs
    form.querySelectorAll("input,textarea").forEach((inp) => {
      if (inp.type === "checkbox") return;
      inp.addEventListener("input", (ev) => {
        const name = inp.getAttribute("name");
        if (inp.type === "tel") {
          const p = parsePhone(inp.value, phoneCountry || "US");
          formValues[name] = p && p.isValid() ? p.number : inp.value;
        } else {
          formValues[name] = inp.value;
        }
      });
    });
  }

  function submitForm(fields, comp) {
    // Validate required
    const missing = [];
    fields.forEach((f) => {
      if (f.required && !(formValues[f.value] || "").toString().trim()) missing.push(f.label || f.value);
    });
    if (missing.length) {
      const c = cardsEl.querySelector(".eb-card");
      let e = c.querySelector(".eb-err");
      if (!e) { e = el("div", "eb-err"); c.querySelector("form").appendChild(e); }
      e.textContent = "Please fill in: " + missing.join(", ");
      return;
    }
    if (comp.consentRequired && !formConsent) {
      const c = cardsEl.querySelector(".eb-card");
      let e = c.querySelector(".eb-err");
      if (!e) { e = el("div", "eb-err"); c.querySelector("form").appendChild(e); }
      e.textContent = "Please accept to continue.";
      return;
    }
    const payload = {};
    fields.forEach((f) => (payload[f.value] = formValues[f.value] ?? ""));
    payload.consentGiven = !!formConsent;
    chat?.submitContactForm?.(payload);
  }

  // --- Feedback ---
  function renderFeedback() {
    const fm = state.config?.liveChat?.feedbackMessage || "How did we do?";
    const c = el("div", "eb-card");
    c.innerHTML = `<h4>${esc(fm)}</h4><div class="eb-thumbs">
      <button data-fb="positive">👍 Good</button><button data-fb="negative">👎 Bad</button></div>`;
    c.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => chat?.sendFeedback?.(b.dataset.fb))
    );
    cardsEl.appendChild(c);
  }

  function renderFeedbackDone() {
    const note = state.config?.liveChat?.feedbackNote || "Thanks for the feedback!";
    const c = el("div", "eb-card");
    c.innerHTML = `<p>${esc(note)}</p><button class="eb-btn">${esc(COPY.restart)}</button>`;
    c.querySelector(".eb-btn").addEventListener("click", () => chat?.restartConversation?.());
    cardsEl.appendChild(c);
  }

  function renderEnded() {
    const c = el("div", "eb-card");
    c.innerHTML = `<button class="eb-btn">${esc(COPY.restart)}</button>`;
    c.querySelector(".eb-btn").addEventListener("click", () => chat?.restartConversation?.());
    cardsEl.appendChild(c);
  }

  // --- Composer ---
  function renderComposer() {
    composeEl.innerHTML = "";
    const atts = state.config?.liveChat?.attachments || {};
    const uploading = (state.attachments || []).some((a) => a.status === "uploading");
    const ready = (state.attachments || []).filter((a) => a.status === "uploaded").map((a) => a.url);
    const canSend = state.canSend && !uploading && !state.captchaRequired && (text.trim() || ready.length);

    // Attachment chips
    const chips = el("div", "eb-chips");
    (state.attachments || []).forEach((a) => {
      const chip = el("div", "eb-chip" + (a.status === "failed" ? " fail" : ""));
      let inner = `<span>${esc(a.name || "file")}</span>`;
      if (a.status === "uploading") inner += `<span class="eb-prog"><i style="width:${Math.round((a.progress || 0) * 100)}%"></i></span>`;
      if (a.status === "failed") inner += `<span>${esc(a.error || "failed")}</span>`;
      inner += `<span class="eb-rm" data-rm="${esc(a.id)}">×</span>`;
      chip.innerHTML = inner;
      chip.querySelector("[data-rm]")?.addEventListener("click", () => chat?.removeAttachment?.(a.id));
      chips.appendChild(chip);
    });
    composeEl.appendChild(chips);

    const row = el("div", "eb-compose");
    let inner = "";
    if (atts.enabled) {
      inner += `<button class="eb-clip" aria-label="${esc(COPY.attachLabel)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>`;
    }
    inner += `<textarea rows="1" placeholder="${esc(COPY.composerPlaceholder)}">${esc(text)}</textarea>`;
    inner += `<button class="eb-send" ${canSend ? "" : "disabled"} aria-label="${esc(COPY.sendLabel)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>`;
    row.innerHTML = inner;
    composeEl.appendChild(row);

    const ta = row.querySelector("textarea");
    const sendBtn = row.querySelector(".eb-send");
    ta.addEventListener("input", () => {
      text = ta.value;
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    });
    ta.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        doSend();
      }
    });
    sendBtn.addEventListener("click", doSend);

    if (atts.enabled) {
      const clip = row.querySelector(".eb-clip");
      const fileInput = el("input");
      fileInput.type = "file";
      fileInput.multiple = (atts.maxFiles || 1) > 1;
      if (atts.acceptedTypes) fileInput.accept = atts.acceptedTypes;
      fileInput.style.display = "none";
      composeEl.appendChild(fileInput);
      clip.addEventListener("click", () => fileInput.click());
      fileInput.addEventListener("change", () => {
        Array.from(fileInput.files || []).forEach((f) => chat?.uploadAttachment?.(f));
        fileInput.value = "";
      });
    }
  }

  function doSend() {
    const atts = state.config?.liveChat?.attachments || {};
    const uploading = (state.attachments || []).some((a) => a.status === "uploading");
    const ready = (state.attachments || []).filter((a) => a.status === "uploaded").map((a) => a.url);
    if (state.canSend && !uploading && (text.trim() || ready.length)) {
      const payload = { text: text, attachments: ready };
      text = "";
      const ta = composeEl.querySelector("textarea");
      if (ta) ta.value = "";
      chat?.sendMessage?.(payload);
    }
  }

  // --- History load older ---
  function renderHistoryControl() {
    const existing = thread.querySelector(".eb-loadold");
    if (existing) existing.remove();
    if (state.hasMoreHistory && state.activeChatType === "liveChat") {
      const l = el("div", "eb-loadold");
      l.innerHTML = `<button>${esc(state.historyLoading ? COPY.historyLoading : COPY.loadOlder)}</button>`;
      l.querySelector("button").addEventListener("click", () => {
        const prevH = thread.scrollHeight;
        chat?.loadOlderMessages?.();
        // preserve scroll after prepend
        setTimeout(() => { thread.scrollTop += thread.scrollHeight - prevH; }, 50);
      });
      thread.insertBefore(l, thread.firstChild);
    }
  }

  // --- Badge ---
  function renderBadge() {
    const n = state.unreadCount || 0;
    if (n > 0 && !chatEl.classList.contains("open")) {
      badge.textContent = n;
      badge.style.display = "block";
    } else {
      badge.style.display = "none";
    }
  }

  // --- Main render ---
  function render() {
    renderHistoryControl();
    renderMessages();
    renderTyping();
    renderQuickReplies();
    renderCards();
    renderBadge();
  }

  // --- Open / close ---
  function openPanel() {
    openIntent = true;
    chatEl.classList.add("open");
    if (chat) {
      chat.setPanelOpen(true);
      chat.open();
    }
    setTimeout(() => scrollNearBottom(), 50);
  }
  function closePanel() {
    chatEl.classList.remove("open");
    if (chat) chat.setPanelOpen(false);
  }

  launchBtn.addEventListener("click", (e) => {
    if (e.target === teaserX) { e.preventDefault(); dismissedTeaser = true; chatEl.classList.remove("show-teaser"); return; }
    if (chatEl.classList.contains("open")) closePanel();
    else openPanel();
  });
  closeBtn.addEventListener("click", closePanel);

  // Show teaser after a delay
  setTimeout(() => {
    if (!chatEl.classList.contains("open") && !dismissedTeaser) chatEl.classList.add("show-teaser");
  }, 3500);

  // --- Init core after first paint ---
  let unsub = null;
  async function init() {
    try {
      const core = await loadCore();
      const createChatClient = core.createChatClient || core.default?.createChatClient;
      chat = createChatClient({
        locationId: CFG.locationId,
        widgetId: CFG.chatWidgetId,
        marketplaceUrl: CFG.marketplaceUrl,
        source: CFG.source,
      });
      // captcha anchor = panel root
      chat.setCaptchaAnchor?.(chatEl.querySelector(".eb-panel"));
      unsub = chat.subscribe((s) => {
        state = s || {};
        // follow detected country for phone default
        if (state.detectedCountry && !phoneCountry) phoneCountry = state.detectedCountry;
        render();
      });
      if (openIntent) {
        chat.setPanelOpen(true);
        chat.open();
      }
    } catch (err) {
      console.error("[eb-chat] init failed", err);
      state = { error: { message: "Chat couldn't load. Please try again." } };
      render();
    }
  }

  // Prefetch on idle / hover
  if ("requestIdleCallback" in window) requestIdleCallback(() => loadCore());
  else setTimeout(() => loadCore(), 2000);
  launchBtn.addEventListener("mouseenter", () => loadCore(), { once: true });

  // Start after first paint
  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });

  // --- Minimal phone helpers (no external dep; core re-validates) ---
  // We only do a light E.164 lift; the core does the real validation.
  function parsePhone(input, country) {
    if (!input) return null;
    const digits = input.replace(/[^\d+]/g, "");
    let d = digits.replace(/^\+/, "");
    // crude: if country code not present, prepend
    const cc = countryDial(country);
    if (!d.startsWith(cc) && !digits.startsWith("+")) d = cc + d;
    return { number: "+" + d, isValid: () => d.length >= 7 && d.length <= 15 };
  }
  function countryDial(c) {
    const map = { US: "1", GB: "44", CA: "1", AU: "61", IN: "91", DE: "49", FR: "33", ES: "34", IT: "39", NL: "31", BR: "55", MX: "52", JP: "81", ZA: "27" };
    return map[c] || "1";
  }
  function toggleCountryPicker(card, dialBtn) {
    phoneOpen = !phoneOpen;
    if (!phoneOpen) { card.querySelector(".eb-countries")?.remove(); return; }
    const list = el("div", "eb-countries");
    list.innerHTML = `<input placeholder="Search" value="${esc(phoneQuery)}">`;
    const opts = el("div");
    const all = Object.keys({ US: 1, GB: 44, CA: 1, AU: 61, IN: 91, DE: 49, FR: 33, ES: 34, IT: 39, NL: 31, BR: 55, MX: 52, JP: 81, ZA: 27 });
    const filtered = all.filter((c) => c.toLowerCase().includes(phoneQuery.toLowerCase()));
    filtered.forEach((c) => {
      const o = el("div", "eb-co" + (c === phoneCountry ? " sel" : ""));
      o.innerHTML = `<span>${esc(c)}</span><span>+${countryDial(c)}</span>`;
      o.addEventListener("click", () => {
        phoneCountry = c;
        phoneOpen = false;
        list.remove();
        dialBtn.textContent = "+" + countryDial(c);
      });
      opts.appendChild(o);
    });
    list.appendChild(opts);
    const search = list.querySelector("input");
    search.addEventListener("input", () => {
      phoneQuery = search.value;
      toggleCountryPicker(card, dialBtn);
      toggleCountryPicker(card, dialBtn);
    });
    card.appendChild(list);
    search.focus();
  }
})();
