document.addEventListener("DOMContentLoaded", () => {
  renderLayout("pgs", "PGs Management", "Manage all PG properties in your portfolio");

  // Floor name helper
  function getFloorName(index) {
    const names = ["1st Floor", "2nd Floor", "3rd Floor", "4th Floor", "5th Floor", "6th Floor", "7th Floor", "8th Floor", "9th Floor", "10th Floor"];
    return names[index] || `${index + 1}th Floor`;
  }

  // Get occupancy status for a room
  function getOccupancyStatus(room) {
    if (room.occupants.length === 0) return { label: "Vacant", chip: "chip-gray" };
    if (room.occupants.length < room.capacity) return { label: "Partial", chip: "chip-amber" };
    return { label: "Full", chip: "chip-green" };
  }

  // Get PG status
  function getPgStatus(pg) {
    let totalRooms = pg.rooms.length;
    let occupiedRooms = pg.rooms.filter(r => r.occupants && r.occupants.length > 0).length;
    if (occupiedRooms === 0) return { label: "Vacant", chip: "chip-gray" };
    if (occupiedRooms < totalRooms) return { label: "Partial", chip: "chip-amber" };
    return { label: "Full", chip: "chip-green" };
  }

  // Render stats
  function renderStats() {
    const pgs = LK.pgs;
    const totalRooms = pgs.reduce((s, p) => s + p.rooms.length, 0);
    const occupiedRooms = pgs.reduce((s, p) => s + p.rooms.filter(r => r.occupants && r.occupants.length > 0).length, 0);
    
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

  // Render PG grid
  function renderGrid(filter = "") {
    const f = filter.trim().toLowerCase();
    const rows = LK.pgs.filter(p => !f || p.name.toLowerCase().includes(f) || p.location.toLowerCase().includes(f));
    
    document.getElementById("pgsGrid").innerHTML = rows.map(p => {
      const st = getPgStatus(p);
      const totalRooms = p.rooms.length;
      const occupiedRooms = p.rooms.filter(r => r.occupants && r.occupants.length > 0).length;
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
            <div class="col-6"><i class="bi bi-currency-rupee me-1 text-muted-soft"></i>${fmtINR(p.rooms.reduce((s,r) => s + (r.rent || 10000), 0) / totalRooms)} Avg Rent</div>
          </div>
          ${p.qrCode ? `<div class="mt-2"><img src="${p.qrCode}" style="height:36px;width:36px;object-fit:contain;border-radius:4px;border:1px solid var(--border);" alt="QR"></div>` : ''}
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
  window.viewPgDetail = function(id) {
    const p = LK.pgs.find(x => x.id === id);
    if (!p) return;
    document.getElementById("pgDetailName").textContent = p.name;
    
    let html = `<p class="text-muted-soft small mb-3">${p.location}</p>`;
    
    // Display QR code in detail view
    if (p.qrCode) {
      html += `<div class="mb-3"><img src="${p.qrCode}" style="max-width:120px;max-height:120px;border:1px solid var(--border);border-radius:8px;padding:4px;" alt="Payment QR"></div>`;
    }
    
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
            <div><i class="bi bi-people me-1 text-muted-soft"></i>${r.occupants ? r.occupants.length : 0}/${r.capacity}</div>
            <div><i class="bi bi-currency-rupee me-1 text-muted-soft"></i>${fmtINR(r.rent || 10000)}/month</div>
            ${r.occupants && r.occupants.length ? `<div class="text-muted-soft mt-1"><small>${r.occupants.join(", ")}</small></div>` : ""}
          </div>
        </div>`;
      });
      html += `</div>`;
    });
    
    document.getElementById("pgDetailBody").innerHTML = html;
    pgDetailModal.show();
  };

  /* -------- Floor/Room Management -------- */
  let floorData = [];
  let tempQrDataUrl = null; // for storing uploaded QR as dataURL during edit/add

  function renderFloors() {
    const container = document.getElementById("floorsContainer");
    const floorCount = Number(document.getElementById("pFloors").value) || 1;
    
    // Ensure floorData matches floorCount
    while (floorData.length < floorCount) {
      floorData.push({ rooms: [] });
    }
    while (floorData.length > floorCount) {
      floorData.pop();
    }

    container.innerHTML = floorData.map((floor, index) => `
      <div class="floor-card" data-floor="${index}">
        <div class="floor-header">
          <h6>${getFloorName(index)}</h6>
          <div class="floor-actions">
            <button type="button" class="btn btn-sm btn-outline-brand" onclick="addRoomToFloor(${index})">
              <i class="bi bi-plus"></i> Add Room
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="clearFloor(${index})" ${floor.rooms.length === 0 ? 'disabled' : ''}>
              <i class="bi bi-trash3"></i> Clear
            </button>
          </div>
        </div>
        <div id="floor-${index}-rooms">
          ${floor.rooms.map((room, roomIndex) => `
            <div class="room-item">
              <span class="room-number">Room ${room.roomNo}</span>
              <div class="room-input-group">
                <input type="text" class="form-control form-control-sm" style="width:100px;" 
                       value="${room.roomNo}" 
                       onchange="updateRoomNumber(${index}, ${roomIndex}, this.value)"
                       placeholder="Room No">
                <span class="text-muted-soft">Capacity:</span>
                <input type="number" class="form-control form-control-sm room-capacity" style="width:70px;" 
                       value="${room.capacity}" min="1" max="10"
                       onchange="updateRoomCapacity(${index}, ${roomIndex}, this.value)">
                <button type="button" class="btn-remove-room" onclick="removeRoom(${index}, ${roomIndex})" title="Remove room">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
          `).join('')}
          ${floor.rooms.length === 0 ? `
            <div class="text-muted-soft text-center py-2 small">No rooms added yet.</div>
          ` : ''}
        </div>
        <button type="button" class="btn-add-room mt-2" onclick="addRoomToFloor(${index})">
          <i class="bi bi-plus-circle"></i> Add Room to ${getFloorName(index)}
        </button>
      </div>
    `).join('');
  }

  // Add room to floor
  window.addRoomToFloor = function(floorIndex) {
    const floor = floorData[floorIndex];
    if (!floor) return;
    
    // Generate next room number (simple logic: find highest and add 1)
    const existingNumbers = floor.rooms.map(r => parseInt(r.roomNo) || 0);
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 100 + floorIndex * 100;
    const nextNum = maxNum + 1;
    
    floor.rooms.push({
      roomNo: String(nextNum),
      capacity: 2,
      occupants: [],
      rent: 10000
    });
    renderFloors();
  };

  // Remove room
  window.removeRoom = function(floorIndex, roomIndex) {
    if (confirm("Remove this room?")) {
      floorData[floorIndex].rooms.splice(roomIndex, 1);
      renderFloors();
    }
  };

  // Clear all rooms from floor
  window.clearFloor = function(floorIndex) {
    if (confirm(`Clear all rooms from ${getFloorName(floorIndex)}?`)) {
      floorData[floorIndex].rooms = [];
      renderFloors();
    }
  };

  // Update room number
  window.updateRoomNumber = function(floorIndex, roomIndex, value) {
    const room = floorData[floorIndex].rooms[roomIndex];
    if (room) {
      room.roomNo = value.trim() || "101";
      renderFloors();
    }
  };

  // Update room capacity
  window.updateRoomCapacity = function(floorIndex, roomIndex, value) {
    const room = floorData[floorIndex].rooms[roomIndex];
    if (room) {
      room.capacity = Math.max(1, parseInt(value) || 1);
    }
  };

  // Apply floors button
  document.getElementById("applyFloorsBtn").addEventListener("click", function() {
    const btn = this;
    LOADER.show(btn, 'Applying...');
    
    const floorCount = Number(document.getElementById("pFloors").value) || 1;
    if (floorCount < 1) {
      showToast("Please enter at least 1 floor.", "warning");
      LOADER.hide(btn);
      return;
    }
    if (floorCount > 10) {
      showToast("Maximum 10 floors allowed.", "warning");
      LOADER.hide(btn);
      return;
    }
    
    setTimeout(() => {
      renderFloors();
      showToast(`${floorCount} floor(s) configured. Add rooms to each floor.`, "success");
      LOADER.hide(btn);
    }, 300);
  });

  // Trigger initial floor render
  setTimeout(renderFloors, 100);

  /* -------- QR Upload handling -------- */
  const qrUpload = document.getElementById('qrUpload');
  const qrPreviewContainer = document.getElementById('qrPreviewContainer');
  const qrPreviewImg = document.getElementById('qrPreviewImg');
  const removeQrBtn = document.getElementById('removeQrBtn');

  qrUpload.addEventListener('change', function(e) {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(ev) {
        tempQrDataUrl = ev.target.result;
        qrPreviewImg.src = tempQrDataUrl;
        qrPreviewContainer.classList.remove('d-none');
      };
      reader.readAsDataURL(file);
    }
  });

  removeQrBtn.addEventListener('click', function() {
    tempQrDataUrl = null;
    qrPreviewImg.src = '';
    qrPreviewContainer.classList.add('d-none');
    qrUpload.value = '';
  });

  // Show QR preview when editing (set by editPg)
  function setQrPreview(dataUrl) {
    if (dataUrl) {
      tempQrDataUrl = dataUrl;
      qrPreviewImg.src = dataUrl;
      qrPreviewContainer.classList.remove('d-none');
    } else {
      tempQrDataUrl = null;
      qrPreviewImg.src = '';
      qrPreviewContainer.classList.add('d-none');
      qrUpload.value = '';
    }
  }

  /* -------- Add/Edit PG Modal -------- */
  const pgModal = new bootstrap.Modal(document.getElementById("addPgModal"));
  document.querySelector('[data-bs-target="#addPgModal"]').addEventListener("click", () => {
    document.getElementById("pgModalTitle").textContent = "Add PG";
    document.getElementById("pgForm").reset();
    document.getElementById("pgId").value = "";
    floorData = [];
    document.getElementById("pFloors").value = 1;
    setQrPreview(null);
    renderFloors();
  });

  // Edit PG
  window.editPg = function(id) {
    const p = LK.pgs.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById("pgModalTitle").textContent = "Edit PG";
    document.getElementById("pgId").value = p.id;
    document.getElementById("pName").value = p.name;
    document.getElementById("pLocation").value = p.location;
    document.getElementById("pFloors").value = p.floors;
    
    // Set QR preview if exists
    if (p.qrCode) {
      setQrPreview(p.qrCode);
    } else {
      setQrPreview(null);
    }
    
    // Rebuild floorData from existing rooms
    floorData = [];
    for (let f = 0; f < p.floors; f++) {
      const floorName = getFloorName(f);
      const rooms = p.rooms.filter(r => r.floor === floorName);
      floorData.push({
        rooms: rooms.map(r => ({
          roomNo: r.roomNo,
          capacity: r.capacity,
          occupants: r.occupants || [],
          rent: r.rent || 10000
        }))
      });
    }
    renderFloors();
    pgModal.show();
  };

  // Submit form - Save PG
  document.getElementById("pgForm").addEventListener("submit", function(e){
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    LOADER.show(btn, 'Saving PG...');
    
    const id = document.getElementById("pgId").value;
    const name = document.getElementById("pName").value.trim();
    const location = document.getElementById("pLocation").value.trim();
    const floors = Number(document.getElementById("pFloors").value);

    if (!name || !location) {
      showToast("Please enter PG name and location.", "warning");
      LOADER.hide(btn);
      return;
    }

    // Validate floors have rooms
    const hasRooms = floorData.some(floor => floor.rooms.length > 0);
    if (!hasRooms) {
      showToast("Please add at least one room to any floor.", "warning");
      LOADER.hide(btn);
      return;
    }

    // Build rooms array
    const rooms = [];
    floorData.forEach((floor, index) => {
      const floorName = getFloorName(index);
      floor.rooms.forEach(room => {
        rooms.push({
          roomNo: room.roomNo,
          floor: floorName,
          occupants: room.occupants || [],
          capacity: room.capacity || 2,
          rent: room.rent || 10000
        });
      });
    });

    // Determine QR code to save: use tempQrDataUrl if available, else keep existing (for edit)
    let qrToSave = tempQrDataUrl;
    if (!qrToSave && id) {
      const existing = LK.pgs.find(x => x.id === id);
      if (existing) qrToSave = existing.qrCode || null;
    }

    setTimeout(() => {
      if (id) {
        // Edit existing PG
        const p = LK.pgs.find(x => x.id === id);
        if (p) {
          p.name = name;
          p.location = location;
          p.floors = floors;
          p.rooms = rooms;
          p.qrCode = qrToSave || null;
          showToast(`PG "${name}" updated.`, "success");
        }
      } else {
        // Add new PG
        LK.pgs.push({
          id: "PG" + Math.random().toString(36).slice(2, 7).toUpperCase(),
          name: name,
          location: location,
          floors: floors,
          roomsPerFloor: 0,
          capacity: 0,
          rooms: rooms,
          qrCode: qrToSave || null
        });
        showToast(`PG "${name}" added.`, "success");
      }
      pgModal.hide();
      renderStats();
      renderGrid(document.getElementById("pgSearch").value);
      LOADER.hide(btn);
      setQrPreview(null); // reset for next add
    }, 600);
  });

  /* -------- Delete PG -------- */
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deletePg = function(id) {
    const p = LK.pgs.find(x => x.id === id);
    if (!p) return;
    document.getElementById("confirmTitle").textContent = `Delete "${p.name}"?`;
    document.getElementById("confirmBody").textContent = "This will remove the PG and all its rooms from your portfolio.";
    document.getElementById("confirmActionBtn").onclick = function(){
      const btn = this;
      LOADER.show(btn, 'Deleting...');
      setTimeout(() => {
        LK.pgs = LK.pgs.filter(x => x.id !== id);
        confirmModal.hide();
        showToast(`PG "${p.name}" deleted.`, "danger");
        renderStats();
        renderGrid(document.getElementById("pgSearch").value);
        LOADER.hide(btn);
      }, 500);
    };
    confirmModal.show();
  };

  // Initial render
  renderStats();
  renderGrid();
});