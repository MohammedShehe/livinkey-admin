document.addEventListener("DOMContentLoaded", () => {
  renderLayout("rooms", "Rooms", "Occupancy and rent overview for every room");

  function status(r){
    if(r.occupants.length === 0) return { label: "Vacant", chip: "chip-gray" };
    if(r.occupants.length < r.capacity) return { label: "Partially Occupied", chip: "chip-amber" };
    return { label: "Full", chip: "chip-green" };
  }

  function renderStats(){
    const rooms = LK.rooms;
    const totalCap = rooms.reduce((s,r) => s + r.capacity, 0);
    const occupied = rooms.reduce((s,r) => s + r.occupants.length, 0);
    const stats = [
      { label: "Total Rooms", value: rooms.length, icon: "bi-door-open-fill", color: "var(--lk-green)" },
      { label: "Fully Occupied", value: rooms.filter(r => status(r).label === "Full").length, icon: "bi-house-check-fill", color: "var(--success)" },
      { label: "Vacant Rooms", value: rooms.filter(r => r.occupants.length === 0).length, icon: "bi-house", color: "var(--muted)" },
      { label: "Beds Occupied", value: `${occupied}/${totalCap}`, icon: "bi-people-fill", color: "var(--info)" }
    ];
    document.getElementById("roomStats").innerHTML = stats.map(s => `
      <div class="col-6 col-md-3">
        <div class="stat-card hover-lift">
          <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
          <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
        </div>
      </div>`).join("");
  }

  function renderGrid(filter = ""){
    const f = filter.trim().toLowerCase();
    const rows = LK.rooms.filter(r => !f || r.roomNo.includes(f) || r.floor.toLowerCase().includes(f));
    document.getElementById("roomsGrid").innerHTML = rows.map(r => {
      const st = status(r);
      return `
      <div class="col-md-6 col-lg-4">
        <div class="border rounded-4 p-3 h-100 hover-lift" style="border-color:var(--border) !important;">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <div class="fw-bold h6 mb-0">Room ${r.roomNo}</div>
              <div class="small text-muted-soft">${r.floor}</div>
            </div>
            <span class="chip ${st.chip}">${st.label}</span>
          </div>
          <div class="small mb-1"><i class="bi bi-people me-2 text-muted-soft"></i>${r.occupants.length}/${r.capacity} occupants</div>
          <div class="small mb-2"><i class="bi bi-cash me-2 text-muted-soft"></i>${fmtINR(r.rent)}/month</div>
          <div class="small text-muted-soft mb-3">${r.occupants.length ? r.occupants.join(", ") : "No current occupants"}</div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-brand btn-sm flex-grow-1" onclick="editRoom('${r.id}')"><i class="bi bi-pencil me-1"></i>Edit</button>
            <button class="btn-icon" onclick="deleteRoom('${r.id}')"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      </div>`;
    }).join("");
  }
  document.getElementById("roomSearch").addEventListener("input", (e) => renderGrid(e.target.value));

  const roomModal = new bootstrap.Modal(document.getElementById("addRoomModal"));
  document.querySelector('[data-bs-target="#addRoomModal"]').addEventListener("click", () => {
    document.getElementById("roomModalTitle").textContent = "Add Room";
    document.getElementById("roomForm").reset();
    document.getElementById("roomId").value = "";
  });
  window.editRoom = function(id){
    const r = LK.rooms.find(x => x.id === id);
    document.getElementById("roomModalTitle").textContent = "Edit Room";
    document.getElementById("roomId").value = r.id;
    document.getElementById("rNo").value = r.roomNo;
    document.getElementById("rFloor").value = r.floor;
    document.getElementById("rCapacity").value = r.capacity;
    document.getElementById("rRent").value = r.rent;
    roomModal.show();
  };
  document.getElementById("roomForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("roomId").value;
    const payload = {
      roomNo: document.getElementById("rNo").value.trim(),
      floor: document.getElementById("rFloor").value.trim(),
      capacity: Number(document.getElementById("rCapacity").value),
      rent: Number(document.getElementById("rRent").value)
    };
    if(id){
      const r = LK.rooms.find(x => x.id === id);
      Object.assign(r, payload);
      showToast(`Room ${r.roomNo} updated.`, "success");
    } else {
      LK.rooms.push({ id: "R" + Math.random().toString(36).slice(2,7).toUpperCase(), occupants: [], ...payload });
      showToast(`Room ${payload.roomNo} added.`, "success");
    }
    roomModal.hide();
    renderStats(); renderGrid(document.getElementById("roomSearch").value);
  });

  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteRoom = function(id){
    const r = LK.rooms.find(x => x.id === id);
    document.getElementById("confirmTitle").textContent = `Delete Room ${r.roomNo}?`;
    document.getElementById("confirmBody").textContent = "This will remove the room from your property listing.";
    document.getElementById("confirmActionBtn").onclick = () => {
      LK.rooms = LK.rooms.filter(x => x.id !== id);
      confirmModal.hide();
      showToast(`Room ${r.roomNo} deleted.`, "danger");
      renderStats(); renderGrid(document.getElementById("roomSearch").value);
    };
    confirmModal.show();
  };

  renderStats(); renderGrid();
});
