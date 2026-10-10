// Livinkey Admin - Conversations Page
// WhatsApp + Email inbox

document.addEventListener("DOMContentLoaded", () => {
  renderLayout("conversations", "Conversations", "WhatsApp & message inbox");

  let conversations = [];
  let currentId = null;
  let currentMessages = [];
  let searchTimer = null;

  const listBody = document.getElementById("conv-list-body");
  const chatEmpty = document.getElementById("conv-empty");
  const chatActive = document.getElementById("conv-chat-active");
  const chatMessages = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input");

  // Events
  document.getElementById("conv-refresh")?.addEventListener("click", () => loadConversations());
  document.getElementById("conv-search")?.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadConversations(e.target.value), 300);
  });
  document.getElementById("chat-send")?.addEventListener("click", sendReply);
  chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  });
  document.getElementById("chat-archive")?.addEventListener("click", archiveCurrent);

  loadConversations();

  async function loadConversations(search = "") {
    listBody.innerHTML = '<div class="text-center text-muted py-4">Loading...</div>';
    try {
      const res = await API.getConversations({ search, limit: 50 });
      conversations = res?.data?.conversations || res?.conversations || [];
      renderList();
    } catch (err) {
      console.error(err);
      listBody.innerHTML = '<div class="text-center text-danger py-4">Failed to load conversations</div>';
    }
  }

  function renderList() {
    if (!conversations.length) {
      listBody.innerHTML = '<div class="text-center text-muted py-4">No conversations yet</div>';
      return;
    }

    listBody.innerHTML = conversations
      .map((c) => {
        const active = c.id === currentId ? "active" : "";
        const unread =
          c.unread_count > 0
            ? `<span class="badge-unread">${c.unread_count}</span>`
            : "";
        const time = c.last_message_at
          ? new Date(c.last_message_at).toLocaleString()
          : "";
        return `
        <div class="conv-item ${active}" data-id="${c.id}">
          <div class="d-flex justify-content-between align-items-start">
            <div class="name">${esc(c.name || c.phone || "Unknown")}</div>
            ${unread}
          </div>
          <div class="preview">${esc(c.phone || c.email || "")}</div>
          <div class="meta">${time} · ${c.user_type || ""}</div>
        </div>`;
      })
      .join("");

    listBody.querySelectorAll(".conv-item").forEach((el) => {
      el.addEventListener("click", () => openConversation(Number(el.dataset.id)));
    });
  }

  async function openConversation(id) {
    currentId = id;
    renderList();

    chatEmpty.style.display = "none";
    chatActive.style.display = "flex";

    const conv = conversations.find((c) => c.id === id);
    document.getElementById("chat-name").textContent =
      conv?.name || conv?.phone || "Conversation";
    document.getElementById("chat-meta").textContent = [
      conv?.phone,
      conv?.email,
      conv?.user_type,
    ]
      .filter(Boolean)
      .join(" · ");

    chatMessages.innerHTML =
      '<div class="text-center text-muted">Loading messages...</div>';

    try {
      const res = await API.getConversation(id);
      currentMessages = res?.data?.messages || res?.messages || [];
      renderMessages();
    } catch (err) {
      console.error(err);
      chatMessages.innerHTML =
        '<div class="text-center text-danger">Failed to load messages</div>';
    }
  }

  function renderMessages() {
    if (!currentMessages.length) {
      chatMessages.innerHTML =
        '<div class="text-center text-muted">No messages yet</div>';
      return;
    }

    chatMessages.innerHTML = currentMessages
      .map((m) => {
        const dir = m.direction === "outbound" ? "outbound" : "inbound";
        const time = m.created_at
          ? new Date(m.created_at).toLocaleString()
          : "";
        const channel = m.channel ? ` · ${m.channel}` : "";
        return `
        <div class="msg-bubble ${dir}">
          <div>${esc(m.content || "")}</div>
          <div class="msg-meta">${time}${channel} · ${m.status || ""}</div>
        </div>`;
      })
      .join("");

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function sendReply() {
    const text = (chatInput?.value || "").trim();
    if (!text || !currentId) return;

    const btn = document.getElementById("chat-send");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
      await API.replyToConversation(currentId, text);
      chatInput.value = "";
      const res = await API.getConversation(currentId);
      currentMessages = res?.data?.messages || res?.messages || [];
      renderMessages();
      await loadConversations(document.getElementById("conv-search")?.value || "");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to send reply");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-send-fill"></i> Send';
    }
  }

  async function archiveCurrent() {
    if (!currentId) return;
    if (!confirm("Archive this conversation?")) return;
    try {
      await API.archiveConversation(currentId);
      currentId = null;
      chatEmpty.style.display = "flex";
      chatActive.style.display = "none";
      await loadConversations();
    } catch (err) {
      alert(err.message || "Failed to archive");
    }
  }

  function esc(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
});
