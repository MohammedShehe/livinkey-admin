// ============ NOTIFICATION -> EXISTING PAGE MAPPING ============
const NOTIF_PAGE_MAP = {
    tenant: 'tenants.html',
    archive: 'archive.html',
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


// ============ SESSION CHECK (never blocks rendering) ============
const SESSION_VERIFY_KEY = 'lk_session_verified_at';
const SESSION_VERIFY_TTL = 60000;

function verifySessionInBackground() {
    const now = Date.now();
    if (now - Number(sessionStorage.getItem(SESSION_VERIFY_KEY) || 0) < SESSION_VERIFY_TTL) return;
    sessionStorage.setItem(SESSION_VERIFY_KEY, String(now));
    Auth.verifySession().then(ok => { if (!ok) window.location.replace('index.html'); }).catch(() => {});
}

// Prefetch a destination only when the pointer shows intent (hover / touch),
// instead of downloading every page up-front.
function prefetchOnIntent(root) {
    const seen = new Set();
    const go = (e) => {
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || seen.has(href) || /^https?:/.test(href)) return;
        seen.add(href);
        const l = document.createElement('link'); l.rel = 'prefetch'; l.href = href.split('#')[0]; document.head.appendChild(l);
    };
    root.addEventListener('pointerenter', go, { capture: true, passive: true });
    root.addEventListener('touchstart', go, { capture: true, passive: true });
}

function renderLayout(activeKey, pageTitle, pageSub) {
    if (!Auth.isAuthenticated()) {
        if (localStorage.getItem('lk_token')) Auth.clearLocalStorage();
        window.location.replace('index.html');
        return;
    }
    doRender(activeKey, pageTitle, pageSub);
    verifySessionInBackground();
}

