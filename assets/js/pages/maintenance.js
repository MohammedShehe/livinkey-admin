// Livinkey Admin - Maintenance Management
// Full backend integration for maintenance requests

document.addEventListener("DOMContentLoaded", () => {
    renderLayout("maintenance", "Maintenance", "All tenant maintenance queries in one place");

    // ============================================
    // PERMISSION CHECKS
    // ============================================
    const canEditMaintenance = Permissions.canEdit('maintenance');
    const canDeleteMaintenance = Permissions.canDelete('maintenance');
    const canViewMaintenance = Permissions.canView('maintenance');

    let maintenanceData = [];
    let searchTerm = "";

    // ============================================
    // FETCH MAINTENANCE REQUESTS
    // ============================================
    async function loadMaintenance() {
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            const res = await API.maintenance.admin.getAll(params);
            if (res.success) {
                maintenanceData = res.data || [];
                renderTable();
            } else {
                showToast(res.message || "Failed to load maintenance requests", "danger");
            }
        } catch (error) {
            showToast("Error loading maintenance: " + error.message, "danger");
        }
    }

    function renderTable() {
        const f = searchTerm.trim().toLowerCase();
        let filtered = maintenanceData;
        if (f) {
            filtered = maintenanceData.filter(m =>
                (m.room_number || '').toLowerCase().includes(f) ||
                (m.tenant_name || '').toLowerCase().includes(f) ||
                (m.issue_type || '').toLowerCase().includes(f) ||
                (m.email || '').toLowerCase().includes(f)
            );
        }

        const tbody = document.getElementById("maintenanceTbody");
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            document.getElementById("maintenanceEmpty").classList.remove("d-none");
            return;
        }
        document.getElementById("maintenanceEmpty").classList.add("d-none");

        tbody.innerHTML = filtered.map(m => `
            <tr>
                <td><span class="fw-semibold">${m.room_number || '—'}</span></td>
                <td>${m.tenant_name || '—'}</td>
                <td>${m.email || '—'}</td>
                <td><span class="chip chip-blue">${m.issue_type || '—'}</span></td>
                <td>${m.service_date ? formatDate(m.service_date) : '—'}</td>
                <td>${m.free_time || '—'}</td>
                <td>${m.description || '—'}</td>
                <td>
                    ${m.image_url ? `<img src="${m.image_url}" alt="Issue" style="width:40px;height:30px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="window.previewImage('${m.id}')">` : "—"}
                </td>
                <td>${getStatusBadge(m.status || 'pending')}</td>
                <td class="text-end">
                    <div class="d-flex gap-1 justify-content-end align-items-center">
                        ${getStatusActionButton(m)}
                        ${canDeleteMaintenance ? `<button class="btn-icon" title="Delete" onclick="window.deleteRequest('${m.id}')"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `).join("");
    }

    document.getElementById("maintenanceSearch")?.addEventListener("input", function(e) {
        searchTerm = e.target.value;
        renderTable();
    });

    // ============================================
    // STATUS BADGE
    // ============================================
    function getStatusBadge(status) {
        const map = {
            'pending': { cls: 'status-pending', label: 'Pending' },
            'in_progress': { cls: 'status-inprogress', label: 'In Progress' },
            'completed': { cls: 'status-completed', label: 'Completed' }
        };
        const s = map[status] || map['pending'];
        return `<span class="status-badge ${s.cls}">${s.label}</span>`;
    }

    function getStatusActionButton(m) {
        if (!canEditMaintenance) {
            return `<span class="text-muted-soft small">Read only</span>`;
        }
        
        if (m.status === 'completed') {
            return `<button class="btn-status btn-status-completed btn-status-disabled" disabled>
                <i class="bi bi-check-circle-fill"></i> Done
            </button>`;
        }
        if (m.status === 'in_progress') {
            return `<button class="btn-status btn-status-completed" onclick="window.updateStatus('${m.id}', 'completed')">
                <i class="bi bi-check-circle"></i> Complete
            </button>`;
        }
        return `<button class="btn-status btn-status-inprogress" onclick="window.updateStatus('${m.id}', 'in_progress')">
            <i class="bi bi-arrow-right-circle"></i> Start
        </button>`;
    }

    // ============================================
    // UPDATE STATUS - EXPOSED TO GLOBAL SCOPE
    // ============================================
    window.updateStatus = async function(id, newStatus) {
        if (!canEditMaintenance) {
            showToast("You don't have permission to update maintenance status.", "warning");
            return;
        }
        
        // FIX: Convert ID to number since backend returns numbers
        const numericId = typeof id === 'string' ? parseInt(id) : id;
        const m = maintenanceData.find(x => x.id === numericId);
        
        if (!m) {
            showToast("Maintenance request not found. Please refresh the page.", "warning");
            return;
        }

        if (m.status === 'completed') {
            showToast("This request is already completed.", "warning");
            return;
        }
        if (m.status === 'pending' && newStatus === 'completed') {
            showToast("Please mark as 'In Progress' first.", "warning");
            return;
        }

        try {
            let res;
            if (newStatus === 'in_progress') {
                res = await API.maintenance.admin.start(id);
            } else {
                res = await API.maintenance.admin.complete(id);
            }

            if (res.success) {
                showToast(res.message || `Status updated to ${newStatus}.`, "success");
                loadMaintenance();
            } else {
                showToast(res.message || "Failed to update status.", "danger");
            }
        } catch (error) {
            showToast("Error updating status: " + error.message, "danger");
        }
    };

    // ============================================
    // IMAGE PREVIEW - EXPOSED TO GLOBAL SCOPE
    // ============================================
    const imageModal = new bootstrap.Modal(document.getElementById("imagePreviewModal"));

    window.previewImage = function(id) {
        // FIX: Convert ID to number since backend returns numbers
        const numericId = typeof id === 'string' ? parseInt(id) : id;
        const m = maintenanceData.find(x => x.id === numericId);
        
        if (!m || !m.image_url) {
            showToast("No image available for this request.", "warning");
            return;
        }
        document.getElementById("previewImage").src = m.image_url;

        document.getElementById("downloadImageBtn").onclick = function() {
            window.open(m.image_url, '_blank');
            showToast("Image download started.", "info");
        };
        imageModal.show();
    };

    // ============================================
    // DELETE REQUEST - EXPOSED TO GLOBAL SCOPE
    // ============================================
    const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));

    window.deleteRequest = function(id) {
        if (!canDeleteMaintenance) {
            showToast("You don't have permission to delete maintenance requests.", "warning");
            return;
        }
        
        // FIX: Convert ID to number since backend returns numbers
        const numericId = typeof id === 'string' ? parseInt(id) : id;
        const m = maintenanceData.find(x => x.id === numericId);
        
        if (!m) {
            showToast("Maintenance request not found. Please refresh the page.", "warning");
            return;
        }

        document.getElementById("confirmTitle").textContent = `Delete request from ${m.tenant_name || 'tenant'}?`;
        document.getElementById("confirmBody").textContent = `This maintenance request (${m.issue_type || ''}) will be permanently removed.`;
        document.getElementById("confirmActionBtn").onclick = async function() {
            const btn = this;
            LOADER.show(btn, 'Deleting...');
            try {
                const res = await API.maintenance.admin.delete(id);
                if (res.success) {
                    showToast(res.message || "Maintenance request deleted.", "success");
                    confirmModal.hide();
                    loadMaintenance();
                } else {
                    showToast(res.message || "Failed to delete request.", "danger");
                }
            } catch (error) {
                showToast("Error deleting: " + error.message, "danger");
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    };

    // ============================================
    // INIT
    // ============================================
    loadMaintenance();
});