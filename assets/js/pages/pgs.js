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
      const imageCount = (p.images || []).length;
      const amenities = p.amenities || [];
      const displayAmenities = amenities.slice(0, 3);
      const remainingAmenities = amenities.length - 3;
      
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
          ${imageCount > 0 ? `
            <div class="pg-card-images">
              ${p.images.slice(0, 3).map(img => `<img src="${img}" alt="PG image">`).join('')}
              ${imageCount > 3 ? `<div class="image-count-badge">+${imageCount - 3}</div>` : ''}
            </div>
          ` : ''}
          ${amenities.length > 0 ? `
            <div class="pg-amenities-display">
              ${displayAmenities.map(a => `<span class="amenity-badge">${a}</span>`).join('')}
              ${remainingAmenities > 0 ? `<span class="amenity-badge">+${remainingAmenities}</span>` : ''}
            </div>
          ` : ''}
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
  const imageViewerModal = new bootstrap.Modal(document.getElementById("imageViewerModal"));
  
  window.viewPgDetail = function(id) {
    const p = LK.pgs.find(x => x.id === id);
    if (!p) return;
    document.getElementById("pgDetailName").textContent = p.name;
    
    let html = `<p class="text-muted-soft small mb-3">${p.location}</p>`;
    
    // Display Amenities
    const amenities = p.amenities || [];
    if (amenities.length > 0) {
      html += `<div class="mb-3"><strong>Amenities:</strong> <div class="pg-amenities-display">`;
      amenities.forEach(a => {
        html += `<span class="amenity-badge">${a}</span>`;
      });
      html += `</div></div>`;
    }
    
    // Display PG Images
    const images = p.images || [];
    html += `<div class="pg-detail-images">`;
    if (images.length > 0) {
      images.forEach((img, idx) => {
        html += `<img src="${img}" alt="PG Image ${idx + 1}" onclick="viewImage('${img}')" loading="lazy">`;
      });
    } else {
      html += `<div class="no-images">No images uploaded for this PG.</div>`;
    }
    html += `</div>`;
    
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

  // Image viewer
  window.viewImage = function(src) {
    document.getElementById("imageViewerImg").src = src;
    imageViewerModal.show();
  };

  /* -------- PG Image Upload Handling -------- */
  let tempPgImages = [];
  let tempPgImagesDataUrls = [];

  function renderImagePreviews() {
    const container = document.getElementById('pgImagePreviews');
    container.innerHTML = tempPgImagesDataUrls.map((dataUrl, index) => `
      <div class="pg-image-preview-item">
        <img src="${dataUrl}" alt="PG Image ${index + 1}">
        <button type="button" class="remove-image-btn" onclick="removePgImage(${index})" title="Remove image">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `).join('');
    
    // Update upload area visibility
    const dropZone = document.getElementById('pgImageDropZone');
    if (tempPgImagesDataUrls.length >= 5) {
      dropZone.style.display = 'none';
    } else {
      dropZone.style.display = 'block';
    }
  }

  window.removePgImage = function(index) {
    tempPgImagesDataUrls.splice(index, 1);
    tempPgImages.splice(index, 1);
    renderImagePreviews();
  };

  // Handle image upload via file input
  document.getElementById('pgImageInput').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    handleImageFiles(files);
    this.value = '';
  });

  // Handle drag and drop
  const dropZone = document.getElementById('pgImageDropZone');
  
  dropZone.addEventListener('click', () => {
    document.getElementById('pgImageInput').click();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    handleImageFiles(files);
  });

  function handleImageFiles(files) {
    const remaining = 5 - tempPgImagesDataUrls.length;
    const toProcess = files.slice(0, remaining);
    
    if (toProcess.length === 0) {
      showToast("Maximum 5 images allowed.", "warning");
      return;
    }

    const progressBar = document.getElementById('pgImageProgress');
    let loaded = 0;
    const total = toProcess.length;

    toProcess.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = function(ev) {
        tempPgImagesDataUrls.push(ev.target.result);
        tempPgImages.push(file);
        loaded++;
        progressBar.style.width = `${(loaded / total) * 100}%`;
        if (loaded === total) {
          setTimeout(() => {
            progressBar.style.width = '0%';
            renderImagePreviews();
            showToast(`${total} image(s) uploaded successfully.`, "success");
          }, 300);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // Reset image upload state
  function resetImageUpload() {
    tempPgImages = [];
    tempPgImagesDataUrls = [];
    renderImagePreviews();
    document.getElementById('pgImageInput').value = '';
    document.getElementById('pgImageProgress').style.width = '0%';
    document.getElementById('pgImageDropZone').style.display = 'block';
  }

  // Set images for edit
  function setPgImages(images) {
    tempPgImagesDataUrls = images ? [...images] : [];
    tempPgImages = [];
    renderImagePreviews();
  }

  /* -------- Amenities Handling -------- */
  let customAmenities = [];

  function getSelectedAmenities() {
    const checkboxes = document.querySelectorAll('.amenity-checkbox:checked');
    const builtIn = Array.from(checkboxes).map(cb => cb.value);
    return [...builtIn, ...customAmenities];
  }

  function renderCustomAmenityTags() {
    const container = document.getElementById('customAmenityTags');
    container.innerHTML = customAmenities.map((a, i) => `
      <span class="custom-amenity-tag">
        ${a}
        <button type="button" class="btn-remove-tag" onclick="removeCustomAmenity(${i})">&times;</button>
      </span>
    `).join('');
  }

  window.removeCustomAmenity = function(index) {
    customAmenities.splice(index, 1);
    renderCustomAmenityTags();
  };

  document.getElementById('addCustomAmenityBtn').addEventListener('click', function() {
    const input = document.getElementById('customAmenityInput');
    const value = input.value.trim();
    if (!value) {
      showToast("Please enter an amenity name.", "warning");
      return;
    }
    if (customAmenities.includes(value)) {
      showToast("This amenity is already added.", "warning");
      return;
    }
    // Check if it's already in built-in checkboxes
    const builtInValues = Array.from(document.querySelectorAll('.amenity-checkbox')).map(cb => cb.value);
    if (builtInValues.includes(value)) {
      showToast("This amenity is already in the list. Please check the box above.", "warning");
      return;
    }
    customAmenities.push(value);
    input.value = '';
    renderCustomAmenityTags();
    showToast(`Added "${value}" to amenities.`, "success");
  });

  // Allow Enter key for custom amenity input
  document.getElementById('customAmenityInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('addCustomAmenityBtn').click();
    }
  });

  function setAmenities(amenities) {
    // Reset all checkboxes
    document.querySelectorAll('.amenity-checkbox').forEach(cb => cb.checked = false);
    customAmenities = [];
    
    if (amenities && amenities.length > 0) {
      const builtInValues = Array.from(document.querySelectorAll('.amenity-checkbox')).map(cb => cb.value);
      amenities.forEach(a => {
        if (builtInValues.includes(a)) {
          const cb = document.querySelector(`.amenity-checkbox[value="${a}"]`);
          if (cb) cb.checked = true;
        } else {
          customAmenities.push(a);
        }
      });
      renderCustomAmenityTags();
    }
  }

  function resetAmenities() {
    document.querySelectorAll('.amenity-checkbox').forEach(cb => cb.checked = false);
    customAmenities = [];
    document.getElementById('customAmenityInput').value = '';
    renderCustomAmenityTags();
  }

  /* -------- QR Upload handling -------- */
  const qrUpload = document.getElementById('qrUpload');
  const qrPreviewContainer = document.getElementById('qrPreviewContainer');
  const qrPreviewImg = document.getElementById('qrPreviewImg');
  const removeQrBtn = document.getElementById('removeQrBtn');

  let tempQrDataUrl = null;

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

  /* -------- Floor/Room Management -------- */
  let floorData = [];

  function renderFloors() {
    const container = document.getElementById("floorsContainer");
    const floorCount = Number(document.getElementById("pFloors").value) || 1;
    
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

  window.addRoomToFloor = function(floorIndex) {
    const floor = floorData[floorIndex];
    if (!floor) return;
    
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

  window.removeRoom = function(floorIndex, roomIndex) {
    if (confirm("Remove this room?")) {
      floorData[floorIndex].rooms.splice(roomIndex, 1);
      renderFloors();
    }
  };

  window.clearFloor = function(floorIndex) {
    if (confirm(`Clear all rooms from ${getFloorName(floorIndex)}?`)) {
      floorData[floorIndex].rooms = [];
      renderFloors();
    }
  };

  window.updateRoomNumber = function(floorIndex, roomIndex, value) {
    const room = floorData[floorIndex].rooms[roomIndex];
    if (room) {
      room.roomNo = value.trim() || "101";
      renderFloors();
    }
  };

  window.updateRoomCapacity = function(floorIndex, roomIndex, value) {
    const room = floorData[floorIndex].rooms[roomIndex];
    if (room) {
      room.capacity = Math.max(1, parseInt(value) || 1);
    }
  };

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

  setTimeout(renderFloors, 100);

  /* -------- Add/Edit PG Modal -------- */
  const pgModal = new bootstrap.Modal(document.getElementById("addPgModal"));
  
  document.querySelector('[data-bs-toggle="modal"][data-bs-target="#addPgModal"]').addEventListener("click", () => {
    document.getElementById("pgModalTitle").textContent = "Add PG";
    document.getElementById("pgForm").reset();
    document.getElementById("pgId").value = "";
    floorData = [];
    document.getElementById("pFloors").value = 1;
    setQrPreview(null);
    resetImageUpload();
    resetAmenities();
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
    
    setQrPreview(p.qrCode || null);
    setPgImages(p.images || []);
    
    // Set amenities
    setAmenities(p.amenities || []);
    
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

    const hasRooms = floorData.some(floor => floor.rooms.length > 0);
    if (!hasRooms) {
      showToast("Please add at least one room to any floor.", "warning");
      LOADER.hide(btn);
      return;
    }

    // Get selected amenities
    const selectedAmenities = getSelectedAmenities();

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

    let qrToSave = tempQrDataUrl;
    if (!qrToSave && id) {
      const existing = LK.pgs.find(x => x.id === id);
      if (existing) qrToSave = existing.qrCode || null;
    }

    // Use uploaded images or keep existing
    let imagesToSave = tempPgImagesDataUrls.length > 0 ? [...tempPgImagesDataUrls] : null;
    if (!imagesToSave && id) {
      const existing = LK.pgs.find(x => x.id === id);
      if (existing && existing.images && existing.images.length > 0) {
        imagesToSave = [...existing.images];
      }
    }

    setTimeout(() => {
      if (id) {
        const p = LK.pgs.find(x => x.id === id);
        if (p) {
          p.name = name;
          p.location = location;
          p.floors = floors;
          p.rooms = rooms;
          p.qrCode = qrToSave || null;
          p.images = imagesToSave && imagesToSave.length > 0 ? imagesToSave : [];
          p.amenities = selectedAmenities.length > 0 ? selectedAmenities : [];
          showToast(`PG "${name}" updated.`, "success");
        }
      } else {
        LK.pgs.push({
          id: "PG" + Math.random().toString(36).slice(2, 7).toUpperCase(),
          name: name,
          location: location,
          floors: floors,
          roomsPerFloor: 0,
          capacity: 0,
          rooms: rooms,
          qrCode: qrToSave || null,
          images: imagesToSave && imagesToSave.length > 0 ? imagesToSave : [],
          amenities: selectedAmenities.length > 0 ? selectedAmenities : []
        });
        showToast(`PG "${name}" added.`, "success");
      }
      pgModal.hide();
      renderStats();
      renderGrid(document.getElementById("pgSearch").value);
      LOADER.hide(btn);
      setQrPreview(null);
      resetImageUpload();
      resetAmenities();
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