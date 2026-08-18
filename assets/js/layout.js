// Livinkey Admin - Layout & Navigation
// Full backend integration with permission-based UI

// ============ NOTIFICATION -> EXISTING PAGE MAPPING ============
// Backend notifications carry an `entity_type` (tenant, guest, bill, pg,
// admin, feedback, maintenance, document) plus a `link` built from that
// type (e.g. "/tenants/5"). This admin panel has no router though — it's
// plain multi-page HTML (tenants.html, bills.html, ...) — so those
// backend links don't correspond to any real page and would 404 if used
// directly. This map sends each notification to the correct EXISTING
// page instead. Unknown/unrecognized types fall back to tenants.html
// rather than a dead link.
const NOTIF_PAGE_MAP = {
    tenant: 'tenants.html',
    guest: 'guests.html',
    bill: 'bills.html',
    pg: 'pgs.html',
    admin: 'admins.html',
    feedback: 'feedbacks.html',
    maintenance: 'maintenance.html',
    document: 'documents.html',
    documents: 'documents.html'
};

function resolveNotificationPage(n) {
    if (n.entity_type && NOTIF_PAGE_MAP[n.entity_type]) {
        return NOTIF_PAGE_MAP[n.entity_type];
    }
    // Fallback: try to infer the type from the first segment of the
    // backend-provided link (e.g. "/tenants/5" -> "tenants").
    if (n.link) {
        const seg = n.link.split('/').filter(Boolean)[0];
        if (seg && NOTIF_PAGE_MAP[seg]) return NOTIF_PAGE_MAP[seg];
    }
    return 'tenants.html';
}

function renderLayout(activeKey, pageTitle, pageSub) {
    // Check authentication - redirect to login if not authenticated
    if (!Auth.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }
    
    const session = Auth.getSession();
    if (!session) {
        Auth.logout();
        return;
    }
    
    // Get current admin permissions
    const admin = session.admin || {};
    const role = session.role || 'admin';
    const isSuperAdmin = role === 'super_admin';
    const permissions = session.permissions || {};
    
    // Store permissions globally for other pages to access
    window.LK_ADMIN_PERMISSIONS = permissions;
    window.LK_ADMIN_ROLE = role;
    window.LK_IS_SUPER_ADMIN = isSuperAdmin;
    
    // ============================================================
    // FIX: Check hash to determine if we're on the proofs tab
    // ============================================================
    let finalActiveKey = activeKey;
    if (window.location.hash === '#proofs' && activeKey === 'bills') {
        finalActiveKey = 'proofs';
    }
    
    // Menu items with permission checks
    const MENU = [
        { 
            key: 'tenants', 
            label: 'Tenants Management', 
            icon: 'bi-people-fill', 
            href: 'tenants.html',
            permission: 'tenants'
        },
        { 
            key: 'guests', 
            label: 'Guests', 
            icon: 'bi-person-badge', 
            href: 'guests.html',
            permission: 'guests'
        },
        { 
            key: 'admins', 
            label: 'Admins Management', 
            icon: 'bi-shield-lock-fill', 
            href: 'admins.html',
            permission: 'admins',
            superOnly: true
        },
        { 
            key: 'bills', 
            label: 'Bills', 
            icon: 'bi-receipt-cutoff', 
            href: 'bills.html',
            permission: 'bills'
        },
        { 
            key: 'payments', 
            label: 'Payments', 
            icon: 'bi-credit-card', 
            href: 'payments.html',
            permission: 'bills'  // Uses bills permission
        },
        { 
            key: 'proofs', 
            label: 'Payment Proofs', 
            icon: 'bi-file-earmark-check', 
            href: 'bills.html#proofs',
            permission: 'bills'  // Uses bills permission - navigates to bills.html with #proofs hash
        },
        { 
            key: 'pgs', 
            label: 'PGs Management', 
            icon: 'bi-building', 
            href: 'pgs.html',
            permission: 'pgs'
        },
        { 
            key: 'maintenance', 
            label: 'Maintenance', 
            icon: 'bi-tools', 
            href: 'maintenance.html',
            permission: 'maintenance'
        },
        { 
            key: 'documents', 
            label: 'Documents', 
            icon: 'bi-files', 
            href: 'documents.html',
            permission: 'documents'
        },
        { 
            key: 'feedbacks', 
            label: 'Feedbacks', 
            icon: 'bi-chat-dots-fill', 
            href: 'feedbacks.html',
            permission: 'feedbacks'
        }
    ];
    
    // Filter menu based on permissions — strict `=== true` check so a
    // module with no permission row (undefined) never renders as if
    // it were granted.
    const hasPermission = (key) => {
        if (key === 'admins') return isSuperAdmin;
        if (isSuperAdmin) return true;
        return permissions[key]?.view === true;
    };
    
    const menuHtml = MENU
        .filter(m => hasPermission(m.key))
        .map(m => `
            <a href="${m.href}" class="side-link ${m.key === finalActiveKey ? 'active' : ''}">
                <i class="bi ${m.icon}"></i><span>${m.label}</span>
                ${m.key === 'admins' && isSuperAdmin ? '<span class="badge-mini">SA</span>' : ''}
            </a>
        `).join('');
    
    // Sidebar
    document.getElementById('sidebarMount').innerHTML = `
        <aside class="sidebar" id="sidebarEl">
            <div class="side-brand">
                <img src="assets/img/white_logo.png" alt="Livinkey" height="34">
            </div>
            <nav class="side-nav">
                <div class="side-section-label">Management</div>
                ${menuHtml}
            </nav>
            <div class="side-footer d-flex align-items-center gap-2">
                <i class="bi bi-envelope-fill"></i> livinkey@gmail.com
                <span class="ms-auto small">v1.0</span>
            </div>
        </aside>
        <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
    `;
    
    // Topbar
    const userName = session.name || admin.name || 'Admin';
    const userEmail = session.email || admin.email || '';
    const initials = userName.split(' ').filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join('');
    
    document.getElementById('topbarMount').innerHTML = `
        <header class="topbar">
            <div class="d-flex align-items-center gap-3">
                <button class="btn btn-icon sidebar-toggle" id="sidebarToggleBtn"><i class="bi bi-list"></i></button>
                <div>
                    <p class="page-title mb-0">${pageTitle}</p>
                    ${pageSub ? `<p class="page-sub mb-0">${pageSub}</p>` : ''}
                </div>
            </div>
            <div class="d-flex align-items-center gap-3">
                <div class="dropdown">
                    <button class="btn btn-icon notif-btn" data-bs-toggle="dropdown" id="notifBell">
                        <i class="bi bi-bell-fill"></i>
                        <span class="notif-dot" id="notifCount" style="display:none;">0</span>
                    </button>
                    <div class="dropdown-menu dropdown-menu-end p-2" style="width:320px;">
                        <div class="d-flex align-items-center justify-content-between px-2 mb-2">
                            <p class="fw-bold mb-0" style="font-family:'Sora';">Notifications</p>
                            <button type="button" class="btn btn-link btn-sm p-0 small" id="notifMarkAllReadBtn">Mark all read</button>
                        </div>
                        <div id="notifList">
                            <p class="text-muted-soft small text-center py-2">Loading notifications...</p>
                        </div>
                    </div>
                </div>
                <div class="dropdown">
                    <div class="profile-trigger" data-bs-toggle="dropdown">
                        <div class="text-end d-none d-sm-block">
                            <div style="font-size:.85rem;font-weight:700;">${userName}</div>
                            <div style="font-size:.72rem;color:var(--muted);">${userEmail}</div>
                        </div>
                        <div class="avatar-circle">${initials}</div>
                    </div>
                    <div class="dropdown-menu dropdown-menu-end p-2">
                        <div class="px-2 pb-2 mb-1 border-bottom">
                            <div class="fw-bold">${userName}</div>
                            <div class="small text-muted-soft">${isSuperAdmin ? 'Super Admin' : 'Admin'}</div>
                        </div>
                        <button class="dropdown-item rounded-3 py-2 text-danger fw-semibold" id="logoutBtn">
                            <i class="bi bi-box-arrow-right me-2"></i>Log out
                        </button>
                    </div>
                </div>
            </div>
        </header>
    `;
    
    // Update notification badge
    function updateNotificationBadge(count) {
        const badge = document.getElementById('notifCount');
        if (badge) {
            if (count > 0) {
                badge.style.display = 'flex';
                badge.textContent = count > 99 ? '99+' : count;
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    function loadNotifications() {
        const list = document.getElementById('notifList');
        if (!list) return;
        
        API.notifications.unread(10)
            .then(res => {
                if (res.success && res.data) {
                    if (res.data.length === 0) {
                        list.innerHTML = '<p class="text-muted-soft small text-center py-2">No notifications</p>';
                    } else {
                        list.innerHTML = res.data.map(n => `
                            <a href="#" class="dropdown-item rounded-3 py-2 mb-1 notif-item" data-id="${n.id}" data-page="${resolveNotificationPage(n)}">
                                <span style="color:${n.color || 'var(--lk-green)'};">
                                    <i class="bi ${n.icon || 'bi-bell'} me-2"></i>
                                </span>
                                ${n.title}
                                <br><small class="text-muted-soft">${n.message}</small>
                            </a>
                        `).join('');
                    }
                }
                if (res.unreadCount !== undefined) {
                    updateNotificationBadge(res.unreadCount);
                }
            })
            .catch(() => {
                list.innerHTML = '<p class="text-muted-soft small text-center py-2">Failed to load notifications</p>';
            });
    }
    
    // FIX: previously selected the notif bell via a generic
    // `document.querySelector('[data-bs-toggle="dropdown"]')`, which
    // matches ANY dropdown-toggle element in DOM order (the profile
    // trigger also uses `data-bs-toggle="dropdown"`). It happened to
    // work because of markup order, but was fragile. Select the bell
    // by its actual id instead.
    const notifBtn = document.getElementById('notifBell');
    if (notifBtn) {
        notifBtn.addEventListener('click', function() {
            loadNotifications();
        });
    }

    // ============================================
    // NOTIFICATION CLICK -> MARK AS READ + GO TO THE RIGHT EXISTING PAGE
    //
    // Event delegation on the (persistent) #notifList container, since
    // its innerHTML is replaced on every loadNotifications() call but
    // the container element itself is not recreated.
    //
    // On click: mark that notification as read (so the unread badge
    // reflects reality), refresh the badge count from the server's
    // response, and only then navigate to the mapped, existing page.
    // Navigation always happens (via .finally) even if the mark-read
    // call fails, so the person is never stuck on a dead click.
    // ============================================
    const notifListEl = document.getElementById('notifList');
    if (notifListEl) {
        notifListEl.addEventListener('click', function(e) {
            const item = e.target.closest('.notif-item');
            if (!item) return;
            e.preventDefault();

            const id = item.dataset.id;
            const page = item.dataset.page || 'tenants.html';

            // Reflect the click immediately in the UI so the badge
            // doesn't lag behind while the request is in flight.
            item.style.opacity = '0.6';

            API.notifications.markRead(id)
                .then(res => {
                    if (res && res.success && res.unreadCount !== undefined) {
                        updateNotificationBadge(res.unreadCount);
                    }
                })
                .catch(() => { /* non-fatal — still navigate below */ })
                .finally(() => {
                    window.location.href = page;
                });
        });
    }

    // "Mark all read" link in the dropdown header
    const markAllBtn = document.getElementById('notifMarkAllReadBtn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            API.notifications.markAllRead()
                .then(res => {
                    if (res && res.success) {
                        updateNotificationBadge(0);
                        loadNotifications();
                    }
                })
                .catch(() => { /* non-fatal */ });
        });
    }

    // FIX: the unread badge previously only populated once the
    // dropdown was opened. Fetch it proactively on page load so the
    // admin sees an accurate count immediately.
    API.notifications.unreadCount()
        .then(res => {
            if (res && res.success && res.unreadCount !== undefined) {
                updateNotificationBadge(res.unreadCount);
            }
        })
        .catch(() => { /* non-fatal — badge just stays hidden */ });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function(e) {
        e.preventDefault();
        Auth.logout();
    });
    
    // Sidebar toggle
    document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
        document.getElementById('sidebarEl').classList.toggle('show');
        document.getElementById('sidebarBackdrop').classList.toggle('show');
    });
    
    document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
        document.getElementById('sidebarEl').classList.remove('show');
        document.getElementById('sidebarBackdrop').classList.remove('show');
    });
}

// ============ HELPERS ============
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

function getStatusBadge(status) {
    const map = {
        'pending': 'status-pending',
        'in_progress': 'status-inprogress',
        'completed': 'status-completed',
        'unpaid': 'status-pending',
        'partially_paid': 'status-inprogress',
        'paid': 'status-completed',
        'delayed': 'status-pending',
        'overdue': 'status-pending'
    };
    const labels = {
        'pending': 'Pending',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'unpaid': 'Unpaid',
        'partially_paid': 'Partially Paid',
        'paid': 'Paid',
        'delayed': 'Delayed',
        'overdue': 'Overdue'
    };
    const cls = map[status] || 'status-pending';
    const label = labels[status] || status;
    return `<span class="status-badge ${cls}">${label}</span>`;
}