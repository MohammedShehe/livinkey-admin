document.addEventListener("DOMContentLoaded", () => {
  renderLayout("pgs", "PGs Management", "Manage all PG properties in your portfolio");

  function getOccupancyStatus(room){
    if(room.occupants.length === 0) return { label: "Vacant", chip: "chip-gray" };
    if(room.occupants.length < room.capacity) return { label: "Partial", chip: "chip-amber" };
    return { label: "Full", chip: "chip-green" };
  }

  function getPgStatus(pg){
    let totalRooms = pg.rooms.length;
    let occupiedRooms = pg.rooms.filter(r => r.occupants.length > 0).length;
    if(occupiedRooms === 0) return { label: "Vacant", chip: "chip-gray" };
    if(occupiedRooms < totalRooms) return { label: "Partial", chip: "chip-amber" };
    return { label: "Full", chip: "chip-green" };
  }

  function renderStats(){
    const pgs = LK.pgs;
    const totalRooms = pgs.reduce((s, p) => s + p.rooms.length, 0);
    const occupiedRooms = pgs.reduce((s, p) => s + p.rooms.filter(r => r.occupants.length > 0).length, 0);
    
    const stats = [
      { label: "Total PGs", value: pgs.length, icon: "bi-building", color: "var(--lk-green)" },
      { label: "Fully Occupied", value: pgs.filter(p => getPgStatus(p).label === "Full").length, icon: "bi-house-check-fill", color: "var(--success)" },
      { label: "Partially Occupied", value: pgs.filter(p => getPgStatus(p).label === "Partial").length, icon: "bi-house-half", color: "var(--warning)" },
      { label: "Vacant PGs", value: pgs.filter(p => getPgStatus(p).label === "Vacant").length, icon: "bi-house", color: "var(--muted)" }
    ];
    
    document.getElementById("pgStats").innerHTML = stats.map(s => `
      <div class="col-6 col-md-3">
        <div class="stat-card hover-lift">
          <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
          <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
        </div>
      </div>`).join("");
  }

  function renderGrid(filter = ""){
    const f = filter.trim().toLowerCase();
    const rows = LK.pgs.filter(p => !f || p.name.toLowerCase().includes(f) || p.location.toLowerCase().includes(f));
    
    document.getElementById("pgsGrid").innerHTML = rows.map(p => {
      const st = getPgStatus(p);
      const totalRooms = p.rooms.length;
      const occupiedRooms = p.rooms.filter(r => r.occupants.length > 0).length;
      return `
      <div class="col-md-6 col-lg-4">
        <div class="border rounded-4 p-3 h-100 hover-lift pg-card" onclick="viewPgDetail('${p.id}')">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <div class="fw-bold h6 mb-0">${p.name}</div>
              <div class="small text-muted-soft">${p.location}</div>
            </div>
            <span class="chip ${st.chip}">${st.label}</span>
          </div>
          <div class="row g-2 small mt-2">
            <div class="col-6"><i class="bi bi-layers me-1 text-muted-soft"></i>${p.floors} Floors</div>
            <div class="col-6"><i class="bi bi-door-open me-1 text-muted-soft"></i>${totalRooms} Rooms</div>
            <div class="col-6"><i class="bi bi-people me-1 text-muted-soft"></i>${occupiedRooms}/${totalRooms} Occupied</div>
            <div class="col-6"><i class="bi bi-currency-rupee me-1 text-muted-soft"></i>${fmtINR(p.rooms.reduce((s,r) => s + r.rent, 0) / totalRooms)} Avg Rent</div>
          </div>
          <div class="mt-3 d-flex gap-2" onclick="event.stopPropagation();">
            <button class="btn btn-outline-brand btn-sm flex-grow-1" onclick="editPg('${p.id}')"><i class="bi bi-pencil me-1"></i>Edit</button>
            <button class="btn-icon" onclick="deletePg('${p.id}')"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      </div>`;
    }).join("");
  }

  document.getElementById("pgSearch").addEventListener("input", (e) => renderGrid(e.target.value));

  /* -------- PG Detail Modal -------- */
  const pgDetailModal = new bootstrap.Modal(document.getElementById("pgDetailModal"));
  window.viewPgDetail = function(id){
    const p = LK.pgs.find(x => x.id === id);
    if(!p) return;
    document.getElementById("pgDetailName").textContent = p.name;
    
    let html = `<p class="text-muted-soft small mb-3">${p.location}</p>`;
    const floors = [...new Set(p.rooms.map(r => r.floor))].sort();
    
    floors.forEach(floor => {
      const rooms = p.rooms.filter(r => r.floor === floor);
      html += `<h6 class="mt-3">${floor}</h6><div class="row g-2">`;
      rooms.forEach(r => {
        const st = getOccupancyStatus(r);
        html += `
        <div class="col-md-6 col-lg-4">
          <div class="border rounded-3 p-2 small">
            <div class="d-flex justify-content-between">
              <span class="fw-bold">Room ${r.roomNo}</span>
              <span class="chip ${st.chip}">${st.label}</span>
            </div>
            <div><i class="bi bi-people me-1 text-muted-soft"></i>${r.occupants.length}/${r.capacity}</div>
            <div><i class="bi bi-currency-rupee me-1 text-muted-soft"></i>${fmtINR(r.rent)}/month</div>
            ${r.occupants.length ? `<div class="text-muted-soft mt-1"><small>${r.occupants.join(", ")}</small></div>` : ""}
          </div>
        </div>`;
      });
      html += `</div>`;
    });
    
    document.getElementById("pgDetailBody").innerHTML = html;
    pgDetailModal.show();
  };

  /* -------- Add/Edit PG Modal -------- */
  const pgModal = new bootstrap.Modal(document.getElementById("addPgModal"));
  document.querySelector('[data-bs-target="#addPgModal"]').addEventListener("click", () => {
    document.getElementById("pgModalTitle").textContent = "Add PG";
    document.getElementById("pgForm").reset();
    document.getElementById("pgId").value = "";
  });

  window.editPg = function(id){
    const p = LK.pgs.find(x => x.id === id);
    document.getElementById("pgModalTitle").textContent = "Edit PG";
    document.getElementById("pgId").value = p.id;
    document.getElementById("pName").value = p.name;
    document.getElementById("pLocation").value = p.location;
    document.getElementById("pFloors").value = p.floors;
    document.getElementById("pRoomsPerFloor").value = p.roomsPerFloor;
    document.getElementById("pCapacity").value = p.capacity;
    pgModal.show();
  };

  document.getElementById("pgForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("pgId").value;
    const name = document.getElementById("pName").value.trim();
    const location = document.getElementById("pLocation").value.trim();
    const floors = Number(document.getElementById("pFloors").value);
    const roomsPerFloor = Number(document.getElementById("pRoomsPerFloor").value);
    const capacity = Number(document.getElementById("pCapacity").value);

    if(!name || !location || !floors || !roomsPerFloor || !capacity){
      showToast("Please fill in all fields.", "warning");
      return;
    }

    const rooms = [];
    const floorNames = ["1st Floor", "2nd Floor", "3rd Floor", "4th Floor", "5th Floor"];
    for(let f = 0; f < floors; f++){
      for(let r = 1; r <= roomsPerFloor; r++){
        const roomNo = String(101 + f * 100 + (r - 1));
        rooms.push({
          roomNo: roomNo,
          floor: floorNames[f] || `${f+1}th Floor`,
          occupants: [],
          rent: 10000,
          capacity: capacity
        });
      }
    }

    if(id){
      const p = LK.pgs.find(x => x.id === id);
      p.name = name;
      p.location = location;
      p.floors = floors;
      p.roomsPerFloor = roomsPerFloor;
      p.capacity = capacity;
      // Keep existing room occupants, update structure
      const existingRooms = p.rooms;
      rooms.forEach(r => {
        const existing = existingRooms.find(er => er.roomNo === r.roomNo);
        if(existing){
          r.occupants = existing.occupants;
          r.rent = existing.rent;
        }
      });
      p.rooms = rooms;
      showToast(`PG "${name}" updated.`, "success");
    } else {
      LK.pgs.push({
        id: "PG" + Math.random().toString(36).slice(2,7).toUpperCase(),
        name: name,
        location: location,
        floors: floors,
        roomsPerFloor: roomsPerFloor,
        capacity: capacity,
        rooms: rooms
      });
      showToast(`PG "${name}" added.`, "success");
    }
    pgModal.hide();
    renderStats();
    renderGrid(document.getElementById("pgSearch").value);
  });

  /* -------- Delete PG -------- */
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deletePg = function(id){
    const p = LK.pgs.find(x => x.id === id);
    document.getElementById("confirmTitle").textContent = `Delete "${p.name}"?`;
    document.getElementById("confirmBody").textContent = "This will remove the PG and all its rooms from your portfolio.";
    document.getElementById("confirmActionBtn").onclick = () => {
      LK.pgs = LK.pgs.filter(x => x.id !== id);
      confirmModal.hide();
      showToast(`PG "${p.name}" deleted.`, "danger");
      renderStats();
      renderGrid(document.getElementById("pgSearch").value);
    };
    confirmModal.show();
  };

  renderStats();
  renderGrid();
});