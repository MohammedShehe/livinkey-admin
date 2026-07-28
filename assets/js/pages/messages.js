document.addEventListener("DOMContentLoaded", () => {
  renderLayout("messages", "Messages", "Conversations between admins and members");

  const EMOJIS = ["😀","😂","😍","👍","🙏","🎉","❤️","😢","😮","🔥","👏","🙌","😅","🤔","🤝","✅"];
  let activeMemberId = null;

  function memberList(){ return LK.users.filter(u => u.role === "Member"); }
  function convo(id){ return LK.conversations[id] || (LK.conversations[id] = []); }

  function renderChatList(filter = ""){
    const f = filter.trim().toLowerCase();
    const rows = memberList().filter(m => !f || m.name.toLowerCase().includes(f) || (m.roomNo||"").toLowerCase().includes(f));
    // members with existing conversation float to top
    rows.sort((a,b) => (convo(b.id).length>0) - (convo(a.id).length>0));
    document.getElementById("chatListItems").innerHTML = rows.map(m => {
      const c = convo(m.id);
      const last = c[c.length-1];
      return `
      <div class="chat-item ${m.id === activeMemberId ? "active" : ""}" onclick="openChat('${m.id}')">
        <div class="avatar-circle" style="width:40px;height:40px;flex-shrink:0;">${m.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex justify-content-between">
            <span class="name">${m.name}</span>
            <span class="small text-muted-soft">${m.roomNo ? "Rm " + m.roomNo : ""}</span>
          </div>
          <div class="preview">${last ? (last.from === "admin" ? "You: " : "") + last.text : "No messages yet"}</div>
        </div>
      </div>`;
    }).join("");
  }
  document.getElementById("chatSearch").addEventListener("input", (e) => renderChatList(e.target.value));

  window.openChat = function(id){
    activeMemberId = id;
    const m = LK.users.find(x => x.id === id);
    renderChatList(document.getElementById("chatSearch").value);

    document.getElementById("chatMain").innerHTML = `
      <div class="chat-header">
        <div class="avatar-circle">${m.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
        <div class="flex-grow-1">
          <div class="fw-bold">${m.name}</div>
          <div class="small text-muted-soft">Room ${m.roomNo || "—"} · ${m.email}</div>
        </div>
        <button class="btn-icon" title="Delete messages" data-bs-toggle="modal" data-bs-target="#deleteChatModal"><i class="bi bi-trash3"></i></button>
      </div>
      <div class="chat-body" id="chatBody"></div>
      <div class="chat-compose position-relative">
        <button class="btn-icon" id="emojiBtn" title="Emoji"><i class="bi bi-emoji-smile"></i></button>
        <button class="btn-icon" id="attachBtn" title="Attach picture / camera"><i class="bi bi-camera"></i></button>
        <input type="file" id="attachInput" accept="image/*" class="d-none">
        <textarea id="composeText" rows="1" placeholder="Type a message..."></textarea>
        <button class="btn-fab" id="sendChatBtn" style="width:42px;height:42px;"><i class="bi bi-send-fill"></i></button>
      </div>
    `;
    renderChatBody();

    document.getElementById("emojiBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      let pop = document.getElementById("emojiPop");
      if(pop){ pop.remove(); return; }
      pop = document.createElement("div");
      pop.id = "emojiPop";
      pop.className = "emoji-pop";
      pop.innerHTML = EMOJIS.map(em => `<span>${em}</span>`).join("");
      document.querySelector(".chat-compose").appendChild(pop);
      pop.querySelectorAll("span").forEach(s => s.addEventListener("click", () => {
        document.getElementById("composeText").value += s.textContent;
        pop.remove();
      }));
    });
    document.getElementById("attachBtn").addEventListener("click", () => document.getElementById("attachInput").click());
    document.getElementById("attachInput").addEventListener("change", () => {
      convo(activeMemberId).push({ from: "admin", text: "📷 Photo attached", time: "Just now" });
      renderChatBody(); renderChatList(document.getElementById("chatSearch").value);
    });

    function send(){
      const val = document.getElementById("composeText").value.trim();
      if(!val) return;
      convo(activeMemberId).push({ from: "admin", text: val, time: "Just now" });
      document.getElementById("composeText").value = "";
      renderChatBody(); renderChatList(document.getElementById("chatSearch").value);
    }
    document.getElementById("sendChatBtn").addEventListener("click", send);
    document.getElementById("composeText").addEventListener("keydown", (e) => {
      if(e.key === "Enter" && !e.shiftKey){ e.preventDefault(); send(); }
    });
  };

  function renderChatBody(){
    const c = convo(activeMemberId);
    const body = document.getElementById("chatBody");
    if(!body) return;
    body.innerHTML = c.map((msg, i) => `
      <div class="msg-row ${msg.from === "admin" ? "out" : "in"}">
        <div class="msg-bubble" ondblclick="reactMsg(${i})">
          <span class="msg-sender">${msg.from === "admin" ? "You (Admin)" : document.getElementById("chatMain") ? "" : ""}${msg.from === "admin" ? "" : ""}</span>
          ${msg.text}
          <span class="msg-meta">${msg.time}</span>
          ${msg.reactions?.length ? `<span class="msg-reacts">${msg.reactions.join(" ")}</span>` : ""}
        </div>
      </div>`).join("");
    body.scrollTop = body.scrollHeight;
  }

  window.reactMsg = function(i){
    const c = convo(activeMemberId);
    c[i].reactions = c[i].reactions || [];
    c[i].reactions = ["👍"];
    renderChatBody();
  };

  /* -------- New conversation -------- */
  const newChatModal = document.getElementById("newChatModal");
  newChatModal.addEventListener("show.bs.modal", () => {
    document.getElementById("newChatSelect").innerHTML = memberList().map(m => `<option value="${m.id}">${m.name} — Room ${m.roomNo || "—"}</option>`).join("");
  });
  document.getElementById("startChatBtn").addEventListener("click", () => {
    const id = document.getElementById("newChatSelect").value;
    bootstrap.Modal.getInstance(newChatModal).hide();
    openChat(id);
    showToast("New conversation started.", "success");
  });

  /* -------- Delete chats -------- */
  document.getElementById("selectModeBtn").addEventListener("click", () => {
    const c = convo(activeMemberId);
    document.getElementById("selectMsgsWrap").classList.remove("d-none");
    document.getElementById("selectMsgsList").innerHTML = c.map((m,i) => `
      <label class="d-flex align-items-start gap-2 border-bottom py-2">
        <input type="checkbox" class="form-check-input mt-1 sel-msg" value="${i}">
        <span class="small">${m.text}<br><span class="text-muted-soft">${m.time}</span></span>
      </label>`).join("") || `<p class="small text-muted-soft">No messages to delete.</p>`;
  });
  document.getElementById("deleteSelectedBtn").addEventListener("click", () => {
    const idxs = Array.from(document.querySelectorAll(".sel-msg:checked")).map(cb => Number(cb.value)).sort((a,b)=>b-a);
    const c = convo(activeMemberId);
    idxs.forEach(i => c.splice(i,1));
    bootstrap.Modal.getInstance(document.getElementById("deleteChatModal")).hide();
    document.getElementById("selectMsgsWrap").classList.add("d-none");
    renderChatBody(); renderChatList(document.getElementById("chatSearch").value);
    showToast("Selected messages deleted.", "danger");
  });
  document.getElementById("deleteAllBtn").addEventListener("click", () => {
    LK.conversations[activeMemberId] = [];
    bootstrap.Modal.getInstance(document.getElementById("deleteChatModal")).hide();
    renderChatBody(); renderChatList(document.getElementById("chatSearch").value);
    showToast("Entire conversation deleted.", "danger");
  });

  renderChatList();
  const firstWithMsgs = memberList().find(m => convo(m.id).length > 0);
  if(firstWithMsgs) openChat(firstWithMsgs.id);
});
