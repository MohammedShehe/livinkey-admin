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
        tenant_aadhaar: { label: "Aadhar Cards", icon: "bi-card-text", color: "#4F8F2E" },
        parent_aadhaar: { label: "Parent Aadhar", icon: "bi-card-text", color: "#6FA030" },
        passport: { label: "Passports", icon: "bi-passport", color: "#E2A238" },
        visa: { label: "Visas", icon: "bi-stamp", color: "#D9483F" },
        arrival_stamp: { label: "Arrival Stamps", icon: "bi-stamp", color: "#4B7B8A" },
        c_form: { label: "C-Forms", icon: "bi-file-earmark-text", color: "#92C24A" },
        efrro: { label: "E-FRRO", icon: "bi-file-earmark-check", color: "#7C8A76" },
        university_id: { label: "University IDs", icon: "bi-mortarboard", color: "#8B6FA3" }
    };

    let currentFilter = "all";
    let currentPgFilter = "all";
    let selectedDocs = new Set();
    let allDocs = [];
    let pgList = [];
    
    // Store documents by ID for quick lookup
    let docsById = {};

    // ============================================
    // FETCH DOCUMENTS
    // ============================================
    async function loadDocuments() {
        try {
            // Always load full set for current PG so type menu cards stay visible.
            // Document-type filtering is applied client-side in getFilteredDocs().
            const params = {};
            if (currentPgFilter !== "all") params.pg_id = currentPgFilter;

            const res = await API.documents.admin.getAll(params);
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
            showToast("Error loading documents: " + error.message, "danger");
        }
    }

    function getFilteredDocs() {
        if (currentFilter === "all") return allDocs;
        return allDocs.filter(d => (d.document_type || "other") === currentFilter);
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
            options += `<option value="${pg.id}" ${selected}>${pg.name}</option>`;
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

        // Always show All + every known document type so menus never disappear when filtering
        const stats = [
            { key: "all", label: "All Documents", icon: "bi-files", color: "#0B0F0A", count: allDocs.length }
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
                        <div class="doc-stat-label">${s.label}</div>
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
            return `
            <div class="col-md-4 col-lg-3 doc-card-wrapper ${isSelected ? 'selected' : ''}" data-id="${d.id}">
                <input type="checkbox" class="doc-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleDocSelection('${d.id}')">
                <div class="doc-thumb">
                    <img src="${d.document_url || 'https://placehold.co/300x160/E1E8D8/7C8A76?text=' + encodeURIComponent(docLabel)}" alt="${docLabel}" style="height:160px;cursor:pointer;" onclick="previewDocument('${d.id}')">
                    <div class="doc-actions">
                        <button class="btn-icon" style="background:#fff;" title="Preview" onclick="event.stopPropagation(); previewDocument('${d.id}')"><i class="bi bi-eye"></i></button>
                        <button class="btn-icon" style="background:#fff;" title="Download" onclick="event.stopPropagation(); downloadDocument('${d.id}')"><i class="bi bi-download"></i></button>
                        ${canDeleteDocs ? `<button class="btn-icon" style="background:#fff;color:var(--danger);" title="Delete" onclick="event.stopPropagation(); deleteDocument('${d.id}')"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                    <div class="doc-label">
                        <div class="fw-bold">${docLabel}</div>
                        <div class="small text-muted-soft">${d.tenant_name || '—'} · Room ${d.room_number || '—'}</div>
                        <div class="small text-muted-soft"><i class="bi bi-building me-1"></i>${d.pg_name || '—'}</div>
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
        const label = DOC_TYPES[doc.document_type]?.label || doc.document_type || 'Document';
        document.getElementById("docPreviewTitle").textContent = `${label} - ${doc.tenant_name || 'Tenant'}`;
        document.getElementById("docPreviewImg").src = doc.document_url || '';
        document.getElementById("docPreviewImg").onerror = function() {
            this.src = 'https://placehold.co/600x400/E1E8D8/7C8A76?text=No+Image';
        };
        previewModal.show();
    }

    // ============================================
    // DOWNLOAD DOCUMENT - FIXED
    // ============================================
    window.downloadDocument = function(id) {
        const token = Auth.getTokenFromStorage();
        if (!token) {
            showToast("Please login to download documents.", "warning");
            return;
        }
        window.open(`${API_CONFIG.baseURL}/documents/admin/${id}/download?token=${encodeURIComponent(token)}`, '_blank');
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
    loadPGs();
    loadDocuments();
});