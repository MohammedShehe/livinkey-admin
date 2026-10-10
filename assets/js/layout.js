// Livinkey Admin - Layout & Navigation
// Full backend integration with permission-based UI

// ============ NOTIFICATION -> EXISTING PAGE MAPPING ============
const NOTIF_PAGE_MAP = {
    tenant: 'tenants.html',
    guests: 'guests.html',
    guest: 'guests.html',
    bill: 'bills.html',
    bills: 'bills.html',
    payment: 'payments.html',
    payments: 'payments.html',
    proof: 'bills.html#proofs',
    proofs: 'bills.html#proofs',
    pg: 'pgs.html',
    pgs: 'pgs.html',
    admin: 'admins.html',
    feedback: 'feedbacks.html',
    feedbacks: 'feedbacks.html',
    maintenance: 'maintenance.html',
    document: 'documents.html',
    documents: 'documents.html',
    conversation: 'conversations.html',
    conversations: 'conversations.html'
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

// Fast navigation helpers. Menu rendering is never blocked by an API round-trip.
const SESSION_VERIFY_KEY = 'lk_session_verified_at';
const SESSION_VERIFY_TTL = 30000;

function warmInternalPages(hrefs) {
    const unique = [...new Set(hrefs)].filter(Boolean);
    const warm = () => {
        unique.forEach(href => {
            if (href.startsWith('#')) return;
            if (document.querySelector(`link[data-lk-prefetch="${href}"]`)) return;
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.as = 'document';
            link.href = href;
            link.dataset.lkPrefetch = href;
            document.head.appendChild(link);
        });
    };

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(warm, { timeout: 1200 });
    } else {
        setTimeout(warm, 150);
    }
}

function verifySessionInBackground() {
    const now = Date.now();
    const lastVerified = Number(sessionStorage.getItem(SESSION_VERIFY_KEY) || 0);

    if (now - lastVerified < SESSION_VERIFY_TTL) return;

    // Avoid a validation request on every single menu click.
    sessionStorage.setItem(SESSION_VERIFY_KEY, String(now));

    Auth.verifySession().then(isValid => {
        if (!isValid) {
            window.location.replace('index.html');
        } else {
            sessionStorage.setItem(SESSION_VERIFY_KEY, String(Date.now()));
        }
    }).catch(() => {
        // Do not block navigation because of a temporary network failure.
    });
}

