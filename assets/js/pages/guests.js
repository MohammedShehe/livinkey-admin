document.addEventListener("DOMContentLoaded", () => {
  renderLayout("guests", "Guests", "Everyone visiting or newly registered at Livinkey");

  function guests(){ return LK.guests || []; }
  function isThisMonth(dateStr){
    if(!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  function daysAgo(dateStr){
    const diff = (new Date() - new Date(dateStr)) / (1000*60*60*24);
    return Math.round(diff);
  }

  function renderStats(){
    const g = guests();
    const stats = [
      { label: "Total Guests", value: g.length, icon: "bi-person-badge", color: "var(--lk-green)" },
      { label: "This Month's Guests", value: g.filter(x => isThisMonth(x.joinedOn)).length, icon: "bi-calendar-check", color: "var(--info)" }
    ];
    document.getElementById("guestStats").innerHTML = stats.map(s => `
      <div class="col-6 col-md-3">
        <div class="stat-card hover-lift">
          <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
          <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
        </div>
      </div>`).join("");
  }

  function renderNewGuests(){
    const recent = guests().filter(g => daysAgo(g.joinedOn) <= 14).sort((a,b) => daysAgo(a.joinedOn) - daysAgo(b.joinedOn));
    document.getElementById("newGuestsRow").innerHTML = recent.length ? recent.map(g => `
      <div class="d-flex align-items-center gap-2 border rounded-3 px-3 py-2" style="border-color:var(--border) !important;">
        <div class="avatar-circle" style="width:32px;height:32px;font-size:.7rem;">${g.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
        <div>
          <div class="fw-semibold small">${g.name}</div>
          <div class="small text-muted-soft">${daysAgo(g.joinedOn)} day(s) ago</div>
        </div>
      </div>`).join("") : `<span class="text-muted-soft small">No new guests in the last 14 days.</span>`;
  }

  function renderGrid(filter = ""){
    const f = filter.trim().toLowerCase();
    const rows = guests().filter(g => !f || g.name.toLowerCase().includes(f) || g.nationality.toLowerCase().includes(f));
    document.getElementById("guestsGrid").innerHTML = rows.map(g => `
      <div class="col-md-6 col-lg-4">
        <div class="border rounded-4 p-3 h-100 hover-lift" style="border-color:var(--border) !important;">
          <div class="d-flex align-items-start justify-content-between mb-2">
            <div class="d-flex align-items-center gap-2">
              <div class="avatar-circle">${g.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
              <div>
                <div class="fw-bold">${g.name}</div>
                <div class="small text-muted-soft">${g.nationality}</div>
              </div>
            </div>
            <div class="dropdown">
              <button class="btn-icon" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><button class="dropdown-item" onclick="editGuest('${g.id}')"><i class="bi bi-pencil me-2"></i>Edit</button></li>
                <li><button class="dropdown-item text-danger" onclick="deleteGuest('${g.id}')"><i class="bi bi-trash3 me-2"></i>Delete</button></li>
              </ul>
            </div>
          </div>
          <div class="small mb-1"><i class="bi bi-envelope me-2 text-muted-soft"></i>${g.email}</div>
          <div class="small mb-3"><i class="bi bi-telephone me-2 text-muted-soft"></i>${g.countryCode} ${g.phone}</div>
          <button class="btn btn-outline-brand btn-sm w-100" onclick="openMsg('${g.id}')"><i class="bi bi-chat-dots me-1"></i>Send Message</button>
        </div>
      </div>`).join("");
    document.getElementById("guestsEmpty").classList.toggle("d-none", rows.length > 0);
  }

  document.getElementById("guestSearch").addEventListener("input", (e) => renderGrid(e.target.value));

  /* -------- Message modal -------- */
  const msgModal = new bootstrap.Modal(document.getElementById("msgModal"));
  window.openMsg = function(id){
    const g = LK.guests.find(x => x.id === id);
    document.getElementById("msgGuestName").textContent = g.name;
    document.getElementById("msgText").value =
`Hi ${g.name.split(" ")[0]}, welcome to Livinkey! 🎉

We're delighted to have you with us. Livinkey offers fully furnished rooms, housekeeping, laundry, high-speed Wi-Fi and 24x7 support during your stay. If you need anything at all, just reply here or reach our team at livinkey@gmail.com.

Enjoy your stay!
— Livinkey Team`;
    msgModal.show();
  };
  document.getElementById("sendMsgBtn").addEventListener("click", () => {
    msgModal.hide();
    showToast("Message sent successfully.", "success");
  });

  /* -------- Edit -------- */
  const editModal = new bootstrap.Modal(document.getElementById("editGuestModal"));
  window.editGuest = function(id){
    const g = LK.guests.find(x => x.id === id);
    document.getElementById("egId").value = g.id;
    document.getElementById("egName").value = g.name;
    document.getElementById("egEmail").value = g.email;
    document.getElementById("egNationality").value = g.nationality;
    document.getElementById("egPhone").value = g.phone;
    editModal.show();
  };
  document.getElementById("editGuestForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const g = LK.guests.find(x => x.id === document.getElementById("egId").value);
    g.name = document.getElementById("egName").value.trim();
    g.email = document.getElementById("egEmail").value.trim();
    g.nationality = document.getElementById("egNationality").value.trim();
    g.phone = document.getElementById("egPhone").value.trim();
    editModal.hide();
    showToast(`${g.name}'s details were updated.`, "success");
    renderNewGuests(); 
    renderGrid(document.getElementById("guestSearch").value);
  });

  /* -------- Delete -------- */
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteGuest = function(id){
    const g = LK.guests.find(x => x.id === id);
    document.getElementById("confirmTitle").textContent = `Delete ${g.name}?`;
    document.getElementById("confirmBody").textContent = "This will permanently remove this guest's record.";
    document.getElementById("confirmActionBtn").onclick = () => {
      LK.guests = LK.guests.filter(x => x.id !== id);
      confirmModal.hide();
      showToast(`${g.name} was deleted.`, "danger");
      renderStats(); 
      renderNewGuests(); 
      renderGrid(document.getElementById("guestSearch").value);
    };
    confirmModal.show();
  };

  renderStats(); 
  renderNewGuests(); 
  renderGrid();
});