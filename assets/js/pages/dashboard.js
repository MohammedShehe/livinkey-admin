// Dashboard — one request (/admins/overview) powers the whole page.
document.addEventListener('DOMContentLoaded', () => {
    renderLayout('dashboard', 'Dashboard', 'Live overview of tenants, rent and operations');

    const E = LKUI.esc;
    const session = Auth.getSession() || {};
    const isSuper = session.role === 'super_admin';
    const perms = session.permissions || {};
    const can = (m, a = 'view') => isSuper || perms[m]?.[a] === true;

    const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
    const compact = (n) => { n = Number(n || 0); if (n >= 1e7) return '₹' + (n / 1e7).toFixed(1) + 'Cr'; if (n >= 1e5) return '₹' + (n / 1e5).toFixed(1) + 'L'; if (n >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'k'; return '₹' + n; };
    // 05:00-11:59 morning · 12:00-16:59 afternoon · 17:00-20:59 evening · 21:00-04:59 night
    const greetingFor = (h) => h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : h >= 17 && h < 21 ? 'Good evening' : 'Good night';
    const first = (session.name || 'there').split(' ')[0];
    const paintGreeting = () => { document.getElementById('heroTitle').textContent = `${greetingFor(new Date().getHours())}, ${first}`; };

    // static hero parts (render instantly)
    paintGreeting(); setInterval(paintGreeting, 60000);
    const prev = session.previous_login;
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('heroMeta').innerHTML =
        `<span class="hero-pill"><i class="bi bi-calendar3"></i>${E(today)}</span>` +
        `<span class="hero-pill"><i class="bi bi-clock-history"></i>${prev && prev.at ? 'Last sign-in ' + E(LKUI.timeAgo(prev.at)) : 'First sign-in on this account'}</span>` +
        `<span class="hero-pill"><i class="bi bi-person-check"></i>${isSuper ? 'Super Admin' : 'Admin'}</span>`;
    const acts = [];
    if (can('tenants', 'add')) acts.push('<a class="btn btn-brand" href="tenants.html?new=1"><i class="bi bi-person-plus"></i> Add tenant</a>');
    if (can('bills', 'add')) acts.push('<a class="btn btn-ghost" href="bills.html?new=1"><i class="bi bi-receipt"></i> Create bill</a>');
    if (can('tenants', 'view')) acts.push('<a class="btn btn-ghost" href="notifications.html"><i class="bi bi-megaphone"></i> Send notice</a>');
    document.getElementById('heroActions').innerHTML = acts.join('');
    document.getElementById('auditLink').hidden = !can('activity_logs');

    // skeletons
    const sk = (n, h = '90px') => Array.from({ length: n }, () => `<div class="sk" style="height:${h};margin-bottom:.6rem"></div>`).join('');
    document.getElementById('kpiRow').innerHTML = Array.from({ length: 4 }, () => `<div class="col-6 col-xl-3"><div class="kpi"><span class="sk" style="width:50%"></span><span class="sk" style="height:1.7rem;width:60%;margin-top:.5rem"></span></div></div>`).join('');
    ['occBody', 'todoBody', 'revBody', 'actBody'].forEach(id => { document.getElementById(id).innerHTML = sk(3, '48px'); });

    const kpi = (o) => `<div class="col-6 col-xl-3"><${o.href ? 'a href="' + E(o.href) + '"' : 'div'} class="kpi ${o.cls || ''}">
        <div class="k-top"><span>${E(o.label)}</span><span class="k-ico ${E(o.ico)}"><i class="bi ${E(o.icon)}"></i></span></div>
        <div class="k-val">${o.value}</div><div class="k-sub">${o.sub || ''}</div></${o.href ? 'a' : 'div'}></div>`;

    function render(d) {
        // ---- KPIs
        const k = [];
        if (d.tenants) k.push(kpi({ label: 'Active tenants', icon: 'bi-people-fill', ico: 'stat-icon-green', value: d.tenants.active, href: 'tenants.html',
            sub: `<b>${d.tenants.new_30d}</b> joined in 30 days · ${d.tenants.international} international` }));
        if (d.pgs) k.push(kpi({ label: 'Occupancy', icon: 'bi-door-open-fill', ico: 'stat-icon-blue', value: d.pgs.occupancy_pct + '%', href: 'pgs.html',
            sub: `<b>${d.pgs.occupied}</b> of ${d.pgs.capacity} beds · ${d.pgs.active}/${d.pgs.total} PGs live` }));
        if (d.bills) {
            k.push(kpi({ label: 'Collected this month', icon: 'bi-cash-stack', ico: 'stat-icon-green', value: inr(d.bills.collected_this_month), href: 'payments.html',
                sub: `of <b>${inr(d.bills.billed_this_month)}</b> billed` }));
            k.push(kpi({ label: 'Outstanding', icon: 'bi-exclamation-diamond-fill', ico: d.bills.outstanding ? 'stat-icon-red' : 'stat-icon-green', value: inr(d.bills.outstanding), href: 'bills.html?tab=unpaid',
                cls: d.bills.overdue ? 'bad' : '', sub: `<b>${d.bills.overdue}</b> overdue · ${d.bills.unpaid + d.bills.partially_paid} open bills` }));
        }
        if (k.length < 4 && d.maintenance) k.push(kpi({ label: 'Open maintenance', icon: 'bi-tools', ico: 'stat-icon-amber', value: d.maintenance.pending + d.maintenance.in_progress, href: 'maintenance.html', sub: `<b>${d.maintenance.completed_30d}</b> completed in 30 days` }));
        if (k.length < 4 && d.feedback) k.push(kpi({ label: 'Average rating', icon: 'bi-star-fill', ico: 'stat-icon-amber', value: d.feedback.avg_rating || '—', href: 'feedbacks.html', sub: `<b>${d.feedback.total}</b> reviews · ${d.feedback.new_7d} this week` }));
        if (k.length < 4 && d.guests) k.push(kpi({ label: 'Guests', icon: 'bi-person-badge', ico: 'stat-icon-blue', value: d.guests.total, href: 'guests.html', sub: `<b>${d.guests.new_7d}</b> new this week` }));
        document.getElementById('kpiRow').innerHTML = k.slice(0, 4).join('') || '<div class="col-12"><div class="empty-state"><i class="bi bi-shield-lock"></i><p class="fw-semibold mb-0">No dashboard modules available</p><p class="small">Ask a Super Admin to grant you view access to a module.</p></div></div>';

        // ---- occupancy
        const occ = document.getElementById('occBody');
        if (!d.pgs) occ.innerHTML = '<p class="text-muted-soft mb-0">You do not have access to PG data.</p>';
        else if (!d.pgs.list.length) occ.innerHTML = '<div class="empty-state py-4"><i class="bi bi-building"></i><p class="fw-semibold mb-0">No PGs yet</p></div>';
        else occ.innerHTML = d.pgs.list.map(p => {
            const pct = p.capacity ? Math.round(p.occupied / p.capacity * 100) : 0;
            const MAX = 40, shown = Math.min(p.capacity, MAX);
            const filled = Math.round(shown * (p.capacity ? p.occupied / p.capacity : 0));
            const cells = Array.from({ length: shown }, (_, i) => `<i class="${i < filled ? 'on' : ''}"></i>`).join('') + (p.capacity > MAX ? `<i class="more">+${p.capacity - MAX}</i>` : '');
            return `<a class="occ-row text-reset" href="pgs.html?pg=${E(p.id)}" title="Open ${E(p.name)}">
                <div class="occ-name">${E(p.name)}<small>${p.occupied} / ${p.capacity} beds${p.is_active ? '' : ' · inactive'}</small></div>
                <div class="occ-cells" aria-hidden="true">${cells}</div><div class="occ-pct">${pct}%</div></a>`;
        }).join('');

        // ---- to-do
        const todos = [];
        const add = (n, label, sub, href, mod) => { if (n > 0 && can(mod)) todos.push(`<a class="todo-item" href="${E(href)}"><span class="t-n">${n}</span><span class="t-l">${E(label)}<small>${E(sub)}</small></span><i class="bi bi-chevron-right"></i></a>`); };
        if (d.proofs) add(d.proofs.pending, 'Payment proofs to verify', 'Tenants are waiting for confirmation', 'bills.html#proofs', 'bills');
        if (d.bills) { add(d.bills.overdue, 'Overdue bills', 'Fines are accruing on these', 'bills.html?tab=unpaid', 'bills'); }
        if (d.maintenance) add(d.maintenance.pending, 'New maintenance requests', 'Not started yet', 'maintenance.html', 'maintenance');
        if (d.conversations) add(d.conversations.unread, 'Unread WhatsApp messages', 'In the conversations inbox', 'conversations.html', 'conversations');
        if (d.tenants) add(d.tenants.efrro_expiring_30d, 'e-FRRO expiring within 30 days', 'International tenants', 'tenants.html?filter=efrro-expiring', 'tenants');
        if (d.documents) add(d.documents.incomplete, 'Tenants with missing documents', `${d.documents.complete} of ${d.documents.tenants} are complete`, 'tenants.html?docs=pending', 'documents');
        if (d.feedback) add(d.feedback.new_7d, 'New feedback this week', 'Review what tenants are saying', 'feedbacks.html', 'feedbacks');
        document.getElementById('todoBody').innerHTML = todos.length ? todos.join('') : '<div class="todo-ok"><i class="bi bi-check2-circle fs-5"></i>All clear. Nothing needs attention right now.</div>';
        const n = todos.length;
        document.getElementById('heroSub').textContent = n ? `${n} item${n === 1 ? '' : 's'} need your attention today.` : 'Everything is up to date. Nice work.';

        // ---- revenue
        const rev = document.getElementById('revBody');
        if (!d.revenue_trend) rev.innerHTML = '<p class="text-muted-soft mb-0">You do not have access to billing data.</p>';
        else {
            const map = {}; d.revenue_trend.forEach(r => { map[r.month] = r.collected; });
            const months = []; const now = new Date();
            for (let i = 5; i >= 0; i--) { const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'), label: dt.toLocaleDateString('en-IN', { month: 'short' }), cur: i === 0 }); }
            const max = Math.max(1, ...months.map(m => map[m.key] || 0));
            rev.innerHTML = `<div class="rev-bars">${months.map(m => { const v = map[m.key] || 0; return `<div class="rev-col ${m.cur ? 'cur' : ''}"><span class="bv">${v ? compact(v) : '–'}</span><div class="bar" style="height:${Math.max(2, v / max * 100)}%" title="${E(inr(v))}"></div><span class="bl">${E(m.label)}</span></div>`; }).join('')}</div>`;
        }

        // ---- activity
        const act = document.getElementById('actBody');
        if (!d.recent_activity) act.innerHTML = '<p class="text-muted-soft mb-0">Activity is visible to admins with Activity access.</p>';
        else if (!d.recent_activity.length) act.innerHTML = '<div class="empty-state py-4"><i class="bi bi-activity"></i><p class="fw-semibold mb-0">No activity yet</p></div>';
        else {
            const verb = { created: 'added', updated: 'updated', deleted: 'removed', login: 'signed in', message_sent: 'sent a message', permissions_updated: 'changed permissions', exported: 'exported data', viewed: 'viewed' };
            const icon = { created: 'bi-plus-lg', updated: 'bi-pencil', deleted: 'bi-trash3', login: 'bi-box-arrow-in-right', message_sent: 'bi-send', permissions_updated: 'bi-shield-lock' };
            const tone = { deleted: 'red', login: 'blue', permissions_updated: 'amber' };
            act.innerHTML = `<ul class="feed">${d.recent_activity.map(a => `<li><span class="f-ico ${tone[a.action] || ''}"><i class="bi ${icon[a.action] || 'bi-dot'}"></i></span>
                <div class="f-main"><b>${E(a.actor_name || 'An admin')}</b> ${E(verb[a.action] || a.action)} ${a.action === 'login' ? '' : E(String(a.module || '').replace(/_/g, ' '))}${a.entity_id ? ` <span class="text-muted-soft">#${E(a.entity_id)}</span>` : ''}</div>
                <span class="f-time" title="${E(LKUI.fmtDateTime(a.created_at))}">${E(LKUI.timeAgo(a.created_at))}</span></li>`).join('')}</ul>`;
        }

        // ---- admin sign-ins (super admin)
        const row = document.getElementById('adminsRow');
        if (d.admins) {
            row.hidden = false;
            document.getElementById('adminSeenBody').innerHTML = d.admins.map(a => `<tr>
                <td data-label="Admin"><div class="fw-semibold">${E(a.name)}</div><div class="cell-sub">${E(a.email)}</div></td>
                <td data-label="Role"><span class="chip ${a.role === 'super_admin' ? 'chip-blue' : 'chip-gray'}">${a.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span></td>
                <td data-label="Last sign-in">${LKUI.seen(a.last_login_at)}</td>
                <td data-label="Device / IP"><span class="cell-sub">${E(a.last_login_ip || '—')}</span></td>
                <td data-label="Total sign-ins">${Number(a.login_count || 0)}</td>
                <td data-label="Status"><span class="chip ${a.is_active ? 'chip-green' : 'chip-red'} dot">${a.is_active ? 'Active' : 'Disabled'}</span></td></tr>`).join('');
        }
    }

    async function load() {
        try {
            const res = await API.admins.overview();
            if (!res.success) throw new Error(res.message || 'Could not load overview');
            render(res.data);
        } catch (e) {
            LKUI.toast(e.message || 'Could not load the dashboard', 'danger');
            document.getElementById('kpiRow').innerHTML = `<div class="col-12"><div class="alert alert-danger d-flex align-items-center justify-content-between gap-2 mb-0"><span><i class="bi bi-wifi-off me-2"></i>${E(e.message || 'Could not load the dashboard.')}</span><button class="btn btn-sm btn-outline-danger" onclick="LKUI.refresh(true)">Try again</button></div></div>`;
        }
    }
    LKUI.onRefresh(load);
    load().then(() => { LKUI.refreshState.last = new Date(); document.dispatchEvent(new CustomEvent('lk:refresh-end')); });
});