function renderLayout(activeKey, pageTitle, pageSub) {
    // Local session state is enough to render the shell immediately.
    // Backend validation happens in the background.
    if (!Auth.isAuthenticated()) {
        const localToken = localStorage.getItem('lk_token');
        if (localToken) Auth.clearLocalStorage();
        window.location.replace('index.html');
        return;
    }

    doRender(activeKey, pageTitle, pageSub);
    verifySessionInBackground();
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
    // Submenus use ONLY existing page filters / hashes — no new endpoints.
    const MENU = [
        { 
            key: 'tenants', 
            label: 'Tenants Management', 
            icon: 'bi-people-fill', 
            href: 'tenants.html',
            permission: 'tenants',
            badgeId: 'menuBadge_tenants',
            submenu: [
                { label: 'All Tenants', icon: 'bi-people', href: 'tenants.html' },
                { label: 'Paid', icon: 'bi-check-circle', href: 'tenants.html?filter=paid' },
                { label: 'Partially Paid', icon: 'bi-hourglass-split', href: 'tenants.html?filter=partially_paid' },
                { label: 'Unpaid', icon: 'bi-exclamation-circle', href: 'tenants.html?filter=unpaid' },
                { divider: true },
                { label: 'National', icon: 'bi-flag', href: 'tenants.html?filter=residency:national' },
                { label: 'International', icon: 'bi-globe2', href: 'tenants.html?filter=residency:international' },
                { label: 'Male', icon: 'bi-gender-male', href: 'tenants.html?filter=gender:male' },
                { label: 'Female', icon: 'bi-gender-female', href: 'tenants.html?filter=gender:female' },
                { divider: true },
                { label: 'e-FRRO Expiring', icon: 'bi-clock-history', href: 'tenants.html?filter=efrro-expiring' }
            ]
        },
        { 
            key: 'guests', 
            label: 'Guests', 
            icon: 'bi-person-badge', 
            href: 'guests.html',
            permission: 'guests',
            badgeId: 'menuBadge_guests'
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
            key: 'notifications', 
            label: 'Send Notifications', 
            icon: 'bi-megaphone-fill', 
            href: 'notifications.html',
            permission: 'tenants',
            badgeId: 'notifMenuBadge'
        },
        { 
            key: 'conversations', 
            label: 'Conversations', 
            icon: 'bi-whatsapp', 
            href: 'conversations.html',
            permission: 'conversations',
            badgeId: 'convMenuBadge'
        },
        { 
            key: 'bills', 
            label: 'Bills', 
            icon: 'bi-receipt-cutoff', 
            href: 'bills.html',
            permission: 'bills',
            badgeId: 'menuBadge_bills',
            submenu: [
                { label: 'All Bills', icon: 'bi-receipt', href: 'bills.html' },
                { label: 'Unpaid', icon: 'bi-exclamation-circle', href: 'bills.html?tab=unpaid' },
                { label: 'Partially Paid', icon: 'bi-hourglass-split', href: 'bills.html?tab=unfinished' },
                { label: 'Paid', icon: 'bi-check-circle', href: 'bills.html?tab=paid' },
                { divider: true },
                { label: 'Payment Proofs', icon: 'bi-file-earmark-check', href: 'bills.html#proofs' }
            ]
        },
        { 
            key: 'payments', 
            label: 'Payments', 
            icon: 'bi-credit-card', 
            href: 'payments.html',
            permission: 'bills',
            badgeId: 'menuBadge_payments'
        },
        { 
            key: 'proofs', 
            label: 'Payment Proofs', 
            icon: 'bi-file-earmark-check', 
            href: 'bills.html#proofs',
            permission: 'bills',
            badgeId: 'menuBadge_proofs'
        },
        { 
            key: 'pgs', 
            label: 'PGs Management', 
            icon: 'bi-building', 
            href: 'pgs.html',
            permission: 'pgs',
            badgeId: 'menuBadge_pgs',
            submenu: [
                { label: 'All PGs', icon: 'bi-building', href: 'pgs.html' },
                { label: 'Active', icon: 'bi-check-circle', href: 'pgs.html?status=active' },
                { label: 'Inactive', icon: 'bi-x-circle', href: 'pgs.html?status=inactive' }
            ]
        },
        { 
            key: 'maintenance', 
            label: 'Maintenance', 
            icon: 'bi-tools', 
            href: 'maintenance.html',
            permission: 'maintenance',
            badgeId: 'menuBadge_maintenance'
        },
        { 
            key: 'documents', 
            label: 'Documents', 
            icon: 'bi-files', 
            href: 'documents.html',
            permission: 'documents',
            badgeId: 'menuBadge_documents'
        },
        { 
            key: 'feedbacks', 
            label: 'Feedbacks', 
            icon: 'bi-chat-dots-fill', 
            href: 'feedbacks.html',
            permission: 'feedbacks',
            badgeId: 'menuBadge_feedbacks'
        },
        { 
            key: 'about_livinkey', 
            label: 'About Livinkey', 
            icon: 'bi-building-check', 
            href: 'about-livinkey.html',
            permission: 'about_livinkey'
        },
        {
            key: 'ads',
            label: 'Ads',
            icon: 'bi-badge-ad-fill',
            href: 'ads.html',
            permission: 'ads'
        },
        { 
            key: 'activity_logs', 
            label: 'Activity Tracking', 
            icon: 'bi-activity', 
            href: 'activity.html',
            permission: 'activity_logs',
            submenu: [
                { label: 'All Users', icon: 'bi-people', href: 'activity.html' },
                { label: 'App Installed', icon: 'bi-phone', href: 'activity.html?status=installed' },
                { label: 'Not Installed', icon: 'bi-phone-slash', href: 'activity.html?status=not_installed' }
            ]
        }
    ];
    
    const hasPermission = (key) => {
        if (key === 'admins') return isSuperAdmin;
        if (isSuperAdmin) return true;
        return permissions[key]?.view === true;
    };

    const currentUrl = window.location.pathname.split('/').pop() + (window.location.search || '') + (window.location.hash || '');
    const isSubActive = (href) => {
        if (!href) return false;
        const page = (window.location.pathname.split('/').pop() || '').toLowerCase();
        const h = href.toLowerCase();
        if (!h.startsWith(page.split('?')[0].split('#')[0])) return false;
        if (h.includes('?') || h.includes('#')) {
            return currentUrl.toLowerCase() === h || window.location.href.toLowerCase().endsWith(h);
        }
        return !window.location.search && !window.location.hash;
    };

    const renderSubmenu = (subs) => {
        if (!subs || !subs.length) return '';
        return `<div class="side-submenu" role="menu">${subs.map(s => {
            if (s.divider) return '<div class="side-submenu-divider"></div>';
            if (s.group) return `<div class="side-submenu-label">${s.group}</div>`;
            const act = isSubActive(s.href) ? ' active' : '';
            return `<a href="${s.href}" class="side-sublink${act}" role="menuitem"><i class="bi ${s.icon || 'bi-dot'}"></i><span>${s.label}</span></a>`;
        }).join('')}</div>`;
    };
    
    const menuHtml = MENU
        .filter(m => hasPermission(m.key))
        .map(m => {
            const hasSub = m.submenu && m.submenu.length;
            const active = m.key === finalActiveKey ? ' active' : '';
            const subCls = hasSub ? ' has-submenu' : '';
            return `<div class="side-item">
                <a href="${m.href}" class="side-link${active}${subCls}" style="position:relative;" title="${m.label}" aria-label="${m.label}"${hasSub ? ' aria-haspopup="true"' : ''}>
                    <i class="bi ${m.icon}"></i><span>${m.label}</span>
                    ${m.key === 'admins' && isSuperAdmin ? '<span class="badge-mini">SA</span>' : ''}
                    ${m.badgeId ? `<span id="${m.badgeId}" class="menu-unread-badge" style="display:none;">0</span>` : ''}
                </a>
                ${hasSub ? renderSubmenu(m.submenu) : ''}
            </div>`;
        }).join('');
    
    // Sidebar
    document.getElementById('sidebarMount').innerHTML = `
        <aside class="sidebar" id="sidebarEl">
            <div class="side-brand">
                <img src="assets/img/white_logo.png" alt="Livinkey" height="34">
            </div>
            <style>
                .menu-unread-badge {
                    display: none;
                    margin-left: auto;
                    min-width: 18px;
                    height: 18px;
                    padding: 0 6px;
                    border-radius: 999px;
                    background: #e74c3c;
                    color: #fff;
                    font-size: 0.68rem;
                    font-weight: 700;
                    align-items: center;
                    justify-content: center;
                    line-height: 1;
                    flex-shrink: 0;
                }
                .side-link {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .side-link > span:not(.menu-unread-badge):not(.badge-mini) {
                    flex: 1;
                    min-width: 0;
                }
                /* Top-bar notification panel */
                .notif-dropdown-panel {
                    width: min(420px, 92vw) !important;
                    max-width: 420px;
                    padding: 0 !important;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.14);
                }
                .notif-dropdown-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.85rem 1rem;
                    border-bottom: 1px solid var(--border, #e8e8e8);
                    background: var(--bg, #fafafa);
                }
                .notif-dropdown-header p {
                    font-family: 'Sora', sans-serif;
                    font-weight: 700;
                    margin: 0;
                    font-size: 0.95rem;
                }
                #notifList {
                    max-height: 420px;
                    overflow-y: auto;
                    padding: 0.4rem;
                }
                .notif-item-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.55rem;
                    padding: 0.7rem 0.65rem;
                    border-radius: 10px;
                    margin-bottom: 0.25rem;
                    border: 1px solid transparent;
                    background: #fff;
                    transition: background 0.15s, border-color 0.15s;
                }
                .notif-item-card:hover {
                    background: var(--bg, #f6f8f6);
                    border-color: var(--border, #e8e8e8);
                }
                .notif-item-card.is-unread {
                    background: rgba(46, 125, 50, 0.06);
                    border-color: rgba(46, 125, 50, 0.12);
                }
                .notif-item-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    background: rgba(46, 125, 50, 0.1);
                    font-size: 0.95rem;
                }
                .notif-item-body {
                    flex: 1;
                    min-width: 0;
                    text-decoration: none;
                    color: inherit;
                    cursor: pointer;
                }
                .notif-item-title {
                    display: block;
                    font-weight: 650;
                    font-size: 0.86rem;
                    line-height: 1.35;
                    color: var(--ink, #1a1a1a);
                    word-break: break-word;
                    white-space: normal;
                }
                .notif-item-message {
                    display: block;
                    margin-top: 0.2rem;
                    font-size: 0.78rem;
                    line-height: 1.4;
                    color: var(--muted, #6b7280);
                    word-break: break-word;
                    white-space: normal;
                    overflow-wrap: anywhere;
                }
                .notif-item-meta {
                    display: block;
                    margin-top: 0.25rem;
                    font-size: 0.7rem;
                    color: var(--muted, #9ca3af);
                }
                .notif-item-card .notif-delete-btn {
                    width: 28px;
                    height: 28px;
                    flex-shrink: 0;
                    border-radius: 6px;
                    color: var(--danger, #dc3545);
                    border: 1px solid transparent;
                    background: transparent;
                    opacity: 0.55;
                }
                .notif-item-card:hover .notif-delete-btn {
                    opacity: 1;
                    border-color: var(--danger, #dc3545);
                }
                .notif-empty {
                    text-align: center;
                    color: var(--muted, #6b7280);
                    font-size: 0.85rem;
                    padding: 1.5rem 0.75rem;
                    margin: 0;
                }
            </style>
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
                    <button class="btn btn-icon notif-btn" data-bs-toggle="dropdown" id="notifBell" aria-label="Notifications">
                        <i class="bi bi-bell-fill"></i>
                        <span class="notif-dot" id="notifCount" style="display:none;">0</span>
                    </button>
                    <div class="dropdown-menu dropdown-menu-end notif-dropdown-panel">
                        <div class="notif-dropdown-header">
                            <p>Notifications</p>
                            <button type="button" class="btn btn-link btn-sm p-0 small" id="notifMarkAllReadBtn">Mark all read</button>
                        </div>
                        <div id="notifList">
                            <p class="notif-empty">Loading notifications...</p>
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
    
    // Update topbar notification badge (clear & visible)
    function updateNotificationBadge(count) {
        const badge = document.getElementById('notifCount');
        if (badge) {
            if (count > 0) {
                badge.style.display = 'flex';
                badge.style.alignItems = 'center';
                badge.style.justifyContent = 'center';
                badge.style.minWidth = '18px';
                badge.style.height = '18px';
                badge.style.padding = '0 5px';
                badge.style.fontSize = '0.7rem';
                badge.style.fontWeight = '700';
                badge.style.borderRadius = '999px';
                badge.style.background = '#e74c3c';
                badge.style.color = '#fff';
                badge.textContent = count > 99 ? '99+' : String(count);
            } else {
                badge.style.display = 'none';
                badge.textContent = '0';
            }
        }
    }

    function setMenuBadge(badgeId, count) {
        const badge = document.getElementById(badgeId);
        if (!badge) return;
        if (count > 0) {
            badge.style.display = 'inline-flex';
            badge.textContent = count > 99 ? '99+' : String(count);
        } else {
            badge.style.display = 'none';
            badge.textContent = '0';
        }
    }

    function updateConversationMenuBadge(count) {
        setMenuBadge('convMenuBadge', count);
    }

    // Map notification entity_type -> sidebar menu badge id
    const ENTITY_MENU_BADGE = {
        tenant: 'menuBadge_tenants',
        tenants: 'menuBadge_tenants',
        guests: 'menuBadge_guests',
        guest: 'menuBadge_guests',
        bill: 'menuBadge_bills',
        bills: 'menuBadge_bills',
        payment: 'menuBadge_payments',
        payments: 'menuBadge_payments',
        proof: 'menuBadge_proofs',
        proofs: 'menuBadge_proofs',
        payment_proof: 'menuBadge_proofs',
        pg: 'menuBadge_pgs',
        pgs: 'menuBadge_pgs',
        maintenance: 'menuBadge_maintenance',
        document: 'menuBadge_documents',
        documents: 'menuBadge_documents',
        feedback: 'menuBadge_feedbacks',
        feedbacks: 'menuBadge_feedbacks'
    };

    function resolveMenuBadgeId(n) {
        const entity = String(n.entity_type || '').toLowerCase().trim();
        if (entity && ENTITY_MENU_BADGE[entity]) return ENTITY_MENU_BADGE[entity];

        // Fallback: infer from link path or title keywords
        const link = String(n.link || n.action_url || '').toLowerCase();
        const title = String(n.title || n.message || '').toLowerCase();
        const hay = `${link} ${title}`;

        if (/proof/.test(hay)) return 'menuBadge_proofs';
        if (/payment/.test(hay)) return 'menuBadge_payments';
        if (/bill/.test(hay)) return 'menuBadge_bills';
        if (/guest/.test(hay)) return 'menuBadge_guests';
        if (/tenant/.test(hay)) return 'menuBadge_tenants';
        if (/maintenance|repair/.test(hay)) return 'menuBadge_maintenance';
        if (/document/.test(hay)) return 'menuBadge_documents';
        if (/feedback/.test(hay)) return 'menuBadge_feedbacks';
        if (/pg|paying guest/.test(hay)) return 'menuBadge_pgs';
        return null;
    }

    function clearAllMenuNotifBadges() {
        Object.values(ENTITY_MENU_BADGE).forEach(id => setMenuBadge(id, 0));
        setMenuBadge('notifMenuBadge', 0);
        // Conversations uses its own unread API; leave convMenuBadge alone here.
    }

    // Distribute unread admin notifications onto the matching menu items
    function loadMenuNotificationBadges() {
        if (typeof API === 'undefined' || !API.notifications) return;
        API.notifications.unread(100)
            .then(res => {
                if (!res || !res.success) return;
                const list = res.data || [];
                const counts = {};
                list.forEach(n => {
                    const badgeId = resolveMenuBadgeId(n);
                    if (!badgeId) return;
                    counts[badgeId] = (counts[badgeId] || 0) + 1;
                });
                clearAllMenuNotifBadges();
                Object.entries(counts).forEach(([badgeId, count]) => setMenuBadge(badgeId, count));
                if (res.unreadCount !== undefined) {
                    updateNotificationBadge(res.unreadCount);
                }
            })
            .catch(() => {});
    }

    function loadConversationUnreadBadge() {
        if (typeof API === 'undefined' || !API.getConversationUnreadCount) return;
        API.getConversationUnreadCount()
            .then(res => {
                if (res && res.success) {
                    updateConversationMenuBadge(res.unreadCount || 0);
                }
            })
            .catch(() => {});
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
                            loadMenuNotificationBadges();
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

        const escapeHtml = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        const formatWhen = (value) => {
            if (!value) return '';
            try {
                const d = new Date(value);
                if (Number.isNaN(d.getTime())) return '';
                return d.toLocaleString(undefined, {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
            } catch (_) {
                return '';
            }
        };

        API.notifications.unread(20)
            .then(res => {
                if (res.success && res.data) {
                    if (res.data.length === 0) {
                        list.innerHTML = '<p class="notif-empty">No unread notifications</p>';
                    } else {
                        list.innerHTML = res.data.map(n => {
                            const title = escapeHtml(n.title || 'Notification');
                            const message = escapeHtml(n.message || '');
                            const when = escapeHtml(formatWhen(n.created_at || n.createdAt));
                            const icon = escapeHtml(n.icon || 'bi-bell');
                            const color = escapeHtml(n.color || 'var(--lk-green)');
                            const page = escapeHtml(resolveNotificationPage(n));
                            const isUnread = n.is_read === 0 || n.is_read === false || n.read_at == null;
                            return `
                            <div class="notif-item-card ${isUnread ? 'is-unread' : ''}" data-id="${n.id}">
                                <div class="notif-item-icon" style="color:${color};">
                                    <i class="bi ${icon}"></i>
                                </div>
                                <a href="#" class="notif-item-body notif-item" data-id="${n.id}" data-page="${page}">
                                    <span class="notif-item-title">${title}</span>
                                    ${message ? `<span class="notif-item-message">${message}</span>` : ''}
                                    ${when ? `<span class="notif-item-meta">${when}</span>` : ''}
                                </a>
                                <button type="button" class="btn btn-sm btn-icon notif-delete-btn"
                                        data-id="${n.id}" title="Delete notification">
                                    <i class="bi bi-x-lg" style="font-size:0.7rem;"></i>
                                </button>
                            </div>`;
                        }).join('');

                        document.querySelectorAll('.notif-delete-btn').forEach(btn => {
                            btn.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteNotification(this.dataset.id);
                            });
                        });
                    }
                }
                if (res.unreadCount !== undefined) {
                    updateNotificationBadge(res.unreadCount);
                }
            })
            .catch(() => {
                list.innerHTML = '<p class="notif-empty">Failed to load notifications</p>';
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
                    loadMenuNotificationBadges();
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
                        clearAllMenuNotifBadges();
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
                loadMenuNotificationBadges();
            } else {
                loadMenuNotificationBadges();
            }
        })
        .catch(() => {
            // Still try menu badges even if count endpoint fails
            loadMenuNotificationBadges();
        });

    // Conversations badge is independent of admin notification entity_type
    loadConversationUnreadBadge();
    
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

    // ---- Preserve sidebar scroll position across page navigations ----
    const NAV_SCROLL_KEY = 'lk_side_nav_scroll';
    const sideNavEl = document.querySelector('.side-nav');
    if (sideNavEl) {
        const savedScroll = Number(sessionStorage.getItem(NAV_SCROLL_KEY) || 0);
        if (savedScroll > 0) {
            requestAnimationFrame(() => {
                sideNavEl.scrollTop = savedScroll;
            });
        }
        const persistScroll = () => {
            sessionStorage.setItem(NAV_SCROLL_KEY, String(sideNavEl.scrollTop));
        };
        sideNavEl.addEventListener('scroll', persistScroll, { passive: true });
        document.querySelectorAll('.side-nav a.side-link, .side-nav a.side-sublink').forEach(a => {
            a.addEventListener('click', persistScroll, { passive: true });
        });
    }

    // ---- Sidebar hover expands main content ----
    const sidebarEl = document.getElementById('sidebarEl');
    // Sidebar and main content are siblings on these pages, not children of
    // .app-shell. Keep the body state in sync so the main area follows the
    // sidebar's expanded/collapsed width.
    if (sidebarEl && window.matchMedia('(min-width: 992px)').matches) {
        let hoverTimer = null;
        sidebarEl.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimer);
            document.body.classList.add('sidebar-expanded');
        });
        sidebarEl.addEventListener('mouseleave', () => {
            hoverTimer = setTimeout(() => document.body.classList.remove('sidebar-expanded'), 80);
        });
    }

    // ---- Flyout submenus: position:fixed so they are NOT clipped by sidebar overflow:hidden ----
    (function initSideSubmenus() {
        const items = document.querySelectorAll('.side-item');
        if (!items.length) return;

        let openMenu = null;
        let closeTimer = null;

        function closeAll() {
            document.querySelectorAll('.side-submenu.is-open').forEach(el => {
                el.classList.remove('is-open');
                el.style.top = '';
                el.style.left = '';
            });
            openMenu = null;
        }

        function positionAndOpen(item) {
            const sub = item.querySelector('.side-submenu');
            const link = item.querySelector('.side-link');
            if (!sub || !link) return;

            const sb = document.getElementById('sidebarEl');
            const desktopOpen = sb && (sb.matches(':hover') || document.querySelector('.app-shell.sidebar-expanded'));
            const mobileOpen = sb && sb.classList.contains('show');
            if (!desktopOpen && !mobileOpen) return;

            closeAll();

            const rect = link.getBoundingClientRect();
            const gap = 8;
            let top = rect.top;
            let left = rect.right + gap;

            sub.classList.add('is-open');
            const sh = sub.offsetHeight || 200;
            const sw = sub.offsetWidth || 210;

            if (top + sh > window.innerHeight - 8) {
                top = Math.max(8, window.innerHeight - sh - 8);
            }
            if (left + sw > window.innerWidth - 8) {
                left = Math.max(8, rect.left - sw - gap);
            }

            sub.style.top = Math.round(top) + 'px';
            sub.style.left = Math.round(left) + 'px';
            openMenu = sub;
        }

        items.forEach(item => {
            const sub = item.querySelector('.side-submenu');
            if (!sub) return;

            item.addEventListener('mouseenter', () => {
                clearTimeout(closeTimer);
                positionAndOpen(item);
            });
            item.addEventListener('mouseleave', () => {
                closeTimer = setTimeout(closeAll, 140);
            });
            // Keep open while pointer is on the flyout (which is outside the sidebar)
            sub.addEventListener('mouseenter', () => clearTimeout(closeTimer));
            sub.addEventListener('mouseleave', () => {
                closeTimer = setTimeout(closeAll, 140);
            });
        });

        document.getElementById('sidebarEl')?.addEventListener('mouseleave', () => {
            closeTimer = setTimeout(closeAll, 160);
        });

        document.querySelector('.side-nav')?.addEventListener('scroll', () => {
            if (openMenu) closeAll();
        }, { passive: true });

        window.addEventListener('resize', closeAll);
    })();

    // Warm the browser cache for menu destinations after the current UI is ready.
    warmInternalPages(
        Array.from(document.querySelectorAll('.side-nav .side-link, .side-nav .side-sublink'))
            .map(link => link.getAttribute('href'))
            .filter(Boolean)
    );
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
// ============ PAGE DATA LOADING STATES ============
// Shared loading UI for tables, grids, and content panels across all admin pages.
if (typeof window.PAGE_LOADER === 'undefined') {
    window.PAGE_LOADER = {
        spinnerHtml(message = 'Loading...') {
            return `<div class="page-loading-state" role="status" aria-live="polite">
                <div class="spinner-border text-brand spinner-border-sm" role="status" aria-hidden="true"></div>
                <span>${message}</span>
            </div>`;
        },
        table(tbody, colspan = 6, message = 'Loading...') {
            if (!tbody) return;
            const emptyId = tbody.id ? tbody.id.replace(/Tbody$/, 'Empty').replace(/tbody$/i, 'Empty') : null;
            if (emptyId) {
                const emptyEl = document.getElementById(emptyId);
                if (emptyEl) emptyEl.classList.add('d-none');
            }
            tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-5">${this.spinnerHtml(message)}</td></tr>`;
        },
        element(el, message = 'Loading...') {
            if (!el) return;
            el.innerHTML = this.spinnerHtml(message);
        },
        grid(el, message = 'Loading...') {
            if (!el) return;
            el.innerHTML = `<div class="col-12">${this.spinnerHtml(message)}</div>`;
        },
        hideEmpty(id) {
            const el = document.getElementById(id);
            if (el) el.classList.add('d-none');
        }
    };
}
