// Livinkey Admin - Guests Management
// Full backend integration for guest management

document.addEventListener("DOMContentLoaded", () => {
    renderLayout("guests", "Guests", "Everyone visiting or newly registered at Livinkey");

    // ============================================
    // PERMISSION CHECKS
    // ============================================
    const canEditGuests = Permissions.canEdit('guests');
    const canDeleteGuests = Permissions.canDelete('guests');
    const canViewGuests = Permissions.canView('guests');
    const canAddGuests = Permissions.canAdd('guests');

    let guestData = [];
    let searchTerm = "";

    // ============================================
    // FETCH GUESTS
    // FIX: previously called API.tenants.getAll({role:'guest'}), which
    // is gated server-side by the "tenants" permission — an admin's
    // actual "guests" permission had zero effect on this page. Now
    // calls the guests-scoped admin endpoint, which the backend gates
    // with permissionMiddleware("guests", ...).
    // ============================================
    async function loadGuests() {
        PAGE_LOADER.grid(document.getElementById("guestsGrid"), "Loading guests...");
        PAGE_LOADER.hideEmpty("guestsEmpty");
        PAGE_LOADER.element(document.getElementById("guestStats"), "Loading stats...");
        PAGE_LOADER.element(document.getElementById("newGuestsRow"), "Loading...");
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            const res = await API.guests.admin.all(params);
            if (res.success) {
                guestData = res.data || [];
                renderStats();
                renderNewGuests();
                renderGrid();
            } else {
                showToast(res.message || "Failed to load guests", "danger");
            }
        } catch (error) {
            console.error("Load guests error:", error);
            const grid = document.getElementById("guestsGrid");
            if (grid) grid.innerHTML = `<div class="col-12 text-center py-5 text-danger">Failed to load guests. Please try again.</div>`;
            showToast("Error loading guests: " + error.message, "danger");
        }
    }

    function renderStats() {
        const total = guestData.length;
        const thisMonth = guestData.filter(g => isThisMonth(g.created_at)).length;

        const stats = [
            { label: "Total Guests", value: total, icon: "bi-person-badge", color: "var(--lk-green)" },
            { label: "This Month's Guests", value: thisMonth, icon: "bi-calendar-check", color: "var(--info)" }
        ];

        const container = document.getElementById("guestStats");
        if (!container) return;
        
        container.innerHTML = stats.map(s => `
            <div class="col-6 col-md-3">
                <div class="stat-card hover-lift">
                    <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            </div>
        `).join("");
    }

    function renderNewGuests() {
        const recent = guestData
            .filter(g => g.created_at && daysAgo(g.created_at) <= 14)
            .sort((a, b) => daysAgo(a.created_at) - daysAgo(b.created_at));

        const container = document.getElementById("newGuestsRow");
        if (!container) return;
        
        container.innerHTML = recent.length ? recent.map(g => `
            <div class="d-flex align-items-center gap-2 border rounded-3 px-3 py-2" style="border-color:var(--border) !important;">
                <div class="avatar-circle" style="width:32px;height:32px;font-size:.7rem;">
                    ${getInitials(g.full_name || 'Guest')}
                </div>
                <div>
                    <div class="fw-semibold small">${g.full_name || '—'}</div>
                    <div class="small text-muted-soft">${daysAgo(g.created_at)} day(s) ago</div>
                </div>
            </div>
        `).join("") : `<span class="text-muted-soft small">No new guests in the last 14 days.</span>`;
    }

    function renderGrid() {
        const f = searchTerm.trim().toLowerCase();
        let filtered = guestData;
        if (f) {
            filtered = guestData.filter(g =>
                (g.full_name || '').toLowerCase().includes(f) ||
                (g.nationality || '').toLowerCase().includes(f) ||
                (g.email || '').toLowerCase().includes(f) ||
                (g.phone || '').includes(f)
            );
        }

        const grid = document.getElementById("guestsGrid");
        if (!grid) return;

        if (filtered.length === 0) {
            grid.innerHTML = '';
            const empty = document.getElementById("guestsEmpty");
            if (empty) empty.classList.remove("d-none");
            return;
        }
        const empty = document.getElementById("guestsEmpty");
        if (empty) empty.classList.add("d-none");

        grid.innerHTML = filtered.map(g => `
            <div class="col-md-6 col-lg-4">
                <div class="border rounded-4 p-3 h-100 hover-lift" style="border-color:var(--border) !important;">
                    <div class="d-flex align-items-start justify-content-between mb-2">
                        <div class="d-flex align-items-center gap-2">
                            <div class="avatar-circle">${getInitials(g.full_name || 'Guest')}</div>
                            <div>
                                <div class="fw-bold">${g.full_name || '—'}</div>
                                <div class="small text-muted-soft">${g.nationality || '—'}</div>
                            </div>
                        </div>
                        <div class="dropdown">
                            <button class="btn-icon" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                ${canEditGuests ? `<li><button class="dropdown-item" onclick="editGuest('${g.id}')"><i class="bi bi-pencil me-2"></i>Edit</button></li>` : ''}
                                ${canDeleteGuests ? `<li><button class="dropdown-item text-danger" onclick="deleteGuest('${g.id}')"><i class="bi bi-trash3 me-2"></i>Delete</button></li>` : ''}
                            </ul>
                        </div>
                    </div>
                    <div class="small mb-1"><i class="bi bi-envelope me-2 text-muted-soft"></i>${g.email || '—'}</div>
                    <div class="small mb-3"><i class="bi bi-telephone me-2 text-muted-soft"></i>${g.country_code || ''} ${g.phone || ''}</div>
                    ${canEditGuests ? `<button class="btn btn-outline-brand btn-sm w-100" onclick="openMsg('${g.id}')"><i class="bi bi-chat-dots me-1"></i>Send Message</button>` : ''}
                </div>
            </div>
        `).join("");
    }

    document.getElementById("guestSearch")?.addEventListener("input", function(e) {
        searchTerm = e.target.value;
        renderGrid();
    });

    // ============================================
    // SEND MESSAGE
    // FIX: now uses API.guests.admin.sendMessage instead of
    // API.tenants.sendMessage — matches the "guests" permission this
    // action is actually gated by server-side.
    // ============================================
    const msgModal = new bootstrap.Modal(document.getElementById("msgModal"));

    window.openMsg = function(id) {
        if (!canEditGuests) {
            showToast("You don't have permission to send messages to guests.", "warning");
            return;
        }
        const g = guestData.find(x => x.id === parseInt(id));
        if (!g) {
            showToast("Guest not found. Please refresh the page.", "danger");
            return;
        }
        document.getElementById("msgGuestId").value = g.id;
        document.getElementById("msgGuestName").textContent = g.full_name || 'Guest';
        document.getElementById("msgText").value =
`Hi ${(g.full_name || 'Guest').split(" ")[0]}, welcome to Livinkey! 🎉

We're delighted to have you with us. Livinkey offers fully furnished rooms, housekeeping, laundry, high-speed Wi-Fi and 24x7 support during your stay. If you need anything at all, just reply here or reach our team at livinkey@gmail.com.

Enjoy your stay!
— Livinkey Team`;
        msgModal.show();
    };

    document.getElementById("sendBroadcastBtn")?.addEventListener("click", async function() {
        const btn = this;
        const title = document.getElementById("broadcastTitle").value.trim();
        const message = document.getElementById("broadcastText").value.trim();
        const link = document.getElementById("broadcastLink").value.trim();
        if (!title || !message) {
            showToast("Please enter a title and message.", "warning");
            return;
        }
        if (link && !(String(link).startsWith("https://") || String(link).startsWith("http://"))) {
            showToast("Link must start with http:// or https://", "warning");
            return;
        }
        if (!confirm("Send this message to all active guests?")) return;
        LOADER.show(btn, "Sending...");
        try {
            const res = await API.guests.admin.broadcastMessage(title, message, link);
            if (res.success) {
                showToast(`${res.message}. (${res.data?.sent_count || 0} guests)`, "success");
                bootstrap.Modal.getOrCreateInstance(document.getElementById("broadcastModal")).hide();
                document.getElementById("broadcastText").value = "";
                document.getElementById("broadcastLink").value = "";
                loadGuestNotifHistory();
            } else {
                showToast(res.message || "Failed to send message.", "danger");
            }
        } catch (error) {
            showToast("Failed to send message: " + error.message, "danger");
        } finally {
            LOADER.hide(btn);
        }
    });

    document.getElementById("sendMsgBtn")?.addEventListener("click", async function() {
        const btn = this;
        LOADER.show(btn, 'Sending...');

        const guestId = document.getElementById("msgGuestId").value;
        const message = document.getElementById("msgText").value;
        const subject = document.getElementById("msgSubject")?.value || "Message from Livinkey Admin";

        if (!guestId) {
            showToast("Guest not found. Please refresh the page.", "danger");
            LOADER.hide(btn);
            return;
        }

        try {
            const res = await API.guests.admin.sendMessage(guestId, message, subject);
            if (res.success) {
                showToast(res.message || "Message sent successfully.", "success");
                msgModal.hide();
            } else {
                showToast(res.message || "Failed to send message.", "danger");
            }
        } catch (error) {
            console.error("Send message error:", error);
            showToast("Error sending message: " + error.message, "danger");
        }
        LOADER.hide(btn);
    });

    // ============================================
    // EDIT GUEST
    // ============================================
    const editModal = new bootstrap.Modal(document.getElementById("editGuestModal"));

    window.editGuest = function(id) {
        if (!canEditGuests) {
            showToast("You don't have permission to edit guests.", "warning");
            return;
        }
        
        const guestId = parseInt(id);
        const g = guestData.find(x => x.id === guestId);
        
        if (!g) {
            console.error("Guest not found for ID:", guestId);
            showToast("Guest not found. Please refresh the page.", "danger");
            return;
        }
        
        document.getElementById("egId").value = g.id;
        document.getElementById("egName").value = g.full_name || '';
        document.getElementById("egEmail").value = g.email || '';
        document.getElementById("egNationality").value = g.nationality || '';
        document.getElementById("egCountryCode").value = g.country_code || '+91';
        document.getElementById("egPhone").value = g.phone || '';
        
        editModal.show();
    };

    // FIX: now uses API.guests.admin.update instead of API.tenants.update
    document.getElementById("editGuestForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        LOADER.show(btn, 'Saving...');

        try {
            const id = document.getElementById("egId").value;
            const data = {
                full_name: document.getElementById("egName").value.trim(),
                email: document.getElementById("egEmail").value.trim().toLowerCase(),
                nationality: document.getElementById("egNationality").value.trim(),
                country_code: document.getElementById("egCountryCode").value.trim() || '+91',
                phone: document.getElementById("egPhone").value.trim(),
                role: 'guest',
                gender: 'other'
            };

            const res = await API.guests.admin.update(id, data);
            if (res.success) {
                showToast(res.message || "Guest details updated.", "success");
                editModal.hide();
                await loadGuests();
            } else {
                showToast(res.message || "Failed to update guest.", "danger");
            }
        } catch (error) {
            console.error("Update error:", error);
            showToast("Error updating guest: " + error.message, "danger");
        }
        LOADER.hide(btn);
    });

    // ============================================
    // DELETE GUEST
    // FIX: now uses API.guests.admin.delete instead of API.tenants.delete
    // ============================================
    const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));

    window.deleteGuest = function(id) {
        if (!canDeleteGuests) {
            showToast("You don't have permission to delete guests.", "warning");
            return;
        }
        
        const guestId = parseInt(id);
        const g = guestData.find(x => x.id === guestId);
        if (!g) {
            showToast("Guest not found. Please refresh the page.", "danger");
            return;
        }
        document.getElementById("confirmTitle").textContent = `Delete ${g.full_name || 'Guest'}?`;
        document.getElementById("confirmBody").textContent = "This will permanently remove this guest's record from the system.";
        document.getElementById("confirmActionBtn").onclick = async function() {
            const btn = this;
            LOADER.show(btn, 'Deleting...');
            try {
                const res = await API.guests.admin.delete(guestId);
                if (res.success) {
                    showToast(res.message || `${g.full_name || 'Guest'} was deleted.`, "success");
                    confirmModal.hide();
                    await loadGuests();
                } else {
                    showToast(res.message || "Failed to delete guest.", "danger");
                }
            } catch (error) {
                console.error("Delete error:", error);
                showToast("Error deleting guest: " + error.message, "danger");
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    };

    // ============================================
    // HELPERS
    // ============================================
    function daysAgo(dateStr) {
        if (!dateStr) return 0;
        const diff = (new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24);
        return Math.round(diff);
    }

    function isThisMonth(dateStr) {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }

    function getInitials(name) {
        if (!name) return 'G';
        const parts = name.split(' ').filter(Boolean);
        if (parts.length === 0) return 'G';
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // ============================================
    // GUEST NOTIFICATION HISTORY
    // ============================================
    async function loadGuestNotifHistory() {
        const el = document.getElementById('guestNotifHistory');
        if (!el) return;
        try {
            const res = await API.guests.admin.notificationHistory({ limit: 30 });
            if (!res.success) {
                el.innerHTML = `<div class="text-danger small">${res.message || 'Failed to load history'}</div>`;
                return;
            }
            const logs = res.data || [];
            if (!logs.length) {
                el.innerHTML = `<div class="text-muted text-center py-3">No guest notifications sent yet.</div>`;
                return;
            }
            window.__guestNotifHistory = logs;
            el.innerHTML = logs.map((h, idx) => `
              <div class="history-item border-bottom py-2" data-idx="${idx}" style="cursor:pointer;" title="View recipients">
                <div class="d-flex justify-content-between align-items-start gap-2">
                  <div style="min-width:0;flex:1;">
                    <div class="fw-semibold text-truncate">${escapeHtml(h.title || 'Untitled')}</div>
                    <div class="small text-muted text-truncate">${escapeHtml(h.message || '')}</div>
                    <div class="small text-muted mt-1">
                      <span class="chip chip-gray">${h.recipient_count || 0} recipients</span>
                      · ${formatGuestDate(h.sent_at)} · by ${escapeHtml(h.admin_name || 'Admin')}
                    </div>
                  </div>
                </div>
              </div>
            `).join('');
            el.querySelectorAll('.history-item').forEach(item => {
                item.addEventListener('click', () => {
                    const h = (window.__guestNotifHistory || [])[parseInt(item.dataset.idx, 10)];
                    openGuestHistoryDetail(h);
                });
            });
        } catch (err) {
            el.innerHTML = `<div class="text-danger small">${escapeHtml(err.message || 'Failed')}</div>`;
        }
    }

    function formatGuestDate(d) {
        if (!d) return '—';
        try {
            const x = new Date(d);
            if (isNaN(x.getTime())) return String(d);
            return x.toLocaleString();
        } catch { return String(d); }
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async function openGuestHistoryDetail(entryOrId) {
        if (entryOrId == null) return;
        const entry = (typeof entryOrId === 'object') ? entryOrId : null;
        const id = entry ? entry.id : entryOrId;

        let modalEl = document.getElementById('guestNotifDetailModal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'guestNotifDetailModal';
            modalEl.className = 'modal fade';
            modalEl.tabIndex = -1;
            modalEl.innerHTML = `
              <div class="modal-dialog modal-lg modal-dialog-scrollable">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Guest notification recipients</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                  </div>
                  <div class="modal-body" id="guestNotifDetailBody">Loading…</div>
                </div>
              </div>`;
            document.body.appendChild(modalEl);
        }
        const body = document.getElementById('guestNotifDetailBody');
        body.innerHTML = 'Loading…';
        bootstrap.Modal.getOrCreateInstance(modalEl).show();

        const render = (log, recipients, note) => {
            let html = `
              <div class="mb-3">
                <div class="fw-semibold fs-5">${escapeHtml(log.title || '')}</div>
                <div class="text-muted small mb-2">${formatGuestDate(log.sent_at)} · ${log.recipient_count || 0} recipients · by ${escapeHtml(log.admin_name || 'Admin')}</div>
                <div class="p-2 rounded" style="background:var(--bg);white-space:pre-wrap;">${escapeHtml(log.message || '')}</div>
              </div>`;
            if (note) html += `<div class="alert alert-warning py-2 small">${escapeHtml(note)}</div>`;
            if (!recipients?.length) {
                html += `<div class="text-muted text-center py-3">No recipient details available.</div>`;
            } else {
                html += `<div class="table-responsive"><table class="table table-sm">
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
                  <tbody>${recipients.map(r => `
                    <tr>
                      <td>${escapeHtml(r.full_name || '—')}</td>
                      <td class="small">${escapeHtml(r.email || '—')}</td>
                      <td class="small">${escapeHtml((r.country_code || '') + ' ' + (r.phone || ''))}</td>
                    </tr>`).join('')}</tbody></table></div>`;
            }
            body.innerHTML = html;
        };

        try {
            // Prefer API detail when we have a real log id
            if (id && !entry?._synthetic) {
                const res = await API.adminNotifications.recipients(id);
                if (res.success && res.data) {
                    render(res.data.log || entry || {}, res.data.recipients || [], res.data.note);
                    return;
                }
            }

            // Synthetic / fallback: resolve recipient_ids already on the history row
            let ids = [];
            if (entry?.recipient_ids) {
                try {
                    ids = typeof entry.recipient_ids === 'string' ? JSON.parse(entry.recipient_ids) : entry.recipient_ids;
                } catch (_) { ids = []; }
            }
            if (!Array.isArray(ids)) ids = [];

            // Load guest names from already-loaded guest grid data if available
            const guests = (typeof guestData !== 'undefined' && Array.isArray(guestData)) ? guestData : [];
            let recipients = ids.map(gid => {
                const g = guests.find(x => String(x.id) === String(gid));
                return g ? {
                    id: g.id,
                    full_name: g.full_name,
                    email: g.email,
                    phone: g.phone,
                    country_code: g.country_code
                } : { id: gid, full_name: `Guest #${gid}`, email: '', phone: '', country_code: '' };
            });

            // If we have no ids, try recipients API anyway (may reconstruct by title)
            if (!recipients.length && id) {
                try {
                    const res = await API.adminNotifications.recipients(id);
                    if (res.success && res.data) {
                        render(res.data.log || entry || {}, res.data.recipients || [], res.data.note);
                        return;
                    }
                } catch (_) {}
            }

            render(entry || { title: '', message: '', sent_at: null, recipient_count: recipients.length }, recipients, null);
        } catch (err) {
            body.innerHTML = `<div class="text-danger">${escapeHtml(err.message || 'Failed')}</div>`;
        }
    }

    // ============================================
    // INIT
    // ============================================
    LKUI.onRefresh(() => Promise.all([loadGuests(), loadGuestNotifHistory()]));
    loadGuests();
    loadGuestNotifHistory();
});