// ============ NAVIGATION MODEL ============
// permission: module key in admin_permissions · superOnly: Super Admins only
const NAV_GROUPS = [
    { label: 'Overview', items: [
        { key: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill', href: 'dashboard.html' }
    ]},
    { label: 'People', items: [
        { key: 'tenants', label: 'Tenants', icon: 'bi-people-fill', href: 'tenants.html', permission: 'tenants', badgeId: 'menuBadge_tenants',
          submenu: [
            { label: 'All tenants', icon: 'bi-people', href: 'tenants.html' },
            { label: 'Bills paid', icon: 'bi-check-circle', href: 'tenants.html?filter=paid' },
            { label: 'Partially paid', icon: 'bi-hourglass-split', href: 'tenants.html?filter=partially_paid' },
            { label: 'Unpaid', icon: 'bi-exclamation-circle', href: 'tenants.html?filter=unpaid' },
            { divider: true },
            { label: 'National', icon: 'bi-flag', href: 'tenants.html?filter=residency:national' },
            { label: 'International', icon: 'bi-globe2', href: 'tenants.html?filter=residency:international' },
            { label: 'e-FRRO expiring', icon: 'bi-clock-history', href: 'tenants.html?filter=efrro-expiring' }
          ] },
        { key: 'guests', label: 'Guests', icon: 'bi-person-badge', href: 'guests.html', permission: 'guests', badgeId: 'menuBadge_guests' },
        { key: 'archive', label: 'Tenant archive', icon: 'bi-archive', href: 'archive.html', permission: 'archive', badgeId: 'menuBadge_archive' },
        { key: 'documents', label: 'Documents', icon: 'bi-files', href: 'documents.html', permission: 'documents', badgeId: 'menuBadge_documents' }
    ]},
    { label: 'Finance', items: [
        { key: 'bills', label: 'Bills', icon: 'bi-receipt-cutoff', href: 'bills.html', permission: 'bills', badgeId: 'menuBadge_bills',
          submenu: [
            { label: 'All bills', icon: 'bi-receipt', href: 'bills.html' },
            { label: 'Unpaid', icon: 'bi-exclamation-circle', href: 'bills.html?tab=unpaid' },
            { label: 'Partially paid', icon: 'bi-hourglass-split', href: 'bills.html?tab=unfinished' },
            { label: 'Paid', icon: 'bi-check-circle', href: 'bills.html?tab=paid' }
          ] },
        { key: 'proofs', label: 'Payment proofs', icon: 'bi-file-earmark-check', href: 'bills.html#proofs', permission: 'bills', badgeId: 'menuBadge_proofs' },
        { key: 'payments', label: 'Payments', icon: 'bi-credit-card', href: 'payments.html', permission: 'bills', badgeId: 'menuBadge_payments' }
    ]},
    { label: 'Property', items: [
        { key: 'pgs', label: 'PGs', icon: 'bi-building', href: 'pgs.html', permission: 'pgs', badgeId: 'menuBadge_pgs',
          submenu: [
            { label: 'All PGs', icon: 'bi-building', href: 'pgs.html' },
            { label: 'Active', icon: 'bi-check-circle', href: 'pgs.html?status=active' },
            { label: 'Inactive', icon: 'bi-x-circle', href: 'pgs.html?status=inactive' }
          ] },
        { key: 'maintenance', label: 'Maintenance', icon: 'bi-tools', href: 'maintenance.html', permission: 'maintenance', badgeId: 'menuBadge_maintenance' }
    ]},
    { label: 'Communication', items: [
        { key: 'notifications', label: 'Send notifications', icon: 'bi-megaphone-fill', href: 'notifications.html', permission: 'tenants', badgeId: 'notifMenuBadge' },
        { key: 'conversations', label: 'Conversations', icon: 'bi-whatsapp', href: 'conversations.html', permission: 'conversations', badgeId: 'convMenuBadge' },
        { key: 'feedbacks', label: 'Feedback', icon: 'bi-chat-dots-fill', href: 'feedbacks.html', permission: 'feedbacks', badgeId: 'menuBadge_feedbacks' }
    ]},
    { label: 'Public website', items: [
        { key: 'website', label: 'Website control', icon: 'bi-globe-americas', href: 'website.html', permission: 'about_livinkey' },
        { key: 'website_stats', label: 'Public counters', icon: 'bi-graph-up-arrow', href: 'website-stats.html', permission: 'about_livinkey' },
        { key: 'about_livinkey', label: 'Notices', icon: 'bi-building-check', href: 'about-livinkey.html', permission: 'about_livinkey' },
        { key: 'ads', label: 'Ads', icon: 'bi-badge-ad-fill', href: 'ads.html', permission: 'ads' }
    ]},
    { label: 'Administration', items: [
        { key: 'activity_logs', label: 'App activity', icon: 'bi-activity', href: 'activity.html', permission: 'activity_logs',
          submenu: [
            { label: 'All users', icon: 'bi-people', href: 'activity.html' },
            { label: 'App installed', icon: 'bi-phone', href: 'activity.html?status=installed' },
            { label: 'Not installed', icon: 'bi-phone-slash', href: 'activity.html?status=not_installed' }
          ] },
        { key: 'audit', label: 'Audit & sign-ins', icon: 'bi-shield-check', href: 'audit.html', permission: 'activity_logs' },
        { key: 'admins', label: 'Admins', icon: 'bi-shield-lock-fill', href: 'admins.html', permission: 'admins', superOnly: true, tag: 'SA' },
        { key: 'settings', label: 'Settings', icon: 'bi-gear-fill', href: 'settings.html' }
    ]}
];
window.LK_NAV_GROUPS = NAV_GROUPS;

function doRender(activeKey, pageTitle, pageSub) {
    const session = Auth.getSession();
    if (!session) { Auth.clearAll(); window.location.href = 'index.html'; return; }

    const admin = session.admin || session;
    const role = session.role || admin.role || 'admin';
    const isSuperAdmin = role === 'super_admin';
    const permissions = session.permissions || {};
    window.LK_ADMIN_PERMISSIONS = permissions;
    window.LK_ADMIN_ROLE = role;
    window.LK_IS_SUPER_ADMIN = isSuperAdmin;

    let finalActiveKey = activeKey;
    if (window.location.hash === '#proofs' && activeKey === 'bills') finalActiveKey = 'proofs';

    const hasPermission = (m) => {
        if (m.superOnly) return isSuperAdmin;
        if (!m.permission) return true;
        if (isSuperAdmin) return true;
        return permissions[m.permission]?.view === true;
    };

    const E = (v) => LKUI.esc(v);
    const currentUrl = (window.location.pathname.split('/').pop() || '') + (window.location.search || '') + (window.location.hash || '');
    const isSubActive = (href) => {
        if (!href) return false;
        const page = (window.location.pathname.split('/').pop() || '').toLowerCase();
        const h = href.toLowerCase();
        if (!h.startsWith(page.split('?')[0].split('#')[0])) return false;
        if (h.includes('?') || h.includes('#')) return currentUrl.toLowerCase() === h;
        return !window.location.search && !window.location.hash;
    };

    const groups = NAV_GROUPS
        .map(g => ({ ...g, items: g.items.filter(hasPermission) }))
        .filter(g => g.items.length);

    let activeGroupLabel = '';
    const navHtml = groups.map(g => {
        const items = g.items.map(m => {
            const isActive = m.key === finalActiveKey;
            if (isActive) activeGroupLabel = g.label;
            const hasSub = !!(m.submenu && m.submenu.length);
            const open = hasSub && (isActive || m.submenu.some(s => s.href && isSubActive(s.href) && (s.href.includes('?') || s.href.includes('#'))));
            const subs = hasSub ? `<div class="side-submenu">${m.submenu.map(s => s.divider
                ? '<div class="side-submenu-divider"></div>'
                : `<a href="${E(s.href)}" class="side-sublink${isSubActive(s.href) ? ' active' : ''}"><i class="bi ${E(s.icon || 'bi-dot')}"></i><span>${E(s.label)}</span></a>`).join('')}</div>` : '';
            return `<div class="side-item${open ? ' open' : ''}" data-key="${E(m.key)}">
                <a href="${E(m.href)}" class="side-link${isActive ? ' active' : ''}" title="${E(m.label)}"${isActive ? ' aria-current="page"' : ''}>
                    <i class="bi ${E(m.icon)}"></i><span class="side-text">${E(m.label)}</span>
                    ${m.tag ? `<span class="badge-mini">${E(m.tag)}</span>` : ''}
                    ${m.badgeId ? `<span id="${E(m.badgeId)}" class="menu-unread-badge">0</span>` : ''}
                    ${hasSub ? '<i class="bi bi-chevron-right side-caret" data-toggle-sub title="Show sub-menu"></i>' : ''}
                </a>${subs}</div>`;
        }).join('');
        return `<div class="side-group-label">${E(g.label)}</div>${items}`;
    }).join('');

    const sidebarMount = document.getElementById('sidebarMount');
    const topbarMount = document.getElementById('topbarMount');
    if (!sidebarMount || !topbarMount) { console.error('Page template must include #sidebarMount and #topbarMount.'); return; }

    // collapsed preference (desktop)
    if (LKUI.ls.get('lk_sidebar_collapsed') === '1' && window.matchMedia('(min-width: 992px)').matches) document.body.classList.add('sidebar-collapsed');

    sidebarMount.innerHTML = `
        <aside class="sidebar" id="sidebarEl" aria-label="Main navigation">
            <div class="side-brand">
                <a href="dashboard.html" aria-label="Livinkey dashboard"><img class="logo-light" src="assets/img/black_logo.png" alt="Livinkey"><img class="logo-dark" src="assets/img/white_logo.png" alt="Livinkey"><span class="brand-key"><i class="bi bi-key-fill"></i></span></a>
                <button class="side-collapse" id="sideCollapseBtn" type="button" aria-label="Collapse sidebar" title="Collapse sidebar"><i class="bi bi-chevron-left"></i></button>
            </div>
            <button class="side-search" id="cmdOpenBtn" type="button" aria-label="Search pages and actions"><i class="bi bi-search"></i><span>Quick search</span><kbd>Ctrl K</kbd></button>
            <nav class="side-nav">${navHtml}</nav>
            <div class="side-footer"><span class="conn"><span class="conn-dot"></span><span class="conn-text">Connected</span></span><span class="ms-auto ver">v2.0</span></div>
        </aside>
        <div class="sidebar-backdrop" id="sidebarBackdrop"></div>`;

    const userName = session.name || admin.name || 'Admin';
    const userEmail = session.email || admin.email || '';
    const initials = userName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'A';
    const prev = session.previous_login || null;
    const lastLine = prev && prev.at
        ? `Last sign-in ${LKUI.timeAgo(prev.at)}${prev.device ? ' · ' + E(prev.device) : ''}`
        : (session.last_login_at ? `Signed in ${LKUI.timeAgo(session.last_login_at)}` : 'First sign-in on this account');

    const crumbs = `<nav class="crumbs" aria-label="Breadcrumb"><a href="dashboard.html">Home</a>${activeGroupLabel && activeGroupLabel !== 'Overview' ? `<i class="bi bi-chevron-right"></i><span>${E(activeGroupLabel)}</span>` : ''}</nav>`;

    topbarMount.innerHTML = `
        <a class="skip-link" href="#mainContent">Skip to content</a>
        <div class="offline-banner" role="alert">You're offline — showing the last loaded data.</div>
        <header class="topbar">
            <div class="topbar-left">
                <button class="btn-icon sidebar-toggle" id="sidebarToggleBtn" type="button" aria-label="Open menu"><i class="bi bi-list"></i></button>
                <div>${crumbs}<p class="page-title">${E(pageTitle)}</p>${pageSub ? `<p class="page-sub">${E(pageSub)}</p>` : ''}</div>
            </div>
            <div class="topbar-right">
                <span class="updated-at" id="updatedAt" aria-live="polite"></span>
                <button class="btn-icon" id="refreshBtn" type="button" title="Refresh data" aria-label="Refresh data"><i class="bi bi-arrow-clockwise"></i></button>
                <button class="btn-icon theme-toggle" id="themeBtn" type="button" title="Switch theme" aria-label="Switch theme"><i class="bi bi-moon-stars-fill"></i><i class="bi bi-sun-fill"></i></button>
                <div class="dropdown">
                    <button class="btn-icon notif-btn" data-bs-toggle="dropdown" data-bs-auto-close="outside" id="notifBell" type="button" aria-label="Notifications"><i class="bi bi-bell"></i><span class="notif-dot" id="notifCount">0</span></button>
                    <div class="dropdown-menu dropdown-menu-end notif-dropdown-panel">
                        <div class="notif-dropdown-header"><p>Notifications</p><button type="button" class="btn btn-link btn-sm p-0" id="notifMarkAllReadBtn">Mark all read</button></div>
                        <div id="notifList"><p class="notif-empty">Loading…</p></div>
                    </div>
                </div>
                <div class="dropdown">
                    <button class="profile-trigger" data-bs-toggle="dropdown" type="button" aria-label="Account menu">
                        <div class="avatar-circle">${E(initials)}</div>
                        <div class="pt-text text-start d-none d-sm-block"><div class="pt-name">${E(userName)}</div><div class="pt-role">${isSuperAdmin ? 'Super Admin' : 'Admin'}</div></div>
                        <i class="bi bi-chevron-down small text-muted-soft d-none d-sm-inline"></i>
                    </button>
                    <div class="dropdown-menu dropdown-menu-end p-2" style="min-width:270px">
                        <div class="px-2 pt-1 pb-2 mb-1 border-bottom">
                            <div class="fw-bold">${E(userName)}</div>
                            <div class="small text-muted-soft text-break">${E(userEmail)}</div>
                            <div class="small text-muted-soft mt-1"><i class="bi bi-clock-history me-1"></i>${lastLine}</div>
                        </div>
                        <a class="dropdown-item" href="settings.html#profile"><i class="bi bi-person-circle me-2"></i>My profile & security</a>
                        <a class="dropdown-item" href="settings.html#preferences"><i class="bi bi-sliders me-2"></i>Preferences</a>
                        <button class="dropdown-item" type="button" id="themeItem"><i class="bi bi-circle-half me-2"></i>Switch light / dark</button>
                        <button class="dropdown-item" type="button" id="cmdOpenBtn2"><i class="bi bi-command me-2"></i>Quick search <span class="ms-auto small text-muted-soft">Ctrl K</span></button>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item text-danger fw-semibold" id="logoutBtn" type="button"><i class="bi bi-box-arrow-right me-2"></i>Log out</button>
                    </div>
                </div>
            </div>
        </header>`;

    const main = document.querySelector('main.content-area'); if (main && !main.id) main.id = 'mainContent';

    // ---------- badges (cached so navigation never flashes empty) ----------
    const BADGE_KEY = 'lk_badges_v2';
    function setMenuBadge(id, n) {
        const b = document.getElementById(id); if (!b) return;
        if (n > 0) { b.style.display = 'inline-flex'; b.textContent = n > 99 ? '99+' : String(n); } else { b.style.display = 'none'; b.textContent = '0'; }
    }
    function updateBell(n) {
        const b = document.getElementById('notifCount'); if (!b) return;
        if (n > 0) { b.style.display = 'flex'; b.textContent = n > 99 ? '99+' : String(n); } else b.style.display = 'none';
    }
    const ENTITY_MENU_BADGE = {
        tenant: 'menuBadge_tenants', tenants: 'menuBadge_tenants', archive: 'menuBadge_archive', archived: 'menuBadge_archive',
        guests: 'menuBadge_guests', guest: 'menuBadge_guests', bill: 'menuBadge_bills', bills: 'menuBadge_bills',
        payment: 'menuBadge_payments', payments: 'menuBadge_payments', proof: 'menuBadge_proofs', proofs: 'menuBadge_proofs',
        payment_proof: 'menuBadge_proofs', pg: 'menuBadge_pgs', pgs: 'menuBadge_pgs', maintenance: 'menuBadge_maintenance',
        document: 'menuBadge_documents', documents: 'menuBadge_documents', feedback: 'menuBadge_feedbacks', feedbacks: 'menuBadge_feedbacks'
    };
    function resolveMenuBadgeId(n) {
        const entity = String(n.entity_type || '').toLowerCase().trim();
        if (entity && ENTITY_MENU_BADGE[entity]) return ENTITY_MENU_BADGE[entity];
        const hay = `${n.link || n.action_url || ''} ${n.title || n.message || ''}`.toLowerCase();
        if (/archive|checked.?out/.test(hay)) return 'menuBadge_archive';
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
    function applyBadges(c) {
        Object.values(ENTITY_MENU_BADGE).forEach(id => setMenuBadge(id, 0));
        Object.entries(c.menu || {}).forEach(([id, n]) => setMenuBadge(id, n));
        updateBell(c.bell || 0); setMenuBadge('convMenuBadge', c.conv || 0);
    }
    function loadBadges(force) {
        try {
            const cached = JSON.parse(sessionStorage.getItem(BADGE_KEY) || 'null');
            if (cached) { applyBadges(cached.v); if (!force && Date.now() - cached.at < 45000) return; }
        } catch (_) {}
        Promise.all([
            API.notifications.unread(100).catch(() => null),
            API.getConversationUnreadCount ? API.getConversationUnreadCount().catch(() => null) : null
        ]).then(([n, c]) => {
            const v = { menu: {}, bell: 0, conv: 0 };
            if (n && n.success) {
                (n.data || []).forEach(x => { const id = resolveMenuBadgeId(x); if (id) v.menu[id] = (v.menu[id] || 0) + 1; });
                v.bell = n.unreadCount !== undefined ? n.unreadCount : (n.data || []).length;
            }
            if (c && c.success) v.conv = c.unreadCount || 0;
            sessionStorage.setItem(BADGE_KEY, JSON.stringify({ at: Date.now(), v }));
            applyBadges(v);
        });
    }
    window.LK_refreshBadges = () => loadBadges(true);
    loadBadges(false);

    // ---------- notification panel ----------
    function loadNotifications() {
        const list = document.getElementById('notifList'); if (!list) return;
        const when = (v) => { const d = LKUI.parseDate(v); return d ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''; };
        API.notifications.unread(20).then(res => {
            if (res.success && res.data) {
                if (!res.data.length) list.innerHTML = '<p class="notif-empty"><i class="bi bi-check2-circle d-block fs-3 mb-1 text-brand"></i>You\'re all caught up</p>';
                else list.innerHTML = res.data.map(n => `
                    <div class="notif-item-card is-unread" data-id="${E(n.id)}">
                        <div class="notif-item-icon" style="color:${E(n.color || 'var(--lk-green-darker)')}"><i class="bi ${E(n.icon || 'bi-bell')}"></i></div>
                        <a href="#" class="notif-item-body notif-item" data-id="${E(n.id)}" data-page="${E(resolveNotificationPage(n))}">
                            <span class="notif-item-title">${E(n.title || 'Notification')}</span>
                            ${n.message ? `<span class="notif-item-message">${E(n.message)}</span>` : ''}
                            <span class="notif-item-meta">${E(when(n.created_at || n.createdAt))}</span>
                        </a>
                        <button type="button" class="btn-icon notif-delete-btn" data-id="${E(n.id)}" title="Dismiss" aria-label="Dismiss notification"><i class="bi bi-x-lg"></i></button>
                    </div>`).join('');
            }
            if (res.unreadCount !== undefined) updateBell(res.unreadCount);
        }).catch(() => { list.innerHTML = '<p class="notif-empty">Couldn\'t load notifications. <a href="#" id="notifRetry">Retry</a></p>'; });
    }
    document.getElementById('notifBell')?.addEventListener('click', loadNotifications);
    document.getElementById('notifList')?.addEventListener('click', (e) => {
        if (e.target.id === 'notifRetry') { e.preventDefault(); return loadNotifications(); }
        const del = e.target.closest('.notif-delete-btn');
        if (del) {
            e.preventDefault(); e.stopPropagation();
            API.notifications.delete(del.dataset.id).then(r => {
                if (r.success) { del.closest('.notif-item-card')?.remove(); loadBadges(true); } else showToast(r.message || 'Could not dismiss', 'danger');
            }).catch(() => showToast('Could not dismiss notification', 'danger'));
            return;
        }
        const item = e.target.closest('.notif-item'); if (!item) return;
        e.preventDefault(); item.style.opacity = '.6';
        API.notifications.markRead(item.dataset.id).catch(() => {}).finally(() => { sessionStorage.removeItem(BADGE_KEY); window.location.href = item.dataset.page || 'tenants.html'; });
    });
    document.getElementById('notifMarkAllReadBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        API.notifications.markAllRead().then(r => { if (r && r.success) { loadBadges(true); loadNotifications(); showToast('All notifications marked as read', 'success'); } }).catch(() => {});
    });

    // ---------- refresh button + auto refresh ----------
    const refreshBtn = document.getElementById('refreshBtn'), updatedAt = document.getElementById('updatedAt');
    const paintUpdated = () => { const l = LKUI.refreshState.last; if (updatedAt) updatedAt.textContent = l ? 'Updated ' + l.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''; };
    refreshBtn?.addEventListener('click', () => { loadBadges(true); LKUI.refresh(true); });
    document.addEventListener('lk:refresh-start', () => refreshBtn?.classList.add('spinning'));
    document.addEventListener('lk:refresh-end', () => { refreshBtn?.classList.remove('spinning'); paintUpdated(); });
    if (!window.__lkRefreshAuto) { window.__lkRefreshAuto = true; window.addEventListener('load', () => setTimeout(() => LKUI.refreshState.setAuto(Number(LKUI.ls.get('lk_pref_autorefresh', 0))), 500)); }

    // ---------- theme ----------
    document.getElementById('themeBtn')?.addEventListener('click', () => LKUI.theme.toggle());
    document.getElementById('themeItem')?.addEventListener('click', () => LKUI.theme.toggle());
    LKUI.theme.apply();

    // ---------- logout / drawer / collapse ----------
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (await LKUI.confirm({ title: 'Log out?', body: 'You will need your password and a one-time code to sign in again.', confirmText: 'Log out', tone: 'info', icon: 'bi-box-arrow-right' })) Auth.logout();
    });
    const sb = document.getElementById('sidebarEl'), bd = document.getElementById('sidebarBackdrop');
    const closeDrawer = () => { sb.classList.remove('show'); bd.classList.remove('show'); };
    document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => { sb.classList.toggle('show'); bd.classList.toggle('show'); });
    bd?.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    document.getElementById('sideCollapseBtn')?.addEventListener('click', () => {
        const c = document.body.classList.toggle('sidebar-collapsed'); LKUI.ls.set('lk_sidebar_collapsed', c ? '1' : '0');
    });
    // Accordion: caret toggles the sub-menu without navigating
    sb.addEventListener('click', (e) => {
        const caret = e.target.closest('[data-toggle-sub]');
        if (caret) { e.preventDefault(); e.stopPropagation(); caret.closest('.side-item').classList.toggle('open'); }
    });
    const nav = sb.querySelector('.side-nav'), SKEY = 'lk_side_nav_scroll';
    const saved = Number(sessionStorage.getItem(SKEY) || 0);
    if (saved) nav.scrollTop = saved; else sb.querySelector('.side-link.active')?.scrollIntoView({ block: 'center' });
    nav.addEventListener('scroll', () => sessionStorage.setItem(SKEY, String(nav.scrollTop)), { passive: true });
    prefetchOnIntent(sb);
    LKUI.setOnline(navigator.onLine);

    // ---------- command palette ----------
    const items = [];
    groups.forEach(g => g.items.forEach(m => {
        items.push({ label: m.label, icon: m.icon, href: m.href, group: g.label, kw: g.label });
        (m.submenu || []).filter(s => !s.divider).slice(1).forEach(s => items.push({ label: `${m.label} · ${s.label}`, icon: s.icon, href: s.href, group: 'Shortcuts', kw: m.label }));
    }));
    const can = (mod, act) => isSuperAdmin || permissions[mod]?.[act] === true;
    const actions = [];
    if (can('tenants', 'add')) actions.push({ label: 'Add a tenant', icon: 'bi-person-plus', href: 'tenants.html?new=1', group: 'Actions' });
    if (can('bills', 'add')) actions.push({ label: 'Create a bill', icon: 'bi-receipt', href: 'bills.html?new=1', group: 'Actions' });
    if (can('pgs', 'add')) actions.push({ label: 'Add a PG', icon: 'bi-building-add', href: 'pgs.html?new=1', group: 'Actions' });
    actions.push({ label: 'Refresh this page', icon: 'bi-arrow-clockwise', run: () => LKUI.refresh(true), group: 'Actions' });
    actions.push({ label: 'Log out', icon: 'bi-box-arrow-right', run: () => document.getElementById('logoutBtn').click(), group: 'Actions' });
    initCommandPalette([...actions, ...items]);
}

