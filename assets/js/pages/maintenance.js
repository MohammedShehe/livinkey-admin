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
    const $id = (i) => document.getElementById(i);
    const F = { status: "", pg_id: "", issue_type: "", month: "", date_field: "created", from: "", to: "", has_image: "", overdue: false, sort: "status" };
    let pgsLoaded = false;

    function currentParams() {
        const p = { sort: F.sort, date_field: F.date_field };
        if (searchTerm.trim()) p.search = searchTerm.trim();
        if (F.status) p.status = F.status;
        if (F.pg_id) p.pg_id = F.pg_id;
        if (F.issue_type) p.issue_type = F.issue_type;
        if (F.month) p.month = F.month;
        if (F.from) p.from = F.from;
        if (F.to) p.to = F.to;
        if (F.has_image !== "") p.has_image = F.has_image;
        if (F.overdue) p.overdue = 1;
        return p;
    }

    // ============================================
    // FILTER DROP-DOWNS (PGs, issue types, months)
    // ============================================
    async function loadPgOptions() {
        if (pgsLoaded) return;
        try {
            const res = await API.pgs.getAll();
            if (res.success) {
                const sel = $id("fPg");
                (res.data || []).forEach(pg => sel.insertAdjacentHTML("beforeend", `<option value="${lkEsc(pg.id)}">${lkEsc(pg.name)}</option>`));
                pgsLoaded = true;
            }
        } catch (e) { console.error("PG list:", e); }
    }

    const monthLabel = (m) => { const [y, mo] = m.split("-"); return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }); };

    function fillSelect(id, items, current, allLabel) {
        const sel = $id(id);
        sel.innerHTML = `<option value="">${allLabel}</option>` + items.map(i => `<option value="${lkEsc(i.value)}">${lkEsc(i.label)}</option>`).join("");
        // keep the current choice even if it has no rows right now
        if (current && !items.some(i => i.value === current)) sel.insertAdjacentHTML("beforeend", `<option value="${lkEsc(current)}">${lkEsc(current)}</option>`);
        sel.value = current || "";
    }

    async function loadStats() {
        try {
            const p = currentParams(); delete p.sort; delete p.status; delete p.overdue;
            const res = await API.maintenance.admin.stats(p);
            if (!res.success) return;
            const d = res.data;
            $id("stTotal").textContent = d.total; $id("stPending").textContent = d.pending;
            $id("stProgress").textContent = d.in_progress; $id("stDone").textContent = d.completed; $id("stOverdue").textContent = d.overdue;
            fillSelect("fType", (d.types || []).map(t => ({ value: t.issue_type, label: `${t.issue_type} (${t.count})` })), F.issue_type, "All types");
            fillSelect("fMonth", (d.months || []).map(m => ({ value: m.month, label: `${monthLabel(m.month)} (${m.count})` })), F.month, "All months");
            window.__mAvgHours = d.avg_resolution_hours;
            markActiveStat();
        } catch (e) { console.error("Maintenance stats:", e); }
    }

    function markActiveStat() {
        document.querySelectorAll("#mStats .m-stat").forEach(b => {
            const st = b.dataset.st;
            b.classList.toggle("active", st === "overdue" ? F.overdue : (!F.overdue && st === F.status));
        });
    }

    // ============================================
    // FETCH MAINTENANCE REQUESTS (filtering is done by the server)
    // ============================================
    let reqSeq = 0;
    async function loadMaintenance() {
        const seq = ++reqSeq;
        PAGE_LOADER.table(document.getElementById("maintenanceTbody"), 13, "Loading maintenance requests...");
        PAGE_LOADER.hideEmpty("maintenanceEmpty");
        loadPgOptions();
        try {
            const [res] = await Promise.all([API.maintenance.admin.getAll(currentParams()), loadStats()]);
            if (seq !== reqSeq) return; // a newer filter change is already loading
            if (res.success) {
                maintenanceData = res.data || [];
                renderTable();
            } else {
                showToast(res.message || "Failed to load maintenance requests", "danger");
            }
        } catch (error) {
            const tbody = document.getElementById("maintenanceTbody");
            if (tbody) tbody.innerHTML = `<tr><td colspan="13" class="text-center py-5 text-danger">Failed to load maintenance requests. Please try again.</td></tr>`;
            showToast("Error loading maintenance: " + error.message, "danger");
        }
    }

    function renderTable() {
        const filtered = maintenanceData;
        const tbody = document.getElementById("maintenanceTbody");
        if (!tbody) return;

        const activeFilters = Object.entries(F).some(([k, v]) => v && !(k === "sort" && v === "status") && !(k === "date_field" && v === "created")) || searchTerm.trim();
        const avg = window.__mAvgHours;
        $id("mSummary").textContent = `Showing ${filtered.length} request${filtered.length === 1 ? "" : "s"}` + (activeFilters ? " (filtered)" : "") +
            (avg != null ? ` · average time to complete: ${avg < 48 ? avg + " h" : (avg / 24).toFixed(1) + " days"}` : "");

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            document.getElementById("maintenanceEmpty").classList.remove("d-none");
            return;
        }
        document.getElementById("maintenanceEmpty").classList.add("d-none");

        const X = LKUI.esc;
        tbody.innerHTML = filtered.map(m => `
            <tr data-id="${X(m.id)}">
                <td>${X(m.pg_name) || '—'}</td>
                <td><span class="fw-semibold">${X(m.room_number) || '—'}</span></td>
                <td>${X(m.tenant_name) || '—'}</td>
                <td>${X(m.tenant_email) || '—'}</td>
                <td><span class="chip chip-blue">${X(m.issue_type) || '—'}</span></td>
                <td>${m.request_date ? formatDate(m.request_date) : '—'}</td>
                <td>${m.service_date ? formatDate(m.service_date) : '—'}</td>
                <td>${X(m.free_time) || '—'}</td>
                <td>${X(m.description) || '—'}</td>
                <td>
                    ${m.image_url ? `<img src="${m.image_url}" alt="Issue" style="width:40px;height:30px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="window.previewImage('${m.id}')">` : "—"}
                </td>
                <td>${getStatusBadge(m.status || 'pending')}${Number(m.is_overdue) ? '<span class="status-badge status-overdue" title="Service date has passed">Overdue</span>' : ''}</td>
                <td class="text-end">
                    <div class="d-flex gap-1 justify-content-end align-items-center">
                        ${getStatusActionButton(m)}
                        ${canDeleteMaintenance ? `<button class="btn-icon" title="Delete" onclick="window.deleteRequest('${m.id}')"><i class="bi bi-trash3"></i></button>` : ''}
                        ${m.status === 'pending' && canEditMaintenance ? `<button class="btn-icon" title="Forward to WhatsApp" onclick="window.forwardToWhatsApp('${m.id}')" style="color:#25D366;border-color:#25D366;"><i class="bi bi-whatsapp"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `).join("");
    }

    // ---- filter events ----
    let searchTimer = null;
    $id("maintenanceSearch")?.addEventListener("input", function (e) {
        searchTerm = e.target.value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(loadMaintenance, 300);
    });
    const bind = (id, key, isCheck) => $id(id)?.addEventListener("change", (e) => { F[key] = isCheck ? e.target.checked : e.target.value; if (key === "month" && F.month) { F.from = ""; F.to = ""; $id("fFrom").value = ""; $id("fTo").value = ""; } if ((key === "from" || key === "to") && e.target.value) { F.month = ""; $id("fMonth").value = ""; } markActiveStat(); loadMaintenance(); });
    bind("fStatus", "status"); bind("fPg", "pg_id"); bind("fType", "issue_type"); bind("fMonth", "month"); bind("fDateField", "date_field");
    bind("fFrom", "from"); bind("fTo", "to"); bind("fImage", "has_image"); bind("fOverdue", "overdue", true); bind("fSort", "sort");
    $id("fClear")?.addEventListener("click", () => {
        Object.assign(F, { status: "", pg_id: "", issue_type: "", month: "", date_field: "created", from: "", to: "", has_image: "", overdue: false, sort: "status" });
        searchTerm = ""; $id("maintenanceSearch").value = "";
        ["fStatus", "fPg", "fType", "fMonth", "fImage", "fFrom", "fTo"].forEach(i => $id(i).value = "");
        $id("fDateField").value = "created"; $id("fSort").value = "status"; $id("fOverdue").checked = false;
        loadMaintenance();
    });
    document.querySelectorAll("#mStats .m-stat").forEach(b => b.addEventListener("click", () => {
        const st = b.dataset.st;
        if (st === "overdue") { F.overdue = !F.overdue; F.status = ""; } else { F.overdue = false; F.status = st; }
        $id("fOverdue").checked = F.overdue; $id("fStatus").value = F.status;
        loadMaintenance();
    }));

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
        return `<span class="status-badge ${s.cls}">${lkEsc(s.label)}</span>`;
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
    // FORWARD TO WHATSAPP - NEW FEATURE
    // ============================================
    window.forwardToWhatsApp = async function(id) {
        if (!canEditMaintenance) {
            showToast("You don't have permission to forward maintenance requests.", "warning");
            return;
        }

        // Get admin's phone number from session
        const session = Auth.getSession();
        if (!session) {
            showToast("Please login again to access your profile.", "warning");
            return;
        }

        // Build phone number - remove ALL non-numeric characters
        let rawPhone = session.phone;
        if (!rawPhone) {
            rawPhone = (session.country_code || '') + (session.phone || '');
        }
        
        // Remove all non-numeric characters (+, -, spaces, etc.)
        const adminPhone = rawPhone.replace(/[^0-9]/g, '');

        // Validate phone number (at least 10 digits)
        if (!adminPhone || adminPhone.length < 10) {
            showToast("Your phone number is not set or invalid in your profile. Please update your profile first.", "warning");
            return;
        }

        // Find the maintenance request
        const numericId = typeof id === 'string' ? parseInt(id) : id;
        const m = maintenanceData.find(x => x.id === numericId);
        
        if (!m) {
            showToast("Maintenance request not found. Please refresh the page.", "warning");
            return;
        }

        if (m.status !== 'pending') {
            showToast("Only pending requests can be forwarded.", "warning");
            return;
        }

        // Build WhatsApp message
        const message = buildWhatsAppMessage(m);
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodedMessage}`;

        // Open WhatsApp in new tab
        window.open(whatsappUrl, '_blank');

        // Update status to in_progress
        try {
            const res = await API.maintenance.admin.start(id);
            if (res.success) {
                showToast(res.message || "Maintenance forwarded to WhatsApp and status updated to In Progress.", "success");
                loadMaintenance();
            } else {
                showToast(res.message || "Failed to update status after forwarding.", "danger");
            }
        } catch (error) {
            showToast("Error updating status: " + error.message, "danger");
        }
    };

    // ============================================
    // BUILD WHATSAPP MESSAGE - FIXED WITH CORRECT FIELDS
    // ============================================
    function buildWhatsAppMessage(m) {
        // Get email and phone from the maintenance data (backend already provides these)
        let email = m.tenant_email || 'N/A';
        let phone = m.tenant_phone || 'N/A';
        
        // If still N/A, try to find the tenant in the global tenants list
        if (email === 'N/A' || phone === 'N/A') {
            if (window.LK_TENANTS && window.LK_TENANTS.length > 0) {
                const tenant = window.LK_TENANTS.find(t => 
                    t.full_name === m.tenant_name || 
                    t.id === m.tenant_id
                );
                if (tenant) {
                    if (email === 'N/A') email = tenant.email || 'N/A';
                    if (phone === 'N/A') phone = tenant.phone || 'N/A';
                }
            }
        }

        const lines = [
            "🏠 *Maintenance Request - Livinkey*",
            "",
            `👤 *Tenant:* ${m.tenant_name || 'N/A'}`,
            `📧 *Email:* ${email}`,
            `📞 *Phone:* ${phone}`,
            `🏢 *PG:* ${m.pg_name || 'N/A'}`,
            `🚪 *Room:* ${m.room_number || 'N/A'}`,
            "",
            `🔧 *Issue Type:* ${m.issue_type || 'N/A'}`,
            `📝 *Description:* ${m.description || 'N/A'}`,
            `📅 *Service Date:* ${m.service_date ? formatDate(m.service_date) : 'N/A'}`,
            `⏰ *Free Time:* ${m.free_time || 'N/A'}`,
            "",
            `📸 *Image:* ${m.image_url || 'No image attached'}`,
            "",
            "---",
            "⚠️ *This request has been forwarded from the Livinkey Admin Panel.*",
            "Please take appropriate action."
        ];

        return lines.join('\n');
    }

    // ============================================
    // UPDATE STATUS - EXPOSED TO GLOBAL SCOPE
    // ============================================
    window.updateStatus = async function(id, newStatus) {
        if (!canEditMaintenance) {
            showToast("You don't have permission to update maintenance status.", "warning");
            return;
        }
        
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
    LKUI.table('#maintenanceTable', {
        key: 'maintenance', noun: 'request', csv: 'maintenance-requests', skipCols: [9, 11],
        bulk: { idOf: tr => tr.dataset.id, actions: [
            { label: 'Delete', icon: 'bi-trash3', danger: true, visible: () => canDeleteMaintenance, run: async (ids) => {
                if (!await LKUI.confirm({ title: `Delete ${ids.length} request${ids.length === 1 ? '' : 's'}?`, body: 'This cannot be undone.', confirmText: 'Delete' })) return false;
                const r = await LKUI.runBatch(ids, id => API.maintenance.admin.delete(id), { title: 'Deleting requests…' });
                LKUI.toast(r.failed.length ? `Deleted ${r.ok}, ${r.failed.length} failed` : `Deleted ${r.ok} request${r.ok === 1 ? '' : 's'}`, r.failed.length ? 'warning' : 'success');
                loadMaintenance(); return true; } }
        ] }
    });
    LKUI.onRefresh(() => loadMaintenance());
    loadMaintenance();
});