// FILE: assets/js/pages/pgs.js
// PGs Management - Full Backend Integration with Fixed Delete

document.addEventListener("DOMContentLoaded", () => {
    renderLayout("pgs", "PGs Management", "Manage all PG properties in your portfolio");

    // ============================================
    // PERMISSION CHECKS
    // ============================================
    const canAddPGs = Permissions.canAdd('pgs');
    const canEditPGs = Permissions.canEdit('pgs');
    const canDeletePGs = Permissions.canDelete('pgs');
    const canViewPGs = Permissions.canView('pgs');

    let pgData = [];
    let floorData = [];
    let tempPgImages = [];
    let tempPgImagesDataUrls = [];
    let tempQrDataUrl = null;
    let customAmenities = [];

    // ============================================
    // FETCH AND RENDER PGs
    // ============================================
    async function loadPGs() {
        try {
            const res = await API.pgs.getAll();
            if (res.success) {
                pgData = res.data || [];
                renderStats();
                renderGrid();
            } else {
                showToast(res.message || "Failed to load PGs", "danger");
            }
        } catch (error) {
            showToast("Error loading PGs: " + error.message, "danger");
        }
    }

    function renderStats() {
        const total = pgData.length;
        const active = pgData.filter(p => p.is_active === 1).length;
        const inactive = total - active;
        
        let full = 0, partial = 0, vacant = 0;
        pgData.forEach(p => {
            const totalRooms = p.total_rooms || 0;
            const occupied = p.total_occupied || 0;
            if (totalRooms === 0) vacant++;
            else if (occupied === 0) vacant++;
            else if (occupied >= totalRooms) full++;
            else partial++;
        });

        const stats = [
            { label: "Total PGs", value: total, icon: "bi-building", color: "var(--lk-green)" },
            { label: "Active", value: active, icon: "bi-check-circle", color: "var(--success)" },
            { label: "Inactive", value: inactive, icon: "bi-x-circle", color: "var(--danger)" },
            { label: "Fully Occupied", value: full, icon: "bi-house-check-fill", color: "var(--success)" },
            { label: "Partially Occupied", value: partial, icon: "bi-house-half", color: "var(--warning)" },
            { label: "Vacant", value: vacant, icon: "bi-house", color: "var(--muted)" }
        ];
        
        document.getElementById("pgStats").innerHTML = stats.map(s => `
            <div class="col-6 col-md-4 col-lg">
                <div class="stat-card hover-lift">
                    <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            </div>
        `).join("");
    }

    function renderGrid(search = "") {
        const f = search.trim().toLowerCase();
        let filtered = pgData.filter(p => 
            !f || p.name?.toLowerCase().includes(f) || p.location?.toLowerCase().includes(f)
        );
        
        const grid = document.getElementById("pgsGrid");
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="bi bi-building"></i>
                        <p class="mb-0 fw-semibold">No PGs found</p>
                    </div>
                </div>`;
            return;
        }
        
        grid.innerHTML = filtered.map(p => {
            const status = p.is_active === 1 ? 'Active' : 'Inactive';
            const chipClass = p.is_active === 1 ? 'chip-green' : 'chip-gray';
            const occupancyText = `${p.total_occupied || 0}/${p.total_capacity || 0}`;
            
            const images = p.images || [];
            const coverImage = images.length > 0 ? images[0] : null;
            
            return `
            <div class="col-md-6 col-lg-4">
                <div class="border rounded-4 p-3 h-100 hover-lift pg-card" onclick="viewPgDetail('${p.id}')">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <div class="fw-bold h6 mb-0">${p.name || '—'}</div>
                            <div class="small text-muted-soft">${p.location || '—'}</div>
                        </div>
                        <span class="chip ${chipClass}">${status}</span>
                    </div>
                    ${coverImage ? `
                    <div style="margin-top:0.5rem;margin-bottom:0.5rem;">
                        <img src="${coverImage}" alt="${p.name}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;">
                    </div>` : `
                    <div style="margin-top:0.5rem;margin-bottom:0.5rem;background:var(--bg);height:120px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--muted);">
                        <i class="bi bi-image" style="font-size:2rem;"></i>
                    </div>`}
                    ${p.amenity_names && p.amenity_names.length > 0 ? `
                    <div class="pg-amenities-display">
                        ${p.amenity_names.slice(0, 3).map(a => `<span class="amenity-badge">${a}</span>`).join('')}
                        ${p.amenity_names.length > 3 ? `<span class="amenity-badge">+${p.amenity_names.length - 3}</span>` : ''}
                    </div>` : ''}
                    <div class="row g-2 small mt-2">
                        <div class="col-6"><i class="bi bi-layers me-1 text-muted-soft"></i>${p.number_of_floors || 0} Floors</div>
                        <div class="col-6"><i class="bi bi-door-open me-1 text-muted-soft"></i>${p.total_rooms || 0} Rooms</div>
                        <div class="col-6"><i class="bi bi-people me-1 text-muted-soft"></i>${occupancyText} Occupied</div>
                        <div class="col-6"><i class="bi bi-currency-rupee me-1 text-muted-soft"></i>${p.rent ? fmtINR(p.rent) : '—'}</div>
                    </div>
                    ${p.payment_qr ? `<div class="mt-2"><img src="${p.payment_qr}" style="height:36px;width:36px;object-fit:contain;border-radius:4px;border:1px solid var(--border);" alt="QR"></div>` : ''}
                    <div class="mt-3 d-flex gap-2" onclick="event.stopPropagation();">
                        ${canEditPGs ? `<button class="btn btn-outline-brand btn-sm flex-grow-1" onclick="editPg('${p.id}')"><i class="bi bi-pencil me-1"></i>Edit</button>` : ''}
                        ${canDeletePGs ? `<button class="btn-icon btn-delete-pg" onclick="deletePg('${p.id}')" data-pg-id="${p.id}"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join("");
    }

    document.getElementById("pgSearch")?.addEventListener("input", (e) => renderGrid(e.target.value));

    // Show/hide Add PG button
    const addPgBtn = document.querySelector('[data-bs-toggle="modal"][data-bs-target="#addPgModal"]');
    if (addPgBtn) {
        addPgBtn.style.display = canAddPGs ? '' : 'none';
    }

    // ============================================
    // PG DETAIL VIEW
    // ============================================
    const pgDetailModal = new bootstrap.Modal(document.getElementById("pgDetailModal"));

    window.viewPgDetail = async function(id) {
        if (!canViewPGs) {
            showToast("You don't have permission to view PG details.", "warning");
            return;
        }
        try {
            const res = await API.pgs.getById(id);
            if (!res.success || !res.data) {
                showToast("PG not found.", "danger");
                return;
            }
            const p = res.data;
            document.getElementById("pgDetailName").textContent = p.name || 'PG Detail';
            
            let html = `<p class="text-muted-soft small mb-3">${p.location || '—'}</p>`;
            html += `<div class="row g-2 small mb-3">`;
            html += `<div class="col-6"><span class="text-muted-soft">Rent:</span> <strong>${fmtINR(p.rent || 0)}/month</strong></div>`;
            html += `<div class="col-6"><span class="text-muted-soft">Security Fee:</span> <strong>${fmtINR(p.security_fee || 0)}</strong></div>`;
            html += `<div class="col-6"><span class="text-muted-soft">Floors:</span> <strong>${p.number_of_floors || 0}</strong></div>`;
            html += `<div class="col-6"><span class="text-muted-soft">Status:</span> <span class="chip ${p.is_active === 1 ? 'chip-green' : 'chip-gray'}">${p.is_active === 1 ? 'Active' : 'Inactive'}</span></div>`;
            html += `<div class="col-6"><span class="text-muted-soft">Total Rooms:</span> <strong>${p.total_rooms || 0}</strong></div>`;
            html += `<div class="col-6"><span class="text-muted-soft">Occupancy:</span> <strong>${p.total_occupied || 0}/${p.total_capacity || 0}</strong></div>`;
            html += `</div>`;
            
            if (p.amenity_names && p.amenity_names.length > 0) {
                html += `<div class="mb-3"><strong>Amenities:</strong> <div class="pg-amenities-display">`;
                p.amenity_names.forEach(a => {
                    html += `<span class="amenity-badge">${a}</span>`;
                });
                html += `</div></div>`;
            }
            
            if (p.images && p.images.length > 0) {
                html += `<div class="pg-detail-images">`;
                p.images.forEach(img => {
                    if (typeof img === 'string') {
                        html += `<img src="${img}" alt="PG Image" onclick="viewImage('${img}')" loading="lazy">`;
                    } else if (img.image_url) {
                        html += `<img src="${img.image_url}" alt="PG Image" onclick="viewImage('${img.image_url}')" loading="lazy">`;
                    }
                });
                html += `</div>`;
            } else {
                html += `<div class="text-muted-soft text-center py-3">No images uploaded for this PG.</div>`;
            }
            
            if (p.payment_qr) {
                html += `<div class="mb-3"><img src="${p.payment_qr}" style="max-width:120px;max-height:120px;border:1px solid var(--border);border-radius:8px;padding:4px;" alt="Payment QR"></div>`;
            }
            
            if (p.floors && p.floors.length > 0) {
                p.floors.forEach(floor => {
                    html += `<h6 class="mt-3">Floor ${floor.floor_number}</h6><div class="row g-2">`;
                    if (floor.rooms && floor.rooms.length > 0) {
                        floor.rooms.forEach(r => {
                            const status = r.is_full ? 'Full' : r.occupied_count > 0 ? 'Partial' : 'Vacant';
                            const chipClass = r.is_full ? 'chip-green' : r.occupied_count > 0 ? 'chip-amber' : 'chip-gray';
                            html += `
                            <div class="col-md-6 col-lg-4">
                                <div class="border rounded-3 p-2 small">
                                    <div class="d-flex justify-content-between">
                                        <span class="fw-bold">Room ${r.room_number}</span>
                                        <span class="chip ${chipClass}">${status}</span>
                                    </div>
                                    <div><i class="bi bi-people me-1 text-muted-soft"></i>${r.occupied_count || 0}/${r.capacity || 0}</div>
                                    <div><i class="bi bi-currency-rupee me-1 text-muted-soft"></i>${fmtINR(r.rent || 0)}/month</div>
                                </div>
                            </div>`;
                        });
                    } else {
                        html += `<div class="col-12 text-muted-soft small">No rooms on this floor.</div>`;
                    }
                    html += `</div>`;
                });
            }
            
            document.getElementById("pgDetailBody").innerHTML = html;
            pgDetailModal.show();
        } catch (error) {
            showToast("Error loading PG details: " + error.message, "danger");
        }
    };

    window.viewImage = function(src) {
        document.getElementById("imageViewerImg").src = src;
        new bootstrap.Modal(document.getElementById("imageViewerModal")).show();
    };

    // ============================================
    // IMAGE UPLOAD HANDLING
    // ============================================
    function renderImagePreviews() {
        const container = document.getElementById('pgImagePreviews');
        if (!container) return;
        container.innerHTML = tempPgImagesDataUrls.map((dataUrl, index) => `
            <div class="pg-image-preview-item">
                <img src="${dataUrl}" alt="PG Image ${index + 1}">
                <button type="button" class="remove-image-btn" onclick="removePgImage(${index})" title="Remove image">
                    <i class="bi bi-x"></i>
                </button>
            </div>
        `).join('');
        
        const dropZone = document.getElementById('pgImageDropZone');
        if (dropZone) {
            dropZone.style.display = tempPgImagesDataUrls.length >= 5 ? 'none' : 'block';
        }
    }

    window.removePgImage = function(index) {
        tempPgImagesDataUrls.splice(index, 1);
        tempPgImages.splice(index, 1);
        renderImagePreviews();
    };

    document.getElementById('pgImageInput')?.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        handleImageFiles(files);
        this.value = '';
    });

    const dropZone = document.getElementById('pgImageDropZone');
    if (dropZone) {
        dropZone.addEventListener('click', () => {
            document.getElementById('pgImageInput')?.click();
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
    }

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
        toProcess.forEach((file) => {
            const reader = new FileReader();
            reader.onload = function(ev) {
                tempPgImagesDataUrls.push(ev.target.result);
                tempPgImages.push(file);
                loaded++;
                if (progressBar) progressBar.style.width = `${(loaded / total) * 100}%`;
                if (loaded === total) {
                    setTimeout(() => {
                        if (progressBar) progressBar.style.width = '0%';
                        renderImagePreviews();
                        showToast(`${total} image(s) uploaded successfully.`, "success");
                    }, 300);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    function resetImageUpload() {
        tempPgImages = [];
        tempPgImagesDataUrls = [];
        renderImagePreviews();
        const input = document.getElementById('pgImageInput');
        if (input) input.value = '';
        const progress = document.getElementById('pgImageProgress');
        if (progress) progress.style.width = '0%';
        const dropZone = document.getElementById('pgImageDropZone');
        if (dropZone) dropZone.style.display = 'block';
    }

    // ============================================
    // QR CODE UPLOAD
    // ============================================
    document.getElementById('qrUpload')?.addEventListener('change', function(e) {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                tempQrDataUrl = ev.target.result;
                document.getElementById('qrPreviewImg').src = tempQrDataUrl;
                document.getElementById('qrPreviewContainer').classList.remove('d-none');
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('removeQrBtn')?.addEventListener('click', function() {
        tempQrDataUrl = null;
        document.getElementById('qrPreviewImg').src = '';
        document.getElementById('qrPreviewContainer').classList.add('d-none');
        document.getElementById('qrUpload').value = '';
    });

    // ============================================
    // AMENITIES HANDLING
    // ============================================
    function renderCustomAmenityTags() {
        const container = document.getElementById('customAmenityTags');
        if (!container) return;
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

    document.getElementById('addCustomAmenityBtn')?.addEventListener('click', function() {
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
        customAmenities.push(value);
        input.value = '';
        renderCustomAmenityTags();
        showToast(`Added "${value}" to amenities.`, "success");
    });

    document.getElementById('customAmenityInput')?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('addCustomAmenityBtn')?.click();
        }
    });

    function getSelectedAmenities() {
        const checkboxes = document.querySelectorAll('.amenity-checkbox:checked');
        const builtIn = Array.from(checkboxes).map(cb => cb.value);
        return [...builtIn, ...customAmenities];
    }

    function setAmenities(amenities) {
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

    // ============================================
    // FLOOR MANAGEMENT
    // ============================================
    function renderFloors() {
        const container = document.getElementById("floorsContainer");
        if (!container) return;
        const floorCount = Number(document.getElementById("pFloors").value) || 1;
        while (floorData.length < floorCount) floorData.push({ rooms: [] });
        while (floorData.length > floorCount) floorData.pop();

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
                                <span class="text-muted-soft">Rent:</span>
                                <input type="number" class="form-control form-control-sm room-rent" style="width:80px;" 
                                       value="${room.rent || 10000}" min="0" step="100"
                                       onchange="updateRoomRent(${index}, ${roomIndex}, this.value)">
                                <button type="button" class="btn-remove-room" onclick="removeRoom(${index}, ${roomIndex})" title="Remove room">
                                    <i class="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                    ${floor.rooms.length === 0 ? `<div class="text-muted-soft text-center py-2 small">No rooms added yet.</div>` : ''}
                </div>
                <button type="button" class="btn-add-room mt-2" onclick="addRoomToFloor(${index})">
                    <i class="bi bi-plus-circle"></i> Add Room to ${getFloorName(index)}
                </button>
            </div>
        `).join('');
    }

    function getFloorName(index) {
        const names = ["1st Floor", "2nd Floor", "3rd Floor", "4th Floor", "5th Floor", "6th Floor", "7th Floor", "8th Floor", "9th Floor", "10th Floor"];
        return names[index] || `${index + 1}th Floor`;
    }

    window.addRoomToFloor = function(floorIndex) {
        const floor = floorData[floorIndex];
        if (!floor) return;
        const existingNumbers = floor.rooms.map(r => parseInt(r.roomNo) || 0);
        const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 100 + floorIndex * 100;
        const nextNum = maxNum + 1;
        floor.rooms.push({ roomNo: String(nextNum), capacity: 2, occupants: [], rent: 10000 });
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
        if (room) { room.roomNo = value.trim() || "101"; renderFloors(); }
    };

    window.updateRoomCapacity = function(floorIndex, roomIndex, value) {
        const room = floorData[floorIndex].rooms[roomIndex];
        if (room) { room.capacity = Math.max(1, parseInt(value) || 1); }
    };

    window.updateRoomRent = function(floorIndex, roomIndex, value) {
        const room = floorData[floorIndex].rooms[roomIndex];
        if (room) { room.rent = Math.max(0, parseInt(value) || 0); }
    };

    document.getElementById("applyFloorsBtn")?.addEventListener("click", function() {
        const floorCount = Number(document.getElementById("pFloors").value) || 1;
        if (floorCount < 1) { showToast("Please enter at least 1 floor.", "warning"); return; }
        if (floorCount > 10) { showToast("Maximum 10 floors allowed.", "warning"); return; }
        renderFloors();
        showToast(`${floorCount} floor(s) configured.`, "success");
    });

    // ============================================
    // CREATE/EDIT PG
    // ============================================
    const pgModal = new bootstrap.Modal(document.getElementById("addPgModal"));

    document.querySelector('[data-bs-toggle="modal"][data-bs-target="#addPgModal"]')?.addEventListener("click", function() {
        if (!canAddPGs) {
            showToast("You don't have permission to add PGs.", "warning");
            return;
        }
        document.getElementById("pgModalTitle").textContent = "Add PG";
        document.getElementById("pgForm").reset();
        document.getElementById("pgId").value = "";
        floorData = [];
        document.getElementById("pFloors").value = 1;
        document.getElementById("pRent").value = "";
        document.getElementById("pSecurityFee").value = "";
        tempQrDataUrl = null;
        document.getElementById('qrPreviewContainer').classList.add('d-none');
        document.getElementById('qrUpload').value = '';
        resetImageUpload();
        resetAmenities();
        renderFloors();
    });

    window.editPg = async function(id) {
        if (!canEditPGs) {
            showToast("You don't have permission to edit PGs.", "warning");
            return;
        }
        try {
            const res = await API.pgs.getById(id);
            if (!res.success || !res.data) {
                showToast("PG not found.", "danger");
                return;
            }
            const p = res.data;
            document.getElementById("pgModalTitle").textContent = "Edit PG";
            document.getElementById("pgId").value = p.id;
            document.getElementById("pName").value = p.name || '';
            document.getElementById("pLocation").value = p.location || '';
            document.getElementById("pFloors").value = p.number_of_floors || 1;
            document.getElementById("pRent").value = p.rent || '';
            document.getElementById("pSecurityFee").value = p.security_fee || '';
            
            if (p.payment_qr) {
                tempQrDataUrl = p.payment_qr;
                document.getElementById('qrPreviewImg').src = p.payment_qr;
                document.getElementById('qrPreviewContainer').classList.remove('d-none');
            }
            
            if (p.images && p.images.length > 0) {
                tempPgImagesDataUrls = p.images.map(img => {
                    if (typeof img === 'string') return img;
                    if (img.image_url) return img.image_url;
                    return img;
                }).filter(Boolean);
                renderImagePreviews();
            }
            
            if (p.amenity_names && p.amenity_names.length > 0) {
                setAmenities(p.amenity_names);
            }
            
            floorData = [];
            if (p.floors && p.floors.length > 0) {
                p.floors.forEach(floor => {
                    const rooms = floor.rooms || [];
                    floorData.push({
                        rooms: rooms.map(r => ({
                            roomNo: r.room_number,
                            capacity: r.capacity || 2,
                            rent: r.rent || p.rent || 10000
                        }))
                    });
                });
            } else {
                for (let i = 0; i < (p.number_of_floors || 1); i++) {
                    floorData.push({ rooms: [] });
                }
            }
            renderFloors();
            pgModal.show();
        } catch (error) {
            showToast("Error loading PG: " + error.message, "danger");
        }
    };

    // ============================================
    // SUBMIT PG FORM
    // ============================================
    document.getElementById("pgForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        LOADER.show(btn, 'Saving PG...');

        try {
            const id = document.getElementById("pgId").value;
            const name = document.getElementById("pName").value.trim();
            const location = document.getElementById("pLocation").value.trim();
            const floors = Number(document.getElementById("pFloors").value);
            const rent = Number(document.getElementById("pRent").value) || 0;
            const securityFee = Number(document.getElementById("pSecurityFee").value) || 0;

            if (!name || !location) {
                showToast("Please enter PG name and location.", "warning");
                LOADER.hide(btn);
                return;
            }
            if (rent <= 0) {
                showToast("Please enter a valid base rent amount.", "warning");
                LOADER.hide(btn);
                return;
            }

            let hasEmptyFloor = false;
            let emptyFloorIndex = -1;
            
            for (let i = 0; i < floorData.length; i++) {
                if (!floorData[i].rooms || floorData[i].rooms.length === 0) {
                    hasEmptyFloor = true;
                    emptyFloorIndex = i;
                    break;
                }
            }

            if (hasEmptyFloor) {
                showToast(`Floor ${getFloorName(emptyFloorIndex)} must have at least one room. Please add a room.`, "warning");
                LOADER.hide(btn);
                return;
            }

            const selectedAmenities = getSelectedAmenities();

            const formattedFloors = floorData.map((floor, index) => {
                return {
                    floor_number: index + 1,
                    rooms: floor.rooms.map(room => ({
                        room_number: String(room.roomNo || room.room_number || `R${101 + Math.floor(Math.random() * 100)}`),
                        capacity: parseInt(room.capacity) || 2,
                        rent: parseFloat(room.rent) || rent
                    }))
                };
            });

            const data = {
                name: name,
                location: location,
                number_of_floors: floors,
                rent: rent,
                security_fee: securityFee,
                amenities: selectedAmenities.map(a => ({ 
                    name: a, 
                    is_custom: !['Free WiFi', '24×7 Assistance', '24×7 Power Backup', '43 Inch LED', 'Ventilated Rooms', 'Free Housekeeping', 'CCTV', 'AC'].includes(a) 
                })),
                floors: formattedFloors
            };

            const files = {};
            if (tempPgImages.length > 0) {
                files.images = tempPgImages;
            }
            if (tempQrDataUrl && tempQrDataUrl.startsWith('data:image')) {
                const response = await fetch(tempQrDataUrl);
                const blob = await response.blob();
                files.paymentQr = new File([blob], 'qr_code.png', { type: 'image/png' });
            }

            let res;
            if (id) {
                res = await API.pgs.update(id, data, files);
            } else {
                res = await API.pgs.create(data, files);
            }

            if (res.success) {
                showToast(res.message || `PG ${id ? 'updated' : 'added'} successfully.`, "success");
                pgModal.hide();
                loadPGs();
            } else {
                showToast(res.message || "Failed to save PG.", "danger");
            }
        } catch (error) {
            console.error("Error saving PG:", error);
            showToast(error.message || "An error occurred.", "danger");
        }
        LOADER.hide(btn);
    });

    // ============================================
    // DELETE PG - FULLY FIXED
    // ============================================
    const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
    let deletePgId = null;

    window.deletePg = function(id) {
        if (!canDeletePGs) {
            showToast("You don't have permission to delete PGs.", "warning");
            return;
        }
        
        console.log("Delete called with ID:", id, "Type:", typeof id);

        const p = pgData.find(x => String(x.id) === String(id));
        
        if (!p) {
            console.error("PG not found in pgData. ID:", id, "pgData:", pgData);
            showToast("PG not found. Please refresh the page and try again.", "danger");
            return;
        }

        deletePgId = id;
        document.getElementById("confirmTitle").textContent = `Delete "${p.name}"?`;
        document.getElementById("confirmBody").textContent = "This will remove the PG and all its rooms from your portfolio. This action cannot be undone.";
        document.getElementById("confirmActionBtn").onclick = async function() {
            const btn = this;
            LOADER.show(btn, 'Deleting...');
            try {
                console.log("Sending delete request for ID:", deletePgId);
                const res = await API.pgs.delete(deletePgId);
                console.log("Delete response:", res);
                
                if (res.success) {
                    showToast(res.message || `PG "${p.name}" deleted successfully.`, "success");
                    confirmModal.hide();
                    await loadPGs();
                } else {
                    showToast(res.message || "Failed to delete PG.", "danger");
                }
            } catch (error) {
                console.error("Delete error:", error);
                showToast("Error deleting PG: " + (error.message || "Unknown error"), "danger");
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    };

    // ============================================
    // INIT
    // ============================================
    loadPGs();
});