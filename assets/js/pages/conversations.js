// Livinkey Admin · Conversations
// Responsive WhatsApp-style inbox. Everything we send (OTPs, bills, reminders, replies) and
// everything contacts write to our WhatsApp number shows up here with delivery ticks.

document.addEventListener("DOMContentLoaded", () => {
  renderLayout("conversations", "Conversations", "WhatsApp, SMS & email inbox");

  const $ = (id) => document.getElementById(id);
  const el = { cv: $("cv"), items: $("cvItems"), chips: $("cvChips"), search: $("cvSearch"), empty: $("cvEmpty"), active: $("cvActive"),
    av: $("cvAv"), name: $("cvName"), sub: $("cvSub"), banner: $("cvBanner"), msgs: $("cvMsgs"), input: $("cvInput"), send: $("cvSend"),
    route: $("cvRoute"), jump: $("cvJump"), jumpN: $("cvJumpN"), quickBtn: $("cvQuickBtn"), quick: $("cvQuick"), archive: $("cvArchive") };

  const FILTERS = [["all", "All"], ["unread", "Unread"], ["tenant", "Tenants"], ["guest", "Guests"], ["admin", "Admins"], ["unknown", "Others"]];
  const QUICK = [
    ["Thanks", "Thank you for reaching out! We'll look into this and get back to you shortly."],
    ["Payment received", "We have received your payment. Thank you! Your receipt is available in the Livinkey app."],
    ["Maintenance", "Our maintenance team has been informed and will visit as soon as possible. Please share a convenient time."],
    ["Need details", "Could you please share a few more details (room number and a photo, if possible) so we can help faster?"],
    ["Closing", "Is there anything else we can help you with? Have a great day!"],
  ];
  const PALETTE = ["#4E8F2F", "#2F7FA8", "#8A5FBF", "#C2762B", "#B5475B", "#2E8B84", "#6B7B2A", "#4F5FB5"];
  const TYPE_LABEL = { tenant: "Tenant", guest: "Guest", admin: "Admin" };
  const KIND_LABEL = { bill: "Bill", fine: "Fine", reminder: "Reminder", custom: "Notice", efrro: "e-FRRO", maintenance_forward: "Maintenance" };
  const CH_ICON = { whatsapp: "bi-whatsapp", sms: "bi-chat-left-text", email: "bi-envelope", system: "bi-gear" };
  const CH_NAME = { whatsapp: "WhatsApp", sms: "SMS", email: "Email", system: "System" };

  const state = { list: [], filter: "all", archived: false, search: "", page: 1, pages: 1, unreadTotal: 0, currentId: null, conv: null, msgs: [], win: null, lastSig: "", sending: false, newBelow: 0 };
  let searchTimer = null, listTimer = null, chatTimer = null;

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = (m, t = "danger") => (window.showToast ? window.showToast(m, t) : console.log(m));
  const parseDate = (v) => { if (!v) return null; const d = new Date(typeof v === "string" && !/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v.replace(" ", "T") : v); return isNaN(d) ? null : d; };
  const dispName = (c) => c.name || c.phone || c.email || "Unknown contact";
  const initials = (c) => { const n = dispName(c).replace(/[^\p{L}\p{N} ]/gu, "").trim(); const p = n.split(/\s+/).filter(Boolean); return ((p[0]?.[0] || "?") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };
  const color = (c) => PALETTE[Math.abs([...String(c.id)].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % PALETTE.length];
  const kindOf = (c) => (c.user_id < 0 ? "unknown" : c.user_type);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const hhmm = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const shortTime = (v) => {
    const d = parseDate(v); if (!d) return "";
    const now = new Date(), y = new Date(now.getTime() - 864e5);
    if (sameDay(d, now)) return hhmm(d);
    if (sameDay(d, y)) return "Yesterday";
    if (now - d < 6 * 864e5) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { day: "2-digit", month: "short", year: now.getFullYear() === d.getFullYear() ? undefined : "2-digit" });
  };
  const dayLabel = (d) => { const now = new Date(); if (sameDay(d, now)) return "Today"; if (sameDay(d, new Date(now - 864e5))) return "Yesterday"; return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" }); };

  // WhatsApp-style text: *bold*  _italic_  ~strike~  + safe links
  const fmt = (text) => {
    let h = esc(text);
    h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    h = h.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, "$1<strong>$2</strong>");
    h = h.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");
    h = h.replace(/(^|[\s(])~([^~\n]+)~(?=[\s).,!?:;]|$)/g, "$1<s>$2</s>");
    return h;
  };

  const tick = (m) => {
    const s = m.status;
    if (s === "failed") return '<i class="bi bi-exclamation-circle-fill bad" title="Not delivered"></i>';
    if (s === "read") return '<i class="bi bi-check2-all read" title="Read"></i>';
    if (s === "delivered") return '<i class="bi bi-check2-all" title="Delivered"></i>';
    if (s === "sent") return '<i class="bi bi-check2" title="Sent"></i>';
    return '<i class="bi bi-clock" title="Sending"></i>';
  };
  const statusText = (m) => ({ failed: "Not delivered", read: "Read", delivered: "Delivered", sent: "Sent", queued: "Sending…" }[m.status] || "");

  /* ---------- filter chips ---------- */
  function renderChips() {
    el.chips.innerHTML = FILTERS.map(([k, l]) => {
      const n = k === "unread" && state.unreadTotal ? `<span class="n">${state.unreadTotal}</span>` : "";
      return `<button type="button" class="cv-chip ${state.filter === k && !state.archived ? "active" : ""}" data-f="${k}" role="tab">${l}${n}</button>`;
    }).join("") + `<button type="button" class="cv-chip ${state.archived ? "active" : ""}" data-f="archived" role="tab"><i class="bi bi-archive"></i> Archived</button>`;
  }
  el.chips.addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    if (b.dataset.f === "archived") { state.archived = !state.archived; } else { state.archived = false; state.filter = b.dataset.f; }
    renderChips(); loadList(true);
  });

  /* ---------- list ---------- */
  function skeleton() { el.items.innerHTML = '<div class="cv-skel"></div>'.repeat(5); }

  async function loadList(reset = false, quiet = false) {
    if (reset) { state.page = 1; if (!quiet) skeleton(); }
    try {
      const res = await API.getConversations({ page: state.page, limit: 30, search: state.search, filter: state.filter, archived: state.archived ? 1 : 0 });
      const d = res.data || {};
      const rows = d.conversations || [];
      state.list = state.page > 1 ? state.list.concat(rows) : rows;
      state.pages = d.pagination?.totalPages || 1;
      state.unreadTotal = d.unread_total ?? state.unreadTotal;
      renderChips(); renderList();
    } catch (err) {
      if (!quiet) el.items.innerHTML = `<div class="cv-state"><i class="bi bi-wifi-off"></i>Couldn't load conversations.<br><button class="btn btn-sm btn-outline-secondary mt-2" id="cvRetry">Try again</button></div>`;
      $("cvRetry")?.addEventListener("click", () => loadList(true));
    }
  }

  function renderList() {
    if (!state.list.length) {
      const msg = state.search ? "No conversations match your search." : state.archived ? "No archived conversations." : state.filter === "unread" ? "You're all caught up — nothing unread." : "No conversations yet. Messages we send and receive will appear here.";
      el.items.innerHTML = `<div class="cv-state"><i class="bi bi-chat-square-text"></i>${esc(msg)}</div>`;
      return;
    }
    el.items.innerHTML = state.list.map((c) => {
      const out = c.last_direction === "outbound";
      const isOtp = c.last_type === "otp";
      const prevText = isOtp ? "Verification code sent" : (c.last_message || "").replace(/[*_~]/g, "").replace(/\s+/g, " ").trim() || (c.last_type === "media" ? "Attachment" : "");
      const kind = kindOf(c);
      return `<button type="button" class="cv-item ${c.id === state.currentId ? "active" : ""} ${c.unread_count > 0 ? "unread" : ""}" data-id="${c.id}">
        <span class="cv-av" style="background:${color(c)}">${esc(initials(c))}</span>
        <span class="cv-main">
          <span class="cv-row"><span class="cv-name">${esc(dispName(c))}</span><span class="cv-time">${esc(shortTime(c.last_message_at))}</span></span>
          <span class="cv-row"><span class="cv-prev">${out ? tick({ status: c.last_status }) : ""}<span class="t">${out ? "You: " : ""}${esc(prevText)}</span></span>
            ${c.unread_count > 0 ? `<span class="cv-badge">${c.unread_count > 99 ? "99+" : c.unread_count}</span>` : `<span class="cv-tag">${esc(kind === "unknown" ? "New" : TYPE_LABEL[kind] || kind)}</span>`}</span>
        </span></button>`;
    }).join("") + (state.page < state.pages ? '<button class="btn btn-sm btn-outline-secondary cv-more" id="cvMore">Load more</button>' : "");
  }
  el.items.addEventListener("click", (e) => {
    if (e.target.closest("#cvMore")) { state.page++; loadList(false); return; }
    const it = e.target.closest("[data-id]"); if (it) openConversation(Number(it.dataset.id));
  });
  el.search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.search = el.search.value.trim(); loadList(true); }, 300); });
  $("cvRefresh")?.addEventListener("click", () => { loadList(true); if (state.currentId) loadChat(true); });

  /* ---------- chat ---------- */
  async function openConversation(id) {
    state.currentId = id; state.lastSig = ""; state.newBelow = 0;
    el.cv.classList.add("chat-open");
    el.empty.style.display = "none"; el.active.style.display = "flex";
    el.msgs.innerHTML = '<div class="cv-state"><i class="bi bi-hourglass-split"></i>Loading messages…</div>';
    history.replaceState(null, "", "#" + id);
    renderList();
    await loadChat(true);
    el.input.focus({ preventScroll: true });
  }

  async function loadChat(forceScroll = false) {
    const id = state.currentId; if (!id) return;
    try {
      const res = await API.getConversation(id);
      if (id !== state.currentId) return;
      const d = res.data || {};
      state.conv = d.conversation; state.msgs = d.messages || []; state.win = d.whatsapp_window;
      const sig = state.msgs.map((m) => m.id + m.status + m.channel).join(",") + (state.win?.open ? "o" : "c");
      if (sig === state.lastSig && !forceScroll) return;
      const grew = state.msgs.length > (state.lastCount || 0);
      state.lastSig = sig; state.lastCount = state.msgs.length;
      renderHead(); renderBanner(); renderMessages(forceScroll, grew);
      const row = state.list.find((c) => c.id === id);
      if (row && row.unread_count) { state.unreadTotal = Math.max(0, state.unreadTotal - row.unread_count); row.unread_count = 0; renderChips(); renderList(); }
      refreshBadge();
    } catch (err) {
      if (forceScroll) el.msgs.innerHTML = `<div class="cv-state"><i class="bi bi-wifi-off"></i>Couldn't load this conversation.<br><button class="btn btn-sm btn-outline-secondary mt-2" id="cvRetry2">Try again</button></div>`;
      $("cvRetry2")?.addEventListener("click", () => loadChat(true));
    }
  }

  function refreshBadge() { if (window.refreshConversationBadge) window.refreshConversationBadge(); else API.getConversationUnreadCount?.().then((r) => { const b = document.getElementById("convMenuBadge"); if (b) { const n = r.unreadCount || 0; b.textContent = n > 99 ? "99+" : n; b.style.display = n ? "" : "none"; } }).catch(() => {}); }

  function renderHead() {
    const c = state.conv; if (!c) return;
    el.av.textContent = initials(c); el.av.style.background = color(c);
    el.name.textContent = dispName(c);
    const kind = kindOf(c);
    el.sub.textContent = [kind === "unknown" ? "Not in Livinkey" : TYPE_LABEL[kind], c.phone, c.email].filter(Boolean).join(" · ");
    el.archive.innerHTML = c.is_archived ? '<i class="bi bi-box-arrow-up"></i>' : '<i class="bi bi-archive"></i>';
    el.archive.title = c.is_archived ? "Restore" : "Archive";
  }

  function renderBanner() {
    const w = state.win, c = state.conv;
    let html = "", route = "";
    if (w?.open) {
      const left = Math.max(0, parseDate(w.expires_at) - Date.now()), h = Math.floor(left / 36e5), m = Math.floor((left % 36e5) / 6e4);
      html = `<div class="cv-banner ok"><i class="bi bi-check-circle-fill"></i><div>WhatsApp chat is open for another <b>${h}h ${m}m</b>. Replies are delivered on WhatsApp.</div></div>`;
      route = '<i class="bi bi-whatsapp"></i> Sends on WhatsApp';
    } else {
      const never = !w?.last_inbound_at;
      html = `<div class="cv-banner warn"><i class="bi bi-info-circle-fill"></i><div>${never ? "This contact hasn't messaged us on WhatsApp yet" : "The 24-hour WhatsApp window has closed"}, so WhatsApp may not accept free-form text. Your reply is tried on WhatsApp first, then <b>SMS</b>${c?.email ? ", then <b>email</b>" : ""} automatically.</div></div>`;
      route = `WhatsApp → SMS${c?.email ? " → Email" : ""}`;
    }
    el.banner.innerHTML = html; el.route.innerHTML = route;
  }

  const nearBottom = () => el.msgs.scrollHeight - el.msgs.scrollTop - el.msgs.clientHeight < 140;

  function bubble(m, first, cid) {
    const out = m.direction === "outbound", meta = m.metadata || {};
    const t = parseDate(m.created_at);
    let inner = "";
    if (m.message_type && KIND_LABEL[m.message_type] && out) inner += `<div class="cv-kind"><i class="bi bi-tag-fill"></i>${KIND_LABEL[m.message_type]}</div>`;
    if (m.media_url) {
      const isImg = /^image\//i.test(meta.mediaType || "");
      inner += isImg ? `<img class="cv-img" data-media="${m.id}" alt="Attachment" loading="lazy">` : `<span class="cv-file" data-file="${m.id}"><i class="bi bi-paperclip"></i>Attachment${meta.mediaType ? ` (${esc(meta.mediaType.split("/")[1] || "file")})` : ""}</span>`;
    }
    if (m.message_type === "otp") inner += '<div class="cv-otp"><i class="bi bi-shield-lock-fill"></i>Verification code sent (hidden for security)</div>';
    else if (m.content) inner += `<div class="cv-text">${fmt(m.content)}</div>`;
    const ch = out ? `<i class="bi ${CH_ICON[m.channel] || "bi-chat"}" title="${CH_NAME[m.channel] || ""}"></i>` : "";
    const fell = out && meta.fallbackUsed && m.status !== "failed" ? ` title="WhatsApp was not available, so this went by ${CH_NAME[m.channel]}"` : "";
    inner += `<div class="cv-meta"${fell}>${ch}<span>${t ? hhmm(t) : ""}</span>${out ? tick(m) : ""}</div>`;
    if (out && m.status === "failed") {
      const why = (meta.attempts || []).filter((a) => !a.ok).map((a) => `${CH_NAME[a.channel]}: ${a.error || "failed"}`).join(" · ");
      inner += `<div class="cv-err">Not delivered on any channel${why ? ` — ${esc(why)}` : ""}</div>`;
    }
    return `<div class="cv-b ${out ? "out" : "in"} ${first ? "first" : ""} ${out && m.status === "failed" ? "fail" : ""}" data-mid="${m.id}" aria-label="${out ? "Sent" : "Received"} ${esc(statusText(m))}">${inner}</div>`;
  }

  function renderMessages(forceScroll, grew) {
    const stick = forceScroll || nearBottom();
    if (!state.msgs.length) { el.msgs.innerHTML = '<div class="cv-state"><i class="bi bi-chat-heart"></i>No messages yet. Say hello below.</div>'; return; }
    let html = "", prevDay = null, prevDir = null;
    for (const m of state.msgs) {
      const d = parseDate(m.created_at) || new Date();
      if (!prevDay || !sameDay(prevDay, d)) { html += `<div class="cv-day">${esc(dayLabel(d))}</div>`; prevDir = null; }
      html += bubble(m, prevDir !== m.direction, state.conv?.id);
      prevDay = d; prevDir = m.direction;
    }
    el.msgs.innerHTML = html;
    hydrateMedia();
    if (stick) { el.msgs.scrollTop = el.msgs.scrollHeight; state.newBelow = 0; } else if (grew) state.newBelow++;
    syncJump();
  }

  function syncJump() { el.jump.classList.toggle("show", !nearBottom()); el.jumpN.hidden = !state.newBelow; el.jumpN.textContent = state.newBelow; }
  el.msgs.addEventListener("scroll", () => { if (nearBottom()) state.newBelow = 0; syncJump(); }, { passive: true });
  el.jump.addEventListener("click", () => { el.msgs.scrollTop = el.msgs.scrollHeight; state.newBelow = 0; syncJump(); });

  const blobCache = new Map();
  async function mediaFor(mid) {
    const key = state.currentId + ":" + mid;
    if (!blobCache.has(key)) blobCache.set(key, API.getConversationMediaUrl(state.currentId, mid));
    try { return await blobCache.get(key); } catch (e) { blobCache.delete(key); throw e; }
  }
  function hydrateMedia() {
    el.msgs.querySelectorAll("img[data-media]").forEach(async (img) => {
      try { const r = await mediaFor(img.dataset.media); img.src = r.url; const keep = nearBottom(); img.onload = () => { if (keep) el.msgs.scrollTop = el.msgs.scrollHeight; }; }
      catch { img.replaceWith(Object.assign(document.createElement("span"), { className: "cv-file", innerHTML: '<i class="bi bi-image"></i>Image unavailable' })); }
    });
  }
  el.msgs.addEventListener("click", async (e) => {
    const img = e.target.closest("img[data-media]"); const file = e.target.closest("[data-file]");
    const id = (img || file)?.dataset.media || file?.dataset.file; if (!id) return;
    try { const r = await mediaFor(id); const w = window.open(r.url, "_blank"); if (w) w.opener = null; } catch { toast("Couldn't open the attachment."); }
  });

  /* ---------- composer ---------- */
  const autosize = () => { el.input.style.height = "auto"; el.input.style.height = Math.min(el.input.scrollHeight, 140) + "px"; };
  el.input.addEventListener("input", () => { autosize(); const n = el.input.value.length; $("cvCount").textContent = n > 1200 ? `${n}/1500` : "Enter to send · Shift+Enter for a new line"; });
  el.input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && window.matchMedia("(min-width: 992px)").matches) { e.preventDefault(); send(); } });
  el.send.addEventListener("click", send);

  async function send() {
    const text = el.input.value.trim();
    if (!text || state.sending || !state.currentId) return;
    state.sending = true; el.send.disabled = true;
    const id = state.currentId;
    // optimistic bubble
    const tmp = { id: "tmp", direction: "outbound", channel: "whatsapp", status: "queued", message_type: "text", content: text, created_at: new Date().toISOString(), metadata: {} };
    el.msgs.insertAdjacentHTML("beforeend", bubble(tmp, false)); el.msgs.scrollTop = el.msgs.scrollHeight;
    el.input.value = ""; autosize();
    try {
      const res = await API.replyToConversation(id, text);
      if (res.data?.fallback_used && res.data?.channel) toast(`Sent by ${CH_NAME[res.data.channel]} (WhatsApp wasn't available).`, "info");
      state.lastSig = "";
      await loadChat(true); loadList(true, true);
    } catch (err) {
      el.msgs.querySelector('[data-mid="tmp"]')?.remove();
      el.input.value = text; autosize();
      toast(err?.message || "Couldn't send the message. Please try again.");
    } finally { state.sending = false; el.send.disabled = false; el.input.focus(); }
  }

  el.quick.innerHTML = QUICK.map(([t, b], i) => `<button type="button" data-q="${i}"><b>${esc(t)}</b>${esc(b)}</button>`).join("");
  el.quickBtn.addEventListener("click", (e) => { e.stopPropagation(); el.quick.classList.toggle("show"); });
  el.quick.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (!b) return; el.input.value = QUICK[b.dataset.q][1]; el.quick.classList.remove("show"); autosize(); el.input.focus(); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".cv-quick")) el.quick.classList.remove("show"); });

  /* ---------- archive / back ---------- */
  el.archive.addEventListener("click", async () => {
    const c = state.conv; if (!c) return;
    try { await API.archiveConversation(c.id, !c.is_archived); toast(c.is_archived ? "Conversation restored" : "Conversation archived", "success"); closeChat(); loadList(true); }
    catch (err) { toast(err?.message || "Couldn't update the conversation."); }
  });
  function closeChat() {
    state.currentId = null; state.conv = null; el.cv.classList.remove("chat-open");
    el.active.style.display = "none"; el.empty.style.display = ""; history.replaceState(null, "", location.pathname + location.search); renderList();
  }
  $("cvBack").addEventListener("click", closeChat);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.currentId && !el.quick.classList.contains("show")) closeChat(); });

  /* ---------- live refresh (only while the tab is visible) ---------- */
  function startPolling() {
    stopPolling();
    listTimer = setInterval(() => { if (!document.hidden && state.page === 1) loadList(false, true); }, 20000);
    chatTimer = setInterval(() => { if (!document.hidden && state.currentId && !state.sending) loadChat(false); }, 7000);
  }
  function stopPolling() { clearInterval(listTimer); clearInterval(chatTimer); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { loadList(false, true); if (state.currentId) loadChat(false); } });

  /* ---------- boot ---------- */
  renderChips(); loadList(true).then(() => { const id = Number(location.hash.slice(1)); if (id) openConversation(id); });
  startPolling();
});
