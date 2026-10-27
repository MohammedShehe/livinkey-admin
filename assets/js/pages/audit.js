// Audit & sign-ins: admin actions (activity_logs) and sign-in history.
document.addEventListener('DOMContentLoaded', () => {
    renderLayout('audit', 'Audit & sign-ins', 'Every change made in this console, and who signed in');
    const E = LKUI.esc;
    const isSuper = (Auth.getSession() || {}).role === 'super_admin';
    const $ = (id) => document.getElementById(id);
    const PAGE = 100;
    let rows = [], total = 0, offset = 0, loading = false, tab = 'actions';

    const MODULES = ['tenants', 'guests', 'payments', 'maintenance', 'documents', 'feedbacks', 'pgs', 'messaging', 'admins', 'auth', 'system'];
    $('aModule').innerHTML += MODULES.map(m => `<option value="${m}">${m[0].toUpperCase() + m.slice(1)}</option>`).join('');
    if (!isSuper) $('tabLoginsLi').hidden = true;

    const verbs = { created: ['Created', 'chip-green'], updated: ['Updated', 'chip-blue'], deleted: ['Deleted', 'chip-red'], message_sent: ['Message sent', 'chip-gray'],
        permissions_updated: ['Permissions changed', 'chip-amber'], exported: ['Exported', 'chip-gray'], login: ['Signed in', 'chip-green'], viewed: ['Viewed', 'chip-gray'] };

    const params = () => ({ actor_type: 'admin', module: $('aModule').value, action: $('aAction').value, from: $('aFrom').value, to: $('aTo').value, limit: PAGE, offset });

    function draw() {
        const q = $('aSearch').value.trim().toLowerCase();
        const list = rows.filter(r => !q || `${r.actor_name || r.admin_name} ${r.action} ${r.module} ${r.entity_type || ''}`.toLowerCase().includes(q));
        $('actionsBody').innerHTML = list.length ? list.map(r => {
            const v = verbs[r.action] || [r.action, 'chip-gray'];
            return `<tr data-id="${E(r.id)}">
              <td data-label="When"><div>${E(LKUI.fmtDateTime(r.created_at))}</div><div class="cell-sub">${E(LKUI.timeAgo(r.created_at))}</div></td>
              <td data-label="Admin"><div class="fw-semibold">${E(r.actor_name || r.admin_name || 'System')}</div><div class="cell-sub">${E(r.actor_position || '')}</div></td>
              <td data-label="Action"><span class="chip ${v[1]}">${E(v[0])}</span></td>
              <td data-label="Module">${E(String(r.module || '').replace(/_/g, ' '))}</td>
              <td data-label="Record">${r.entity_id ? '#' + E(r.entity_id) : '—'}</td>
              <td data-label="IP address"><span class="cell-sub">${E(r.ip_address || '—')}</span></td></tr>`;
        }).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-journal-check"></i><p class="fw-semibold mb-0">No entries match</p><p class="small">Try widening the date range or clearing filters.</p></div></td></tr>`;
        $('loadMore').hidden = rows.length >= total;
        $('auditStats').innerHTML = [
            ['Entries in range', total, 'bi-journal-text', 'stat-icon-green'],
            ['Loaded', rows.length, 'bi-download', 'stat-icon-blue'],
        ].map(s => `<div class="col-6 col-lg-3"><div class="stat-card" style="cursor:default"><div class="stat-icon ${s[3]}"><i class="bi ${s[2]}"></i></div><div><div class="stat-value">${s[1]}</div><div class="stat-label">${s[0]}</div></div></div></div>`).join('');
    }

    async function loadActions(reset = true) {
        if (loading) return; loading = true;
        if (reset) { offset = 0; rows = []; PAGE_LOADER.table($('actionsBody'), 6, 'Loading activity…'); }
        try {
            const res = await API.activityLogs.list(params());
            if (!res.success) throw new Error(res.message);
            rows = rows.concat(res.data || []); total = res.total ?? rows.length; offset = rows.length; draw();
        } catch (e) { $('actionsBody').innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">${E(e.message || 'Could not load activity')}</td></tr>`; }
        finally { loading = false; }
    }
    async function loadLogins() {
        if (!isSuper) return;
        PAGE_LOADER.table($('loginsBody'), 5, 'Loading sign-ins…');
        try {
            const res = await API.admins.loginHistory(100);
            if (!res.success) throw new Error(res.message);
            $('loginsBody').innerHTML = res.data.length ? res.data.map(r => `<tr><td data-label="When"><div>${E(LKUI.fmtDateTime(r.created_at))}</div><div class="cell-sub">${E(LKUI.timeAgo(r.created_at))}</div></td>
                <td data-label="Admin" class="fw-semibold">${E(r.actor_name || 'Unknown')}</td><td data-label="Role">${E(r.actor_position || '')}</td>
                <td data-label="Device">${E(r.device_info || (r.user_agent || '').slice(0, 60) || '—')}</td><td data-label="IP address"><span class="cell-sub">${E(r.ip_address || '—')}</span></td></tr>`).join('')
                : '<tr><td colspan="5"><div class="empty-state"><i class="bi bi-box-arrow-in-right"></i><p class="fw-semibold mb-0">No sign-ins recorded yet</p></div></td></tr>';
            LKUI.table('#loginsTable', { key: 'audit_logins', noun: 'sign-in', csv: 'signins', pageSize: 25 });
        } catch (e) { $('loginsBody').innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">${E(e.message)}</td></tr>`; }
    }

    document.querySelectorAll('#auditTabs [data-tab]').forEach(b => b.addEventListener('click', () => {
        tab = b.dataset.tab;
        document.querySelectorAll('#auditTabs [data-tab]').forEach(x => x.classList.toggle('active', x === b));
        $('paneActions').hidden = tab !== 'actions'; $('paneLogins').hidden = tab !== 'logins';
        if (tab === 'logins') loadLogins();
    }));
    const reload = LKUI.debounce(() => loadActions(true), 300);
    ['aModule', 'aAction', 'aFrom', 'aTo'].forEach(id => $(id).addEventListener('change', reload));
    $('aSearch').addEventListener('input', LKUI.debounce(draw, 150));
    $('aReset').addEventListener('click', () => { ['aSearch', 'aModule', 'aAction', 'aFrom', 'aTo'].forEach(id => $(id).value = ''); loadActions(true); });
    $('loadMore').addEventListener('click', () => loadActions(false));
    $('actionsTable') && LKUI.table('#actionsTable', { key: 'audit_actions', noun: 'entry', csv: 'admin-audit-log', pageSize: 0, columns: false });

    LKUI.onRefresh(() => tab === 'logins' ? loadLogins() : loadActions(true));
    loadActions(true);
});