function initCommandPalette(all) {
    if (document.getElementById('lkCmd')) return;
    const wrap = document.createElement('div');
    wrap.className = 'lk-cmd'; wrap.id = 'lkCmd'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Quick search');
    wrap.innerHTML = `<div class="lk-cmd-box"><div class="lk-cmd-input"><i class="bi bi-search"></i><input type="text" id="lkCmdInput" placeholder="Jump to a page or run an action…" autocomplete="off" aria-label="Search"><kbd>Esc</kbd></div><div class="lk-cmd-list" id="lkCmdList"></div><div class="lk-cmd-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span></div></div>`;
    document.body.appendChild(wrap);
    const input = wrap.querySelector('#lkCmdInput'), list = wrap.querySelector('#lkCmdList');
    let shown = [], idx = 0;
    const E = LKUI.esc;
    function paint() {
        const q = input.value.trim().toLowerCase();
        shown = all.filter(i => !q || (i.label + ' ' + (i.kw || '') + ' ' + i.group).toLowerCase().includes(q)).slice(0, 40);
        idx = Math.min(idx, Math.max(0, shown.length - 1));
        if (!shown.length) { list.innerHTML = '<div class="lk-cmd-empty">No matches. Try “tenants”, “bills” or “settings”.</div>'; return; }
        let last = '';
        list.innerHTML = shown.map((i, n) => {
            const head = i.group !== last ? `<div class="lk-cmd-group">${E(i.group)}</div>` : ''; last = i.group;
            return `${head}<div class="lk-cmd-item${n === idx ? ' active' : ''}" data-n="${n}" role="option"><i class="bi ${E(i.icon)}"></i><span>${E(i.label)}</span></div>`;
        }).join('');
        list.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    }
    function open() { wrap.classList.add('show'); input.value = ''; idx = 0; paint(); setTimeout(() => input.focus(), 10); }
    function close() { wrap.classList.remove('show'); }
    function exec(i) { close(); if (!i) return; if (i.run) i.run(); else window.location.href = i.href; }
    input.addEventListener('input', () => { idx = 0; paint(); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(idx + 1, shown.length - 1); paint(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, 0); paint(); }
        else if (e.key === 'Enter') { e.preventDefault(); exec(shown[idx]); }
    });
    list.addEventListener('click', (e) => { const el = e.target.closest('.lk-cmd-item'); if (el) exec(shown[+el.dataset.n]); });
    list.addEventListener('mousemove', (e) => { const el = e.target.closest('.lk-cmd-item'); if (el && +el.dataset.n !== idx) { idx = +el.dataset.n; list.querySelectorAll('.lk-cmd-item').forEach((x, n) => x.classList.toggle('active', n === idx)); } });
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); wrap.classList.contains('show') ? close() : open(); }
        else if (e.key === 'Escape' && wrap.classList.contains('show')) close();
    });
    document.getElementById('cmdOpenBtn')?.addEventListener('click', open);
    document.getElementById('cmdOpenBtn2')?.addEventListener('click', open);
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
    return `<span class="status-badge ${cls}">${lkEsc(label)}</span>`;
}
// ============ PAGE DATA LOADING STATES ============
// Shared loading UI for tables, grids, and content panels across all admin pages.
if (typeof window.PAGE_LOADER === 'undefined') {
    window.PAGE_LOADER = {
        spinnerHtml(message = 'Loading...') {
            return `<div class="page-loading-state" role="status" aria-live="polite">
                <div class="spinner-border text-brand spinner-border-sm" role="status" aria-hidden="true"></div>
                <span>${lkEsc(message)}</span>
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
