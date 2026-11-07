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
                         ${canEditMaintenance ? `<button class="btn-icon" title="Forward details to a phone" aria-label="Forward details to a phone" onclick="window.forwardToWhatsApp('${m.id}')" style="color:#25D366;border-color:#25D366;"><i class="bi bi-whatsapp"></i></button>` : ''}
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
    // FORWARD DETAILS TO ANY PHONE (sent by the server: WhatsApp, then SMS)
    // ============================================
    const FWD_CODES = [["+91","India"],["+255","Tanzania"],["+254","Kenya"],["+256","Uganda"],["+971","UAE"],["+966","Saudi Arabia"],["+1","US / Canada"],["+44","UK"],["+977","Nepal"],["+880","Bangladesh"],["+94","Sri Lanka"],["+92","Pakistan"],["+234","Nigeria"],["+27","South Africa"],["+61","Australia"],["+65","Singapore"]];
    const escF = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    let fwdModal = null, fwdBusy = false, fwdRequestId = null;

    function ensureForwardModal() {
        if (document.getElementById("forwardModal")) return;
        document.body.insertAdjacentHTML("beforeend", `
<style>
  #forwardModal .fw-sum{background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:.7rem .85rem;font-size:.85rem}
  #forwardModal .fw-sum b{color:var(--heading)}
  #forwardModal .fw-chip{border:1px solid var(--border-strong);background:var(--surface);border-radius:999px;padding:.2rem .65rem;font-size:.78rem;cursor:pointer;color:var(--ink-soft)}
  #forwardModal .fw-chip:hover{border-color:var(--lk-green);background:var(--lk-green-50)}
  #forwardModal .fw-hist{font-size:.8rem;border-top:1px dashed var(--border);margin-top:1rem;padding-top:.7rem}
  #forwardModal .fw-hist div{display:flex;justify-content:space-between;gap:.5rem;padding:.2rem 0}
  #forwardModal .fw-st{font-weight:600}
  #forwardModal .fw-st.ok{color:var(--lk-green-darker)} #forwardModal .fw-st.bad{color:var(--danger)} #forwardModal .fw-st.wait{color:var(--muted)}
  #forwardModal .fw-phone{display:flex;gap:.5rem} #forwardModal .fw-phone select{max-width:150px;flex:0 0 auto}
  @media (max-width:575px){#forwardModal .fw-phone{flex-direction:column}#forwardModal .fw-phone select{max-width:none}}
</style>
<div class="modal fade" id="forwardModal" tabindex="-1" aria-labelledby="fwTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="fwTitle"><i class="bi bi-whatsapp me-2" style="color:#25D366"></i>Forward request</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <form id="fwForm" novalidate>
        <div class="modal-body">
          <div class="fw-sum mb-3" id="fwSummary"></div>
          <label class="form-label fw-semibold" for="fwPhone">Send to (WhatsApp number)</label>
          <div class="fw-phone">
            <select class="form-select" id="fwCode" aria-label="Country code">${FWD_CODES.map(([c, n]) => `<option value="${c}">${c} ${n}</option>`).join("")}</select>
            <input type="tel" class="form-control" id="fwPhone" inputmode="tel" autocomplete="off" placeholder="98765 43210" required>
          </div>
          <div class="form-text">Type the local number, or paste a full number starting with +. The details go straight to that WhatsApp (SMS if WhatsApp isn't available).</div>
          <div class="d-flex flex-wrap gap-2 mt-2" id="fwQuick"></div>
          <div class="row g-2 mt-1">
            <div class="col-sm-5"><label class="form-label fw-semibold" for="fwName">Name <span class="text-muted fw-normal">(optional)</span></label><input class="form-control" id="fwName" maxlength="80" placeholder="e.g. Raju (plumber)"></div>
            <div class="col-sm-7"><label class="form-label fw-semibold" for="fwNote">Note <span class="text-muted fw-normal">(optional)</span></label><input class="form-control" id="fwNote" maxlength="300" placeholder="e.g. Please call the tenant before visiting"></div>
          </div>
          <div class="form-check mt-3" id="fwStartWrap"><input class="form-check-input" type="checkbox" id="fwStart" checked><label class="form-check-label" for="fwStart">Mark this request as <b>In Progress</b> after sending</label></div>
          <div class="alert alert-danger py-2 mt-3 mb-0 d-none" id="fwError" role="alert"></div>
          <div class="fw-hist d-none" id="fwHist"><div class="fw-semibold mb-1">Previously forwarded</div><div id="fwHistList" style="display:block"></div></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-brand" id="fwSend"><i class="bi bi-send-fill me-1"></i>Send details</button>
        </div>
      </form>
    </div>
  </div>
</div>`);
        fwdModal = new bootstrap.Modal(document.getElementById("forwardModal"));
        document.getElementById("fwForm").addEventListener("submit", submitForward);
        document.getElementById("fwQuick").addEventListener("click", (e) => {
            const b = e.target.closest("[data-phone]"); if (!b) return;
            document.getElementById("fwPhone").value = b.dataset.phone;
            if (b.dataset.name) document.getElementById("fwName").value = b.dataset.name;
        });
    }

    function statusClass(st) { return st === "failed" ? "bad" : (st === "delivered" || st === "read") ? "ok" : "wait"; }
    function statusWord(f) {
        const via = f.channel === "sms" ? "SMS" : "WhatsApp";
        return { failed: "Not delivered", read: `Read (${via})`, delivered: `Delivered (${via})`, sent: `Sent (${via})`, queued: "Sending…" }[f.status] || f.status;
    }

    async function loadForwardExtras(id) {
        const hist = document.getElementById("fwHist"), list = document.getElementById("fwHistList"), quick = document.getElementById("fwQuick");
        hist.classList.add("d-none"); quick.innerHTML = "";
        const own = (Auth.getSession()?.phone || Auth.getSession()?.admin?.phone || "").trim();
        const chips = [];
        if (own) chips.push(`<button type="button" class="fw-chip" data-phone="${escF(own)}"><i class="bi bi-person-fill"></i> My number</button>`);
        quick.innerHTML = chips.join("");
        try {
            const [h, r] = await Promise.all([API.getMaintenanceForwards(id), API.getForwardRecipients()]);
            if (id !== fwdRequestId) return;
            const rows = h.data || [];
            if (rows.length) {
                list.innerHTML = rows.map((f) => `<div><span>${escF(f.to_name || f.to_phone)}${f.to_name ? ` · ${escF(f.to_phone)}` : ""}<br><small class="text-muted">${escF(new Date(f.created_at).toLocaleString())}${f.admin_name ? " · " + escF(f.admin_name) : ""}</small></span><span class="fw-st ${statusClass(f.status)}" ${f.error_message ? `title="${escF(f.error_message)}"` : ""}>${escF(statusWord(f))}</span></div>`).join("");
                hist.classList.remove("d-none");
            }
            const recent = (r.data || []).slice(0, 5);
            quick.innerHTML = chips.concat(recent.map((x) => `<button type="button" class="fw-chip" data-phone="${escF(x.to_phone)}" data-name="${escF(x.to_name || "")}"><i class="bi bi-clock-history"></i> ${escF(x.to_name || x.to_phone)}</button>`)).join("");
        } catch (_) { /* extras are optional */ }
    }

    window.forwardToWhatsApp = function(id) {
        if (!canEditMaintenance) { showToast("You don't have permission to forward maintenance requests.", "warning"); return; }
        const numericId = typeof id === "string" ? parseInt(id, 10) : id;
        const m = maintenanceData.find((x) => x.id === numericId);
        if (!m) { showToast("Maintenance request not found. Please refresh the page.", "warning"); return; }
        ensureForwardModal();
        fwdRequestId = numericId;
        document.getElementById("fwForm").reset();
        document.getElementById("fwError").classList.add("d-none");
        document.getElementById("fwTitle").innerHTML = `<i class="bi bi-whatsapp me-2" style="color:#25D366"></i>Forward request #${numericId}`;
        document.getElementById("fwSummary").innerHTML = `<b>${escF(m.issue_type || "Maintenance")}</b> · Room ${escF(m.room_number || "—")}${m.pg_name ? " · " + escF(m.pg_name) : ""}<br>${escF(m.tenant_name || "Tenant")}${m.service_date ? " · " + escF(new Date(m.service_date).toLocaleDateString()) : ""}<br><span class="text-muted">${escF((m.description || "No description").slice(0, 140))}</span>`;
        const pending = m.status === "pending";
        document.getElementById("fwStartWrap").classList.toggle("d-none", !pending);
        document.getElementById("fwStart").checked = pending;
        const code = FWD_CODES.find(([c]) => String(Auth.getSession()?.phone || "").startsWith(c));
        document.getElementById("fwCode").value = code ? code[0] : "+91";
        fwdModal.show();
        setTimeout(() => document.getElementById("fwPhone").focus(), 250);
        loadForwardExtras(numericId);
    };

    async function submitForward(e) {
        e.preventDefault();
        if (fwdBusy) return;
        const err = document.getElementById("fwError"), btn = document.getElementById("fwSend");
        const raw = document.getElementById("fwPhone").value.trim();
        const digits = raw.replace(/\D/g, "");
        err.classList.add("d-none");
        if (digits.length < 7 || digits.length > 15) {
            err.textContent = "Enter a valid phone number (7–15 digits).";
            err.classList.remove("d-none"); document.getElementById("fwPhone").focus(); return;
        }
        fwdBusy = true; btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sending…';
        try {
            const res = await API.forwardMaintenance(fwdRequestId, {
                phone: raw,
                country_code: raw.startsWith("+") ? null : document.getElementById("fwCode").value,
                name: document.getElementById("fwName").value.trim() || null,
                note: document.getElementById("fwNote").value.trim() || null,
                mark_in_progress: document.getElementById("fwStart").checked && !document.getElementById("fwStartWrap").classList.contains("d-none"),
            });
            fwdModal.hide();
            showToast(res.message || "Details sent.", res.data?.warning ? "warning" : "success");
            if (res.data?.warning) showToast(res.data.warning, "warning");
            loadMaintenance();
        } catch (error) {
            err.textContent = error?.message || "Could not send the details. Please try again.";
            err.classList.remove("d-none");
            loadForwardExtras(fwdRequestId);
        } finally {
            fwdBusy = false; btn.disabled = false; btn.innerHTML = '<i class="bi bi-send-fill me-1"></i>Send details';
        }
    }

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