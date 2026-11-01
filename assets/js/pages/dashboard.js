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
    document.getElementById('kpiRow').innerHTML = Array.from({ length: 4 }, () => `<div class="col-6 col-xl-3"><div class="kpi"><span class="sk" style="width:50%"></span><span class="sk" style="height:1.7rem;width:60%;margin-top:.4rem"></span></div></div>`).join('');
    ['occBody', 'todoBody', 'trendBody', 'statusBody', 'actBody', 'mixBody', 'duesBody', 'expBody'].forEach(id => { document.getElementById(id).innerHTML = sk(3, '48px'); });

    const { inr: rupee, compact: cmp2 } = LKCharts;
    const state = { pg: new URLSearchParams(location.search).get('pg') || localStorage.getItem('lk_dash_pg') || '', period: localStorage.getItem('lk_dash_period') || 'this_month' };
    document.getElementById('periodSelect').value = state.period;
    let overview = null;

    const kpi = (o) => `<div class="col-6 col-xl-3"><${o.href ? 'a href="' + E(o.href) + '"' : 'div'} class="kpi ${o.cls || ''}">
        <div class="k-top"><span>${E(o.label)}</span><span class="k-ico ${E(o.ico)}"><i class="bi ${E(o.icon)}"></i></span></div>
        <div class="k-val">${o.value}</div><div class="k-sub">${o.sub || ''}</div></${o.href ? 'a' : 'div'}></div>`;
    const pgq = () => state.pg ? `?pg=${encodeURIComponent(state.pg)}` : '';

    function paintPills(d) {
        const opts = [{ id: '', name: 'All PGs' }, ...d.pg_options.map(p => ({ id: String(p.id), name: p.name }))];
        document.getElementById('pgPills').innerHTML = opts.map(o => `<button class="pg-pill ${String(state.pg) === o.id ? 'active' : ''}" data-pg="${E(o.id)}">${E(o.name)}</button>`).join('');
        const sel = document.getElementById('pgSelect');
        sel.innerHTML = opts.map(o => `<option value="${E(o.id)}" ${String(state.pg) === o.id ? 'selected' : ''}>${E(o.name)}</option>`).join('');
    }

    function render(d) {
        paintPills(d);
        document.getElementById('scopeLine').innerHTML = `Showing <b>${E(d.scope.pg_name)}</b> · ${E(d.period.label)} <span class="text-muted-soft">(${E(d.period.from)} → ${E(d.period.to)})</span>`;
        document.getElementById('occTitle').textContent = state.pg ? 'Occupancy' : 'Occupancy by PG';
        const showExpenses = !!d.expenses;
        document.getElementById('expLegend').hidden = !showExpenses;
        document.getElementById('expLink').href = 'expenses.html' + pgq();
        document.getElementById('expLink').hidden = !can('expenses');

        // ---- KPIs (8)
        const k = [];
        if (d.tenants) k.push(kpi({ label: 'Active tenants', icon: 'bi-people-fill', ico: 'stat-icon-green', value: d.tenants.active, href: 'tenants.html', sub: `<b>${d.tenants.joined}</b> joined in period · ${d.tenants.checked_out} checked out` }));
        if (d.occupancy) k.push(kpi({ label: 'Occupancy', icon: 'bi-door-open-fill', ico: 'stat-icon-blue', value: d.occupancy.pct + '%', href: 'pgs.html', sub: `<b>${d.occupancy.occupied}</b> of ${d.occupancy.capacity} beds · <b>${d.occupancy.vacant}</b> vacant` }));
        if (d.billing) {
            k.push(kpi({ label: 'Collected', icon: 'bi-cash-stack', ico: 'stat-icon-green', value: rupee(d.billing.collected), href: 'payments.html', sub: `of <b>${rupee(d.billing.billed)}</b> billed · ${d.billing.collection_rate}%` }));
            k.push(kpi({ label: 'Outstanding now', icon: 'bi-exclamation-diamond-fill', ico: d.billing.outstanding ? 'stat-icon-red' : 'stat-icon-green', value: rupee(d.billing.outstanding), href: 'bills.html?tab=unpaid', cls: d.billing.overdue_bills ? 'bad' : '', sub: `<b>${d.billing.overdue_bills}</b> overdue · fines ${cmp2(d.billing.fines_outstanding)}` }));
        }
        if (d.expenses) {
            const net = (d.billing ? d.billing.collected : 0) - d.expenses.total;
            k.push(kpi({ label: 'Expenses', icon: 'bi-wallet2', ico: 'stat-icon-amber', value: rupee(d.expenses.total), href: 'expenses.html' + pgq(), sub: `<b>${d.expenses.count}</b> payments recorded` }));
            if (d.billing) k.push(kpi({ label: net >= 0 ? 'Net surplus' : 'Net deficit', icon: net >= 0 ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow', ico: net >= 0 ? 'stat-icon-green' : 'stat-icon-red', value: rupee(Math.abs(net)), cls: net < 0 ? 'bad' : '', sub: 'Collected minus expenses' }));
        }
        if (d.billing && d.billing.units_consumed) k.push(kpi({ label: 'Electricity', icon: 'bi-lightning-charge-fill', ico: 'stat-icon-amber', value: rupee(d.billing.electricity_billed), sub: `<b>${Math.round(d.billing.units_consumed)}</b> units metered` }));
        if (d.maintenance) k.push(kpi({ label: 'Open maintenance', icon: 'bi-tools', ico: 'stat-icon-amber', value: d.maintenance.pending + d.maintenance.in_progress, href: 'maintenance.html', sub: `<b>${d.maintenance.pending}</b> new · <b>${d.maintenance.completed}</b> fixed in period` }));
        if (d.documents) k.push(kpi({ label: 'Documents to review', icon: 'bi-files', ico: d.documents.pending_review ? 'stat-icon-amber' : 'stat-icon-green', value: d.documents.pending_review, href: 'documents.html?review=pending', sub: `<b>${d.documents.rejected}</b> rejected · ${d.documents.approved} approved` }));
        if (d.feedback && k.length < 8) k.push(kpi({ label: 'Average rating', icon: 'bi-star-fill', ico: 'stat-icon-amber', value: d.feedback.avg_rating || '—', href: 'feedbacks.html', sub: `<b>${d.feedback.total}</b> reviews` }));
        if (d.guests && k.length < 8) k.push(kpi({ label: 'Guests', icon: 'bi-person-badge', ico: 'stat-icon-blue', value: d.guests.total, href: 'guests.html', sub: `<b>${d.guests.joined}</b> new in period (all PGs)` }));
        document.getElementById('kpiRow').innerHTML = k.slice(0, 8).join('') || '<div class="col-12"><div class="empty-state"><i class="bi bi-shield-lock"></i><p class="fw-semibold mb-0">No dashboard modules available</p></div></div>';

        // ---- trend
        const tr = document.getElementById('trendBody');
        if (!d.trend) tr.innerHTML = '<p class="text-muted-soft mb-0">You do not have access to billing data.</p>';
        else {
            const series = [];
            if (can('bills')) { series.push({ name: 'Billed', color: '#4A8FE0', values: d.trend.map(t => t.billed) }); series.push({ name: 'Collected', color: 'var(--lk-green)', values: d.trend.map(t => t.collected) }); }
            if (showExpenses) series.push({ name: 'Expenses', color: '#E0864A', values: d.trend.map(t => t.expenses) });
            tr.innerHTML = LKCharts.groupedBars(d.trend.map(t => new Date(t.month + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short' })), series, { height: 220 });
        }

        // ---- status donut
        const st = document.getElementById('statusBody');
        if (!d.billing) st.innerHTML = '<p class="text-muted-soft mb-0">No access to billing.</p>';
        else { const s = d.billing.status; st.innerHTML = LKCharts.donut([{ label: 'Paid', value: s.paid }, { label: 'Partially paid', value: s.partially_paid }, { label: 'Unpaid', value: s.unpaid }, { label: 'Overdue', value: s.overdue }].filter(x => x.value > 0), { centerLabel: 'bills', format: (v) => v + '' }); }

        // ---- occupancy
        const occ = document.getElementById('occBody');
        if (!d.occupancy) occ.innerHTML = '<p class="text-muted-soft mb-0">You do not have access to PG data.</p>';
        else if (!d.occupancy.list.length) occ.innerHTML = '<div class="empty-state py-4"><i class="bi bi-building"></i><p class="fw-semibold mb-0">No PGs yet</p></div>';
        else occ.innerHTML = (state.pg ? `<div class="d-flex gap-4 mb-3 flex-wrap"><div><div class="fs-4 fw-bold">${d.occupancy.rooms}</div><small class="text-muted-soft">Rooms</small></div><div><div class="fs-4 fw-bold">${d.occupancy.rooms_full}</div><small class="text-muted-soft">Full</small></div><div><div class="fs-4 fw-bold">${d.occupancy.rooms_empty}</div><small class="text-muted-soft">Empty</small></div></div>` : '') + d.occupancy.list.map(p => {
            const MAX = 40, shown = Math.min(p.capacity, MAX);
            const filled = Math.round(shown * (p.capacity ? p.occupied / p.capacity : 0));
            const cells = Array.from({ length: shown }, (_, i) => `<i class="${i < filled ? 'on' : ''}"></i>`).join('') + (p.capacity > MAX ? `<i class="more">+${p.capacity - MAX}</i>` : '');
            return `<a class="occ-row text-reset" href="pgs.html?pg=${E(p.id)}"><div class="occ-name">${E(p.name)}<small>${p.occupied} / ${p.capacity} beds${p.is_active ? '' : ' · inactive'}</small></div><div class="occ-cells" aria-hidden="true">${cells}</div><div class="occ-pct">${p.pct}%</div></a>`;
        }).join('');

        // ---- to-do
        const todos = [];
        const add = (n, label, sub, href, mod) => { if (n > 0 && can(mod)) todos.push(`<a class="todo-item" href="${E(href)}"><span class="t-n">${n}</span><span class="t-l">${E(label)}<small>${E(sub)}</small></span><i class="bi bi-chevron-right"></i></a>`); };
        if (d.documents) add(d.documents.pending_review, 'Documents waiting for review', 'Approve or reject uploads', 'documents.html?review=pending', 'documents');
        if (d.proofs) add(d.proofs.pending, 'Payment proofs to verify', 'Tenants are waiting for confirmation', 'bills.html#proofs', 'bills');
        if (d.billing) add(d.billing.overdue_bills, 'Overdue bills', 'Fines are accruing on these', 'bills.html?tab=unpaid', 'bills');
        if (d.maintenance) add(d.maintenance.pending, 'New maintenance requests', 'Not started yet', 'maintenance.html', 'maintenance');
        if (overview && overview.conversations) add(overview.conversations.unread, 'Unread WhatsApp messages', 'In the conversations inbox', 'conversations.html', 'conversations');
        if (d.tenants) { add(d.tenants.efrro_expiring_30d, 'e-FRRO expiring within 30 days', 'International tenants', 'tenants.html?filter=efrro-expiring', 'tenants'); add(d.tenants.rent_due_soon, 'Rent period ending within 7 days', 'Raise the next bill', 'bills.html?new=1', 'bills'); }
        document.getElementById('todoBody').innerHTML = todos.length ? todos.join('') : '<div class="todo-ok"><i class="bi bi-check2-circle fs-5"></i>All clear. Nothing needs attention right now.</div>';
        const n = todos.length;
        document.getElementById('heroSub').textContent = n ? `${n} item${n === 1 ? '' : 's'} need your attention${state.pg ? ' at ' + d.scope.pg_name : ' today'}.` : 'Everything is up to date. Nice work.';

        // ---- PG comparison
        const cr = document.getElementById('cmpRow');
        if (d.pg_compare && d.pg_compare.length > 1) {
            cr.hidden = false;
            document.getElementById('cmpBody').innerHTML = d.pg_compare.map(p => `<tr style="cursor:pointer" data-open="${p.pg_id}"><td class="fw-semibold">${E(p.name)}${p.is_active ? '' : ' <span class="chip chip-gray">Inactive</span>'}</td>
              <td>${p.occupied}/${p.capacity} <span class="text-muted-soft">(${p.occupancy_pct}%)</span></td><td class="text-end">${rupee(p.billed)}</td><td class="text-end">${rupee(p.collected)}</td>
              <td class="text-end ${p.outstanding ? 'text-danger fw-semibold' : ''}">${rupee(p.outstanding)}</td><td class="text-end">${can('expenses') ? rupee(p.expenses) : '—'}</td>
              <td class="text-end fw-bold ${p.net < 0 ? 'text-danger' : ''}">${can('expenses') ? rupee(p.net) : '—'}</td></tr>`).join('');
        } else cr.hidden = true;

        // ---- tenant mix
        const mx = document.getElementById('mixBody');
        if (!d.tenants) mx.innerHTML = '<p class="text-muted-soft mb-0">No access to tenants.</p>';
        else mx.innerHTML = LKCharts.hbars([{ label: 'National', value: d.tenants.national, color: '#7FAE38' }, { label: 'International', value: d.tenants.international, color: '#4A8FE0' }, { label: 'Male', value: d.tenants.male, color: '#B06AD6' }, { label: 'Female', value: d.tenants.female, color: '#D6546A' }, { label: 'With vehicle', value: d.tenants.with_vehicle, color: '#E0B84A' }], { format: v => v + '' });

        // ---- dues
        const du = document.getElementById('duesBody');
        if (!d.top_dues) du.innerHTML = '<p class="text-muted-soft mb-0">No access to billing.</p>';
        else du.innerHTML = d.top_dues.length ? `<ul class="feed">${d.top_dues.map(t => `<li><span class="f-ico red"><i class="bi bi-person"></i></span><div class="f-main"><b>${E(t.name)}</b><div class="cell-sub">${E(t.pg_name || '')}${t.room ? ' · Room ' + E(t.room) : ''}</div></div><b class="text-danger">${rupee(t.due)}</b></li>`).join('')}</ul>` : '<div class="todo-ok"><i class="bi bi-check2-circle fs-5"></i>No dues. Everyone is paid up.</div>';

        // ---- expenses mini
        const ex = document.getElementById('expBody');
        ex.innerHTML = !d.expenses ? '<p class="text-muted-soft mb-0">Expenses are visible to admins with Expenses access.</p>'
            : (d.expenses.top_categories.length ? LKCharts.hbars(d.expenses.top_categories.map(c => ({ label: String(c.category).replace(/_/g, ' ').replace(/^./, m => m.toUpperCase()), value: c.total })), { color: '#E0864A' }) : '<div class="empty-state py-4"><i class="bi bi-wallet2"></i><p class="fw-semibold mb-0">No expenses recorded in this period</p></div>');

        renderActivityAndAdmins();
    }

    function renderActivityAndAdmins() {
        const d = overview || {};
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
            const [res, ov] = await Promise.all([
                API.analytics({ pg_id: state.pg, period: state.period }),
                API.admins.overview().catch(() => null)
            ]);
            if (!res.success) throw new Error(res.message || 'Could not load the dashboard');
            overview = ov && ov.success ? ov.data : null;
            render(res.data);
        } catch (e) {
            LKUI.toast(e.message || 'Could not load the dashboard', 'danger');
            document.getElementById('kpiRow').innerHTML = `<div class="col-12"><div class="alert alert-danger d-flex align-items-center justify-content-between gap-2 mb-0"><span><i class="bi bi-wifi-off me-2"></i>${E(e.message || 'Could not load the dashboard')}</span><button class="btn btn-sm btn-outline-danger" onclick="location.reload()">Retry</button></div></div>`;
        }
    }
    const choose = (pg) => { state.pg = pg; localStorage.setItem('lk_dash_pg', pg); const u = new URL(location.href); pg ? u.searchParams.set('pg', pg) : u.searchParams.delete('pg'); history.replaceState(null, '', u); load(); };
    document.getElementById('pgPills').addEventListener('click', (e) => { const b = e.target.closest('[data-pg]'); if (b) choose(b.dataset.pg); });
    document.getElementById('pgSelect').addEventListener('change', (e) => choose(e.target.value));
    document.getElementById('periodSelect').addEventListener('change', (e) => { state.period = e.target.value; localStorage.setItem('lk_dash_period', state.period); load(); });
    document.getElementById('cmpBody').addEventListener('click', (e) => { const r = e.target.closest('[data-open]'); if (r) choose(r.dataset.open); });
    LKUI.onRefresh(load);
    load().then(() => { LKUI.refreshState.last = new Date(); document.dispatchEvent(new CustomEvent('lk:refresh-end')); });
});
