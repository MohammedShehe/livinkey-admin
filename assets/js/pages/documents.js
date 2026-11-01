document.addEventListener("DOMContentLoaded", () => {
    renderLayout("documents", "Documents", "Manage all tenant documents in one place");

    // ============================================
    // PERMISSION CHECKS
    // ============================================
    const canDeleteDocs = Permissions.canDelete('documents');
    const canViewDocs = Permissions.canView('documents');
    const canAddDocs = Permissions.canAdd('documents');

    const DOC_TYPES = {
        passport_photo: { label: "Photos", icon: "bi-person", color: "#3E7CB1" },
        signature: { label: "Signatures", icon: "bi-pen", color: "#7C5CFC" },
        tenant_aadhaar: { label: "Aadhar Cards", icon: "bi-card-text", color: "#4F8F2E" },
        parent_aadhaar: { label: "Parent Aadhar", icon: "bi-card-text", color: "#6FA030" },
        passport: { label: "Passports", icon: "bi-passport", color: "#E2A238" },
        visa: { label: "Visas", icon: "bi-stamp", color: "#D9483F" },
        arrival_stamp: { label: "Arrival Stamps", icon: "bi-stamp", color: "#4B7B8A" },
        c_form: { label: "C-Forms", icon: "bi-file-earmark-text", color: "#92C24A" },
        efrro: { label: "E-FRRO", icon: "bi-file-earmark-check", color: "#7C8A76" },
        agreement: { label: "Agreements", icon: "bi-file-earmark-text", color: "#6B4E71" },
        university_id: { label: "University IDs", icon: "bi-mortarboard", color: "#8B6FA3" },
        // Vehicle
        vehicle_photo: { label: "Vehicle Photo", icon: "bi-car-front", color: "#0D9488" },
        vehicle_rc: { label: "RC Photo", icon: "bi-card-heading", color: "#0891B2" },
        driver_license: { label: "Driver License", icon: "bi-person-vcard", color: "#2563EB" }
    };

    const VEHICLE_DOC_KEYS = ["vehicle_photo", "vehicle_rc", "driver_license"];

    let currentFilter = "all";
    let currentPgFilter = "all";
    // active | inactive | archived | checked_out | all
    let currentStatusFilter = "active";
    let currentVehicleFilter = "all"; // all | vehicle | non_vehicle
    let currentReview = new URLSearchParams(location.search).get("review") || "all"; // all | pending | approved | rejected
    const canReview = Permissions.canEdit('documents');
    const REVIEW = {
        pending: { label: "Needs review", cls: "chip-amber", icon: "bi-hourglass-split" },
        approved: { label: "Approved", cls: "chip-green", icon: "bi-check-circle" },
        rejected: { label: "Rejected", cls: "chip-red", icon: "bi-x-circle" }
    };
    const isNew = (d) => d.review_status === "pending" && !d.admin_seen_at;
    let selectedDocs = new Set();
    let allDocs = [];
    let pgList = [];
    let statusStats = { active: 0, inactive: 0, archived: 0, checked_out: 0, all: 0 };
    
    // Store documents by ID for quick lookup
    let docsById = {};

    // ============================================
    // FETCH DOCUMENTS
    // ============================================
    async function loadDocuments() {
        PAGE_LOADER.grid(document.getElementById("documentsGrid"), "Loading documents...");
        PAGE_LOADER.hideEmpty("documentsEmpty");
        PAGE_LOADER.element(document.getElementById("docStats"), "Loading stats...");
        try {
            const params = { tenant_status: currentStatusFilter };
            if (currentPgFilter !== "all") params.pg_id = currentPgFilter;

            // Load status counts in parallel (for filter chips)
            const [res, activeRes, inactiveRes, archivedRes, checkedRes, allRes] = await Promise.all([
                API.documents.admin.getAll(params),
                API.documents.admin.getAll({ tenant_status: 'active', ...(currentPgFilter !== 'all' ? { pg_id: currentPgFilter } : {}) }),
                API.documents.admin.getAll({ tenant_status: 'inactive', ...(currentPgFilter !== 'all' ? { pg_id: currentPgFilter } : {}) }),
                API.documents.admin.getAll({ tenant_status: 'archived', ...(currentPgFilter !== 'all' ? { pg_id: currentPgFilter } : {}) }),
                API.documents.admin.getAll({ tenant_status: 'checked_out', ...(currentPgFilter !== 'all' ? { pg_id: currentPgFilter } : {}) }),
                API.documents.admin.getAll({ tenant_status: 'all', ...(currentPgFilter !== 'all' ? { pg_id: currentPgFilter } : {}) })
            ]);

            statusStats = {
                active: (activeRes.success && activeRes.data) ? activeRes.data.length : 0,
                inactive: (inactiveRes.success && inactiveRes.data) ? inactiveRes.data.length : 0,
                archived: (archivedRes.success && archivedRes.data) ? archivedRes.data.length : 0,
                checked_out: (checkedRes.success && checkedRes.data) ? checkedRes.data.length : 0,
                all: (allRes.success && allRes.data) ? allRes.data.length : 0
            };
            renderStatusFilter();

            if (res.success) {
                allDocs = res.data || [];
                docsById = {};
                allDocs.forEach(d => {
                    docsById[d.id] = d;
                });
                renderGrid();
            } else {
                showToast(res.message || "Failed to load documents", "danger");
            }
        } catch (error) {
            const grid = document.getElementById("documentsGrid");
            if (grid) grid.innerHTML = `<div class="col-12 text-center py-5 text-danger">Failed to load documents. Please try again.</div>`;
            showToast("Error loading documents: " + error.message, "danger");
        }
    }

    function renderStatusFilter() {
        const el = document.getElementById('tenantStatusFilter');
        if (!el) return;
        const opts = [
            { key: 'active', label: 'Active tenants', count: statusStats.active },
            { key: 'all', label: 'All (active + inactive)', count: statusStats.all },
            { key: 'inactive', label: 'Inactive', count: statusStats.inactive },
            { key: 'archived', label: 'Archived', count: statusStats.archived },
            { key: 'checked_out', label: 'Checked out', count: statusStats.checked_out }
        ];
        el.innerHTML = opts.map(o => `
            <button type="button" class="btn btn-sm ${currentStatusFilter === o.key ? 'btn-brand' : 'btn-outline-brand'} me-1 mb-1"
                    data-status="${o.key}">
              ${lkEsc(o.label)} <span class="badge bg-light text-dark ms-1">${o.count}</span>
            </button>
        `).join('');
        el.querySelectorAll('button[data-status]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentStatusFilter = btn.dataset.status;
                selectedDocs.clear();
                updateBulkActions();
                loadDocuments();
            });
        });
    }

    function renderReviewFilter() {
        const el = document.getElementById("reviewFilter");
        if (!el) return;
        const c = { all: allDocs.length, pending: 0, approved: 0, rejected: 0, fresh: 0 };
        allDocs.forEach(d => { c[d.review_status || "approved"]++; if (isNew(d)) c.fresh++; });
        const opts = [
            { key: "all", label: "All", icon: "bi-collection" },
            { key: "pending", label: "Needs review", icon: "bi-hourglass-split" },
            { key: "approved", label: "Approved", icon: "bi-check-circle" },
            { key: "rejected", label: "Rejected", icon: "bi-x-circle" }
        ];
        el.innerHTML = opts.map(o => `<button type="button" class="pg-pill ${currentReview === o.key ? "active" : ""}" data-review="${o.key}"><i class="bi ${o.icon}"></i> ${o.label} <b>${c[o.key]}</b>${o.key === "pending" && c.fresh ? ` <span class="chip chip-red" style="padding:0 .4rem">${c.fresh} new</span>` : ""}</button>`).join("");
        el.querySelectorAll("[data-review]").forEach(b => b.addEventListener("click", () => { currentReview = b.dataset.review; selectedDocs.clear(); updateBulkActions(); renderGrid(); }));
    }

    function getFilteredDocs() {
        let docs = allDocs;
        if (currentReview !== "all") docs = docs.filter(d => (d.review_status || "approved") === currentReview);
        if (currentFilter === "all") {
            // keep all types
        } else if (currentFilter === "vehicle_all") {
            docs = docs.filter(d => VEHICLE_DOC_KEYS.includes(d.document_type));
        } else {
            docs = docs.filter(d => (d.document_type || "other") === currentFilter);
        }
        if (currentVehicleFilter === "vehicle") {
            docs = docs.filter(d => d.has_vehicle == 1 || d.has_vehicle === true || VEHICLE_DOC_KEYS.includes(d.document_type));
        } else if (currentVehicleFilter === "non_vehicle") {
            docs = docs.filter(d => !VEHICLE_DOC_KEYS.includes(d.document_type));
        }
        return docs;
    }

    // ============================================
    // LOAD PG LIST
    // ============================================
    async function loadPGs() {
        try {
            const res = await API.pgs.getAll();
            if (res.success) {
                pgList = res.data || [];
                populatePgFilter();
            }
        } catch (error) {
            console.error("Error loading PGs:", error);
        }
    }

    function populatePgFilter() {
        const select = document.getElementById("pgFilter");
        if (!select) return;
        let options = '<option value="all">All PGs</option>';
        pgList.forEach(pg => {
            const selected = currentPgFilter === String(pg.id) ? "selected" : "";
            options += `<option value="${pg.id}" ${selected}>${lkEsc(pg.name)}</option>`;
        });
        select.innerHTML = options;
    }

    // ============================================
    // RENDER STATS
    // ============================================
    function renderStats() {
        const counts = {};
        allDocs.forEach(d => {
            const type = d.document_type || 'other';
            counts[type] = (counts[type] || 0) + 1;
        });

        // Always show All + Vehicle group + every known document type
        const vehicleCount = VEHICLE_DOC_KEYS.reduce((n, k) => n + (counts[k] || 0), 0);
        const stats = [
            { key: "all", label: "All Documents", icon: "bi-files", color: "#0B0F0A", count: allDocs.length },
            { key: "vehicle_all", label: "Vehicle Docs", icon: "bi-car-front", color: "#0D9488", count: vehicleCount }
        ];

        Object.keys(DOC_TYPES).forEach(key => {
            stats.push({
                key: key,
                label: DOC_TYPES[key].label,
                icon: DOC_TYPES[key].icon,
                color: DOC_TYPES[key].color,
                count: counts[key] || 0
            });
        });

        document.getElementById("docStats").innerHTML = stats.map(s => `
            <div class="col-6 col-md-4 col-lg-2">
                <div class="doc-stat-card ${currentFilter === s.key ? 'active' : ''}" onclick="filterByDocType('${s.key}')">
                    <div class="doc-stat-icon" style="background:${s.color}22;color:${s.color};">
                        <i class="bi ${s.icon}"></i>
                    </div>
                    <div>
                        <div class="doc-stat-value">${s.count}</div>
                        <div class="doc-stat-label">${lkEsc(s.label)}</div>
                    </div>
                </div>
            </div>
        `).join("");
    }

    window.filterByDocType = function(type) {
        currentFilter = type;
        selectedDocs.clear();
        const sel = document.getElementById("selectAllDocs");
        if (sel) sel.checked = false;
        renderGrid();
    };

    function filterByPg(pgId) {
        currentPgFilter = pgId;
        selectedDocs.clear();
        document.getElementById("selectAllDocs").checked = false;
        loadDocuments();
    }

    // ============================================
    // RENDER GRID
    // ============================================
    function renderGrid() {
        const grid = document.getElementById("documentsGrid");
        const empty = document.getElementById("documentsEmpty");
        const totalCount = document.getElementById("totalDocsCount");
        const filtered = getFilteredDocs();

        renderStats();
        renderReviewFilter();

        if (filtered.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove("d-none");
            if (totalCount) totalCount.textContent = currentFilter === "all"
                ? "0 documents"
                : `0 ${DOC_TYPES[currentFilter]?.label || currentFilter}`;
            return;
        }
        empty.classList.add("d-none");
        if (totalCount) {
            totalCount.textContent = currentFilter === "all"
                ? `${filtered.length} documents`
                : `${filtered.length} ${DOC_TYPES[currentFilter]?.label || currentFilter}`;
        }

        grid.innerHTML = filtered.map(d => {
            const docLabel = DOC_TYPES[d.document_type]?.label || d.document_type || 'Document';
            const isSelected = selectedDocs.has(d.id);
            const url = (d.document_url || '').toLowerCase();
            const isPdf = url.includes('.pdf') || url.includes('/raw/') || (d.mime_type && String(d.mime_type).toLowerCase().includes('pdf')) ||
                (d.document_type === 'agreement' && !url.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i));
            const thumbHtml = isPdf
                ? `<div style="height:160px;display:flex;align-items:center;justify-content:center;background:#1a1a1a;cursor:pointer;" onclick="previewDocument('${d.id}')"><i class="bi bi-file-earmark-pdf" style="font-size:3rem;color:#e74c3c;"></i></div>`
                : `<img src="${d.document_url || 'https://placehold.co/300x160/E1E8D8/7C8A76?text=' + encodeURIComponent(docLabel)}" alt="${docLabel}" style="height:160px;cursor:pointer;object-fit:cover;width:100%;" onclick="previewDocument('${d.id}')" onerror="this.onerror=null;this.src='https://placehold.co/300x160/E1E8D8/7C8A76?text='+encodeURIComponent('${docLabel.replace(/'/g, "\\'")}');">`;
            return `
            <div class="col-md-4 col-lg-3 doc-card-wrapper ${isSelected ? 'selected' : ''}" data-id="${d.id}">
                <input type="checkbox" class="doc-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleDocSelection('${d.id}')">
                <div class="doc-thumb">
                    ${thumbHtml}
                    <div class="doc-actions">
                        <button class="btn-icon" style="background:var(--surface);" title="Preview" onclick="event.stopPropagation(); previewDocument('${d.id}')"><i class="bi bi-eye"></i></button>
                        <button class="btn-icon" style="background:var(--surface);" title="Download" onclick="event.stopPropagation(); downloadDocument('${d.id}')"><i class="bi bi-download"></i></button>
                        ${canDeleteDocs ? `<button class="btn-icon" style="background:var(--surface);color:var(--danger);" title="Delete" onclick="event.stopPropagation(); deleteDocument('${d.id}')"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                    <div class="doc-label">
                        <div class="fw-bold">${docLabel}${VEHICLE_DOC_KEYS.includes(d.document_type) ? ' <span class="badge bg-teal-subtle text-teal" style="font-size:.65rem;background:#0d948833;color:#5eead4;">Vehicle</span>' : ''}</div>
                        <div class="small text-muted-soft">${lkEsc(d.tenant_name || '—')} · Room ${lkEsc(d.room_number || '—')}${d.vehicle_number ? ' · <i class="bi bi-car-front"></i> ' + d.vehicle_number : ''}</div>
                        <div class="small text-muted-soft"><i class="bi bi-building me-1"></i>${lkEsc(d.pg_name || '—')}</div>
                        <div class="mt-1 d-flex flex-wrap gap-1 align-items-center">
                            ${isNew(d) ? '<span class="chip chip-red">NEW</span>' : ''}
                            <span class="chip ${(REVIEW[d.review_status] || REVIEW.approved).cls}"><i class="bi ${(REVIEW[d.review_status] || REVIEW.approved).icon}"></i> ${(REVIEW[d.review_status] || REVIEW.approved).label}</span>
                        </div>
                        <div class="small text-muted-soft mt-1" title="${lkEsc(LKUI.fmtDateTime(d.created_at))}"><i class="bi bi-cloud-upload me-1"></i>Uploaded ${lkEsc(LKUI.timeAgo(d.created_at))}${d.uploaded_by_type === 'admin' ? ' by admin' : ''}</div>
                        ${d.review_status === 'rejected' && d.review_note ? `<div class="small text-danger mt-1"><i class="bi bi-chat-left-text me-1"></i>${lkEsc(d.review_note)}</div>` : ''}
                        ${canReview && d.review_status !== 'approved' ? `<div class="d-flex gap-1 mt-2" onclick="event.stopPropagation()">
                            <button class="btn btn-brand btn-sm flex-grow-1" onclick="reviewDoc('${d.id}','approve')"><i class="bi bi-check2"></i> Approve</button>
                            ${d.review_status === 'pending' ? `<button class="btn btn-soft-danger btn-sm flex-grow-1" onclick="reviewDoc('${d.id}','reject')"><i class="bi bi-x-lg"></i> Reject</button>` : ''}</div>` : ''}
                        ${canReview && d.review_status === 'approved' ? `<button class="btn btn-sm btn-ghost mt-2 w-100" onclick="event.stopPropagation(); reviewDoc('${d.id}','reject')"><i class="bi bi-arrow-counterclockwise"></i> Reject / ask for re-upload</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join("");

        updateBulkActions();
        renderStats();
    }

    // ============================================
    // SELECTION FUNCTIONS
    // ============================================
    window.toggleDocSelection = function(id) {
        if (selectedDocs.has(id)) selectedDocs.delete(id);
        else selectedDocs.add(id);
        updateBulkActions();
        const card = document.querySelector(`.doc-card-wrapper[data-id="${id}"]`);
        if (card) card.classList.toggle('selected', selectedDocs.has(id));
        const checkbox = card?.querySelector('.doc-checkbox');
        if (checkbox) checkbox.checked = selectedDocs.has(id);
        updateSelectAllState();
    };

    function updateBulkActions() {
        const count = selectedDocs.size;
        const bulkActions = document.getElementById("bulkActions");
        const bulkCount = document.getElementById("bulkCount");
        
        ["bulkApproveBtn", "bulkRejectBtn"].forEach(id => { const b = document.getElementById(id); if (b) b.style.display = canReview && count > 0 ? "" : "none"; });
        const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
        if (bulkDeleteBtn) {
            bulkDeleteBtn.style.display = canDeleteDocs && count > 0 ? '' : 'none';
        }
        
        if (count > 0) {
            bulkActions.classList.add("show");
            bulkCount.textContent = `${count} selected`;
        } else {
            bulkActions.classList.remove("show");
        }
    }

    function updateSelectAllState() {
        const checkboxes = document.querySelectorAll('.doc-checkbox');
        const checked = document.querySelectorAll('.doc-checkbox:checked');
        const selectAll = document.getElementById("selectAllDocs");
        if (checkboxes.length === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
            return;
        }
        if (checked.length === checkboxes.length) {
            selectAll.checked = true;
            selectAll.indeterminate = false;
        } else if (checked.length > 0) {
            selectAll.checked = false;
            selectAll.indeterminate = true;
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        }
    }

    document.getElementById("selectAllDocs")?.addEventListener("change", function() {
        const checked = this.checked;
        document.querySelectorAll('.doc-checkbox').forEach(cb => {
            cb.checked = checked;
            const card = cb.closest('.doc-card-wrapper');
            if (card) {
                const id = card.dataset.id;
                if (checked) selectedDocs.add(id);
                else selectedDocs.delete(id);
                card.classList.toggle('selected', checked);
            }
        });
        updateBulkActions();
    });

    document.getElementById("bulkClearBtn")?.addEventListener("click", function() {
        selectedDocs.clear();
        document.getElementById("selectAllDocs").checked = false;
        document.querySelectorAll('.doc-checkbox').forEach(cb => {
            cb.checked = false;
            const card = cb.closest('.doc-card-wrapper');
            if (card) card.classList.remove('selected');
        });
        updateBulkActions();
    });

    // ============================================
    // BULK DOWNLOAD
    // ============================================
    document.getElementById("bulkDownloadBtn")?.addEventListener("click", async function() {
        const count = selectedDocs.size;
        if (count === 0) {
            showToast("No documents selected.", "warning");
            return;
        }
        const btn = this;
        LOADER.show(btn, 'Downloading...');
        try {
            const token = Auth.getTokenFromStorage();
            if (!token) {
                showToast("Please login to download documents.", "warning");
                LOADER.hide(btn);
                return;
            }

            const response = await fetch(`${API_CONFIG.baseURL}/documents/admin/download`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include',
                body: JSON.stringify({ documentIds: Array.from(selectedDocs) })
            });

            if (!response.ok) {
                let msg = "Failed to download documents.";
                try {
                    const errJson = await response.json();
                    msg = errJson.message || msg;
                } catch (e) { /* body wasn't JSON, keep default message */ }
                showToast(msg, "danger");
                LOADER.hide(btn);
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'documents.zip';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            showToast(`${count} documents downloaded.`, "success");
            selectedDocs.clear();
            document.getElementById("selectAllDocs").checked = false;
            document.querySelectorAll('.doc-checkbox').forEach(cb => {
                cb.checked = false;
                const card = cb.closest('.doc-card-wrapper');
                if (card) card.classList.remove('selected');
            });
            updateBulkActions();
        } catch (error) {
            showToast("Error downloading: " + error.message, "danger");
        }
        LOADER.hide(btn);
    });

    // ============================================
    // BULK DELETE
    // ============================================
    document.getElementById("bulkDeleteBtn")?.addEventListener("click", function() {
        if (!canDeleteDocs) {
            showToast("You don't have permission to delete documents.", "warning");
            return;
        }
        
        const count = selectedDocs.size;
        if (count === 0) {
            showToast("No documents selected.", "warning");
            return;
        }
        document.getElementById("confirmTitle").textContent = `Delete ${count} selected documents?`;
        document.getElementById("confirmBody").textContent = `This will permanently remove ${count} documents. This action cannot be undone.`;
        document.getElementById("confirmActionBtn").onclick = async function() {
            const btn = this;
            LOADER.show(btn, 'Deleting...');
            try {
                let deleted = 0;
                for (const id of selectedDocs) {
                    const res = await API.documents.admin.delete(id);
                    if (res.success) deleted++;
                }
                showToast(`${deleted} documents deleted.`, "success");
                selectedDocs.clear();
                document.getElementById("selectAllDocs").checked = false;
                confirmModal.hide();
                loadDocuments();
            } catch (error) {
                showToast("Error deleting: " + error.message, "danger");
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    });

    // ============================================
    // PREVIEW DOCUMENT - FIXED
    // ============================================
    const previewModal = new bootstrap.Modal(document.getElementById("docPreviewModal"));
    let currentDocId = null;

    window.previewDocument = function(id) {
        // Try to find the document in the lookup map first
        let doc = docsById[id];
        
        // If not found, try to find it in the allDocs array
        if (!doc) {
            doc = allDocs.find(d => d.id === id);
        }
        
        // If still not found, try to fetch it directly from the API
        if (!doc) {
            // Try to fetch the document directly
            API.documents.admin.getAll({ document_type: currentFilter !== "all" ? currentFilter : undefined })
                .then(res => {
                    if (res.success && res.data) {
                        const found = res.data.find(d => d.id === id);
                        if (found) {
                            // Update our local cache
                            allDocs = res.data;
                            docsById = {};
                            allDocs.forEach(d => {
                                docsById[d.id] = d;
                            });
                            showPreviewModal(found);
                            return;
                        }
                    }
                    showToast("Document not found. Please refresh the page.", "warning");
                })
                .catch(() => {
                    showToast("Document not found. Please refresh the page.", "warning");
                });
            return;
        }
        
        showPreviewModal(doc);
    };

    function showPreviewModal(doc) {
        currentDocId = doc.id;
        if (isNew(doc)) { doc.admin_seen_at = new Date().toISOString(); API.documents.admin.markSeen([doc.id]).catch(() => {}); setTimeout(renderGrid, 0); }
        const label = DOC_TYPES[doc.document_type]?.label || doc.document_type || 'Document';
        document.getElementById("docPreviewTitle").textContent = `${label} - ${doc.tenant_name || 'Tenant'}`;
        const url = doc.document_url || '';
        const body = document.getElementById("docPreviewBody");
        const img = document.getElementById("docPreviewImg");
        const lower = (url || '').toLowerCase();
        const isPdf = lower.includes('.pdf') || lower.includes('application/pdf') || lower.includes('/raw/') ||
            (doc.mime_type && String(doc.mime_type).toLowerCase().includes('pdf')) ||
            (doc.document_type === 'agreement' && !lower.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i));
        if (body) {
            if (isPdf || (!lower.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i) && lower.includes('cloudinary') && !lower.includes('/image/'))) {
                body.innerHTML = `<iframe src="${url}" style="width:100%;height:70vh;border:none;border-radius:8px;background:#fff;" title="Preview"></iframe>
                    <p class="text-muted-soft small mt-2 mb-0">If the preview does not load, use Download.</p>`;
            } else {
                body.innerHTML = `<img id="docPreviewImg" src="${url}" alt="${lkEsc(label)}" class="img-fluid" style="max-height:70vh;object-fit:contain;border-radius:8px;" onerror="this.src='https://placehold.co/600x400/E1E8D8/7C8A76?text=No+Image'">`;
            }
        } else if (img) {
            img.src = url;
            img.style.display = '';
            img.onerror = function() { this.src = 'https://placehold.co/600x400/E1E8D8/7C8A76?text=No+Image'; };
        }
        const st = REVIEW[doc.review_status] || REVIEW.approved;
        const panel = document.createElement("div");
        panel.className = "mt-3 p-3 rounded-3 text-start";
        panel.style.cssText = "background:var(--lk-green-50);border:1px solid var(--border)";
        panel.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div><span class="chip ${st.cls}"><i class="bi ${st.icon}"></i> ${st.label}</span>
              <span class="small text-muted-soft ms-2">Uploaded ${lkEsc(LKUI.timeAgo(doc.created_at))}${doc.reviewed_at ? ` · reviewed ${lkEsc(LKUI.timeAgo(doc.reviewed_at))}${doc.reviewed_by_name ? ' by ' + lkEsc(doc.reviewed_by_name) : ''}` : ''}</span></div>
            ${canReview ? `<div class="d-flex gap-2">${doc.review_status !== 'approved' ? `<button class="btn btn-brand btn-sm" id="pvApprove"><i class="bi bi-check2"></i> Approve</button>` : ''}<button class="btn btn-soft-danger btn-sm" id="pvReject"><i class="bi bi-x-lg"></i> Reject</button></div>` : ''}</div>
            ${doc.review_note ? `<div class="small mt-2"><b>Note to tenant:</b> ${lkEsc(doc.review_note)}</div>` : ''}`;
        if (body) body.appendChild(panel);
        const a = panel.querySelector("#pvApprove"), r = panel.querySelector("#pvReject");
        if (a) a.onclick = async () => { await window.reviewDoc(doc.id, "approve"); previewModal.hide(); };
        if (r) r.onclick = async () => { if (await window.reviewDoc(doc.id, "reject")) previewModal.hide(); };
        previewModal.show();
    }

    // ============================================
    // REVIEW (approve / reject)
    // ============================================
    async function askReason(count) {
        const note = await LKUI.prompt({ title: count > 1 ? `Reject ${count} documents` : "Reject this document", body: "Tell the tenant what is wrong so they can upload a correct one. They will get this as a notification.", placeholder: "e.g. The photo is blurry. Please upload a clear one.", confirmText: "Reject", required: true });
        return note && note.trim() ? note.trim() : null;
    }
    window.reviewDoc = async function (id, action) {
        let note = null;
        if (action === "reject") { note = await askReason(1); if (!note) return false; }
        try {
            const res = await API.documents.admin.review(id, action, note);
            const d = docsById[id];
            if (d) { d.review_status = res.data.review_status; d.review_note = res.data.review_note; d.reviewed_at = new Date().toISOString(); d.admin_seen_at = d.admin_seen_at || d.reviewed_at; }
            showToast(res.message, "success");
            renderGrid();
            return true;
        } catch (e) { showToast(e.message || "Could not update the document", "danger"); return false; }
    };
    async function bulkReview(action) {
        const ids = [...selectedDocs].map(Number);
        if (!ids.length) return;
        let note = null;
        if (action === "reject") { note = await askReason(ids.length); if (!note) return; }
        else if (!await LKUI.confirm({ title: `Approve ${ids.length} document${ids.length === 1 ? "" : "s"}?`, body: "The tenants will be notified.", tone: "ok", confirmText: "Approve" })) return;
        try {
            const res = await API.documents.admin.reviewBulk(ids, action, note);
            showToast(res.message, res.success ? "success" : "warning");
            selectedDocs.clear(); loadDocuments();
        } catch (e) { showToast(e.message || "Bulk review failed", "danger"); }
    }
    document.getElementById("bulkApproveBtn")?.addEventListener("click", () => bulkReview("approve"));
    document.getElementById("bulkRejectBtn")?.addEventListener("click", () => bulkReview("reject"));

    // ============================================
    // DOWNLOAD DOCUMENT - FIXED
    // ============================================
    window.downloadDocument = function(id) {
        const token = Auth.getTokenFromStorage();
        if (!token) {
            showToast("Please login to download documents.", "warning");
            return;
        }
        window.openAuthorizedUrl(`/documents/admin/${encodeURIComponent(id)}/download`);
        showToast("Document download started.", "info");
    };

    // ============================================
    // DELETE DOCUMENT - FIXED
    // ============================================
    const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));

    window.deleteDocument = function(id) {
        if (!canDeleteDocs) {
            showToast("You don't have permission to delete documents.", "warning");
            return;
        }
        
        // Try to find the document in the lookup map first
        let doc = docsById[id];
        
        // If not found, try to find it in the allDocs array
        if (!doc) {
            doc = allDocs.find(d => d.id === id);
        }
        
        if (!doc) {
            showToast("Document not found. Please refresh the page.", "warning");
            return;
        }
        
        const label = DOC_TYPES[doc.document_type]?.label || doc.document_type || 'Document';
        document.getElementById("confirmTitle").textContent = `Delete ${label}?`;
        document.getElementById("confirmBody").textContent = `This will permanently remove ${label} for ${doc.tenant_name || 'tenant'}.`;
        document.getElementById("confirmActionBtn").onclick = async function() {
            const btn = this;
            LOADER.show(btn, 'Deleting...');
            try {
                const res = await API.documents.admin.delete(id);
                if (res.success) {
                    showToast(`${label} deleted.`, "success");
                    confirmModal.hide();
                    selectedDocs.delete(id);
                    loadDocuments();
                } else {
                    showToast(res.message || "Failed to delete document.", "danger");
                }
            } catch (error) {
                showToast("Error deleting: " + error.message, "danger");
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    };

    // ============================================
    // PREVIEW MODAL BUTTONS - FIXED
    // ============================================
    document.getElementById("docDownloadBtn")?.addEventListener("click", function() {
        if (currentDocId) {
            downloadDocument(currentDocId);
        } else {
            showToast("No document selected.", "warning");
        }
    });

    document.getElementById("docDeleteBtn")?.addEventListener("click", function() {
        if (currentDocId) {
            deleteDocument(currentDocId);
        } else {
            showToast("No document selected.", "warning");
        }
    });

    // ============================================
    // SEARCH
    // ============================================
    document.getElementById("docSearch")?.addEventListener("input", function() {
        const term = this.value.trim().toLowerCase();
        if (!term) {
            loadDocuments();
            return;
        }
        const filtered = allDocs.filter(d =>
            (d.tenant_name || '').toLowerCase().includes(term) ||
            (d.room_number || '').toLowerCase().includes(term) ||
            (d.pg_name || '').toLowerCase().includes(term) ||
            (d.document_type || '').toLowerCase().includes(term)
        );
        const temp = allDocs;
        allDocs = filtered;
        renderGrid();
        allDocs = temp;
    });

    // ============================================
    // PG FILTER
    // ============================================
    document.getElementById("pgFilter")?.addEventListener("change", function() {
        filterByPg(this.value);
    });

    // ============================================
    // INIT
    // ============================================
    LKUI.onRefresh(() => loadDocuments());
    loadPGs();
    loadDocuments();
});