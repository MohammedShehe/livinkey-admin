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
    // INIT
    // ============================================
    loadGuests();
});