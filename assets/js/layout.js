// Livinkey Admin - Layout & Navigation
// Full backend integration with permission-based UI

// ============ NOTIFICATION -> EXISTING PAGE MAPPING ============
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
    if (n.link) {
        const seg = n.link.split('/').filter(Boolean)[0];
        if (seg && NOTIF_PAGE_MAP[seg]) return NOTIF_PAGE_MAP[seg];
    }
    return 'tenants.html';
}

function renderLayout(activeKey, pageTitle, pageSub) {
    // FIX: Validate token with backend before rendering layout
    if (!Auth.isAuthenticated()) {
        // Check for legacy localStorage token - clean it up
        const localToken = localStorage.getItem('lk_token');
        if (localToken) {
            Auth.clearLocalStorage();
        }
        window.location.href = 'index.html';
        return;
    }
    
    // FIX: Verify the session with the backend
    Auth.verifySession().then(isValid => {
        if (!isValid) {
            // Token was invalid - redirect to login
            window.location.href = 'index.html';
            return;
        }
        // Token is valid - proceed with rendering
        doRender(activeKey, pageTitle, pageSub);
    }).catch(() => {
        window.location.href = 'index.html';
    });
}

function doRender(activeKey, pageTitle, pageSub) {
    const session = Auth.getSession();
    if (!session) {
        Auth.clearAll();
        window.location.href = 'index.html';
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
    
    let finalActiveKey = activeKey;
    if (window.location.hash === '#proofs' && activeKey === 'bills') {
        finalActiveKey = 'proofs';
    }
    
    // ============================================================
    // MENU ITEMS - Added "Send Notifications" after admins
    // ============================================================
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
        // ============================================================
        // NEW: Send Notifications menu item
        // Uses tenants.view permission since notification sending
        // requires ability to see tenants
        // ============================================================
        { 
            key: 'notifications', 
            label: 'Send Notifications', 
            icon: 'bi-megaphone-fill', 
            href: 'notifications.html',
            permission: 'tenants'
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
            permission: 'bills'
        },
        { 
            key: 'proofs', 
            label: 'Payment Proofs', 
            icon: 'bi-file-earmark-check', 
            href: 'bills.html#proofs',
            permission: 'bills'
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
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-link btn-sm p-0 small" id="notifMarkAllReadBtn">Mark all read</button>
                            </div>
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

    // ============================================================
    // NEW: Delete notification function
    // ============================================================
    function deleteNotification(id) {
        if (!confirm('Delete this notification?')) return;
        
        API.notifications.delete(id)
            .then(res => {
                if (res.success) {
                    // Get updated unread count
                    API.notifications.unreadCount()
                        .then(countRes => {
                            if (countRes && countRes.success && countRes.unreadCount !== undefined) {
                                updateNotificationBadge(countRes.unreadCount);
                            }
                        })
                        .catch(() => {});
                    
                    // Reload the notification list
                    loadNotifications();
                    showToast('Notification deleted', 'success');
                } else {
                    showToast(res.message || 'Failed to delete notification', 'danger');
                }
            })
            .catch(() => {
                showToast('Error deleting notification', 'danger');
            });
    }
    
    // ============================================================
    // FIXED: loadNotifications with delete buttons
    // ============================================================
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
                            <div class="dropdown-item rounded-3 py-2 mb-1 notif-item-wrapper" data-id="${n.id}">
                                <div class="d-flex align-items-start gap-2">
                                    <a href="#" class="flex-grow-1 notif-item" data-id="${n.id}" data-page="${resolveNotificationPage(n)}" style="text-decoration:none;color:inherit;">
                                        <span style="color:${n.color || 'var(--lk-green)'};">
                                            <i class="bi ${n.icon || 'bi-bell'} me-2"></i>
                                        </span>
                                        ${n.title}
                                        <br><small class="text-muted-soft">${n.message}</small>
                                    </a>
                                    <button class="btn btn-sm btn-icon notif-delete-btn" 
                                            data-id="${n.id}" 
                                            style="width:28px;height:28px;flex-shrink:0;border-radius:6px;color:var(--danger);border-color:var(--danger);"
                                            title="Delete notification">
                                        <i class="bi bi-x-lg" style="font-size:0.7rem;"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('');
                        
                        // Attach delete event listeners
                        document.querySelectorAll('.notif-delete-btn').forEach(btn => {
                            btn.addEventListener('click', function(e) {
                                e.stopPropagation();
                                const id = this.dataset.id;
                                deleteNotification(id);
                            });
                        });
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
    
    const notifBtn = document.getElementById('notifBell');
    if (notifBtn) {
        notifBtn.addEventListener('click', function() {
            loadNotifications();
        });
    }

    const notifListEl = document.getElementById('notifList');
    if (notifListEl) {
        notifListEl.addEventListener('click', function(e) {
            const item = e.target.closest('.notif-item');
            if (!item) return;
            e.preventDefault();

            const id = item.dataset.id;
            const page = item.dataset.page || 'tenants.html';

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

    const markAllBtn = document.getElementById('notifMarkAllReadBtn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            API.notifications.markAllRead()
                .then(res => {
                    if (res && res.success) {
                        updateNotificationBadge(0);
                        loadNotifications();
                        showToast('All notifications marked as read', 'success');
                    }
                })
                .catch(() => { /* non-fatal */ });
        });
    }

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