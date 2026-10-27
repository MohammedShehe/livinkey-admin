document.addEventListener('DOMContentLoaded', () => {
    renderLayout('settings', 'Settings', 'Your account, preferences and system status');
    const E = LKUI.esc, $ = (id) => document.getElementById(id);
    const s = Auth.getSession() || {};
    const isSuper = s.role === 'super_admin';

    function showPane(p) {
        document.querySelectorAll('.settings-pane').forEach(x => x.classList.toggle('active', x.id === 'pane-' + p));
        document.querySelectorAll('#stNav button').forEach(b => b.classList.toggle('active', b.dataset.pane === p));
        history.replaceState(null, '', '#' + p);
        if (p === 'system') loadHealth();
    }
    if (isSuper) $('navSystem').hidden = false;
    document.querySelectorAll('#stNav button').forEach(b => b.addEventListener('click', () => showPane(b.dataset.pane)));
    const h = location.hash.slice(1); if (h && $('pane-' + h) && (h !== 'system' || isSuper)) showPane(h);

    // ---- profile
    const name = s.name || 'Admin';
    $('pfName').textContent = name; $('pfEmail').textContent = s.email || '';
    $('pfAvatar').textContent = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    const prev = s.previous_login || {};
    $('pfKv').innerHTML = [
        ['Role', isSuper ? 'Super Admin' : 'Admin'], ['Phone', s.phone || '—'],
        ['Member since', s.created_at ? LKUI.fmtDateTime(s.created_at) : '—'],
        ['Previous sign-in', prev.at ? `${LKUI.fmtDateTime(prev.at)} (${LKUI.timeAgo(prev.at)})` : 'This is your first sign-in'],
        ['Previous device', prev.device || '—'], ['Previous IP address', prev.ip || '—'],
        ['Total sign-ins', s.login_count != null ? s.login_count : '—']
    ].map(([k, v]) => `<dt>${E(k)}</dt><dd>${E(v)}</dd>`).join('');

    // ---- password
    const score = (p) => { let n = 0; if (p.length >= 8) n++; if (p.length >= 12) n++; if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++; if (/\d/.test(p)) n++; if (/[^A-Za-z0-9]/.test(p)) n++; return n; };
    $('pwdNew').addEventListener('input', () => { const n = score($('pwdNew').value); $('pwdBar').style.width = (n / 5 * 100) + '%'; $('pwdBar').style.background = n <= 2 ? 'var(--danger)' : n <= 3 ? '#E2A238' : 'var(--lk-green-dark)'; });
    const bad = (id, msg) => { const el = $(id); el.classList.add('is-invalid'); el.parentNode.querySelector('.invalid-feedback').textContent = msg; };
    $('pwdForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        ['pwdCur', 'pwdNew', 'pwdConf'].forEach(i => $(i).classList.remove('is-invalid'));
        const cur = $('pwdCur').value, nw = $('pwdNew').value, cf = $('pwdConf').value; let ok = true;
        if (!cur) { bad('pwdCur', 'Enter your current password'); ok = false; }
        if (nw.length < 8) { bad('pwdNew', 'Use at least 8 characters'); ok = false; }
        else if (nw === cur) { bad('pwdNew', 'Choose a password different from the current one'); ok = false; }
        if (cf !== nw) { bad('pwdConf', 'Passwords do not match'); ok = false; }
        if (!ok) return;
        const btn = $('pwdBtn'); btn.disabled = true; const o = btn.innerHTML; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Updating…';
        try {
            const r = await API.auth.changePassword(cur, nw, cf);
            if (!r.success) throw r;
            LKUI.toast('Password updated. Use it the next time you sign in.', 'success'); $('pwdForm').reset(); $('pwdBar').style.width = 0;
        } catch (err) { bad('pwdCur', (err && err.message) || 'Could not update password'); }
        finally { btn.disabled = false; btn.innerHTML = o; }
    });

    // ---- access
    const MOD = { tenants: 'Tenants', guests: 'Guests', bills: 'Bills & payments', pgs: 'PGs', maintenance: 'Maintenance', documents: 'Documents', feedbacks: 'Feedback', activity_logs: 'Activity & audit', conversations: 'Conversations', ads: 'Ads', about_livinkey: 'Website control', archive: 'Archive' };
    if (isSuper) $('accessBody').innerHTML = '<div class="todo-ok"><i class="bi bi-shield-check fs-5"></i>As a Super Admin you have full access to every module, including Admins and System health.</div>';
    else {
        const p = s.permissions || {}; const yn = (v) => v ? '<i class="bi bi-check-circle-fill text-brand"></i>' : '<i class="bi bi-dash text-muted-soft"></i>';
        $('accessBody').innerHTML = `<div class="table-responsive"><table class="data-table access-grid"><thead><tr><th>Module</th><th>View</th><th>Add</th><th>Edit</th><th>Delete</th></tr></thead><tbody>${
            Object.keys(MOD).map(k => `<tr><td data-label="Module">${E(MOD[k])}</td><td data-label="View">${yn(p[k]?.view)}</td><td data-label="Add">${yn(p[k]?.add)}</td><td data-label="Edit">${yn(p[k]?.edit)}</td><td data-label="Delete">${yn(p[k]?.delete)}</td></tr>`).join('')}</tbody></table></div>`;
    }

    // ---- preferences
    $('prefAuto').value = LKUI.ls.get('lk_pref_autorefresh', '0');
    $('prefRows').value = LKUI.ls.get('lk_pref_pagesize', '25');
    $('prefCollapse').checked = LKUI.ls.get('lk_sidebar_collapsed') === '1';
    $('prefAuto').addEventListener('change', () => { LKUI.ls.set('lk_pref_autorefresh', $('prefAuto').value); LKUI.refreshState.setAuto(Number($('prefAuto').value)); LKUI.toast('Preference saved', 'success'); });
    $('prefRows').addEventListener('change', () => { LKUI.ls.set('lk_pref_pagesize', $('prefRows').value); LKUI.toast('Preference saved. Applies to tables on their next load.', 'success'); });
    $('prefCollapse').addEventListener('change', () => { const c = $('prefCollapse').checked; LKUI.ls.set('lk_sidebar_collapsed', c ? '1' : '0'); document.body.classList.toggle('sidebar-collapsed', c && window.matchMedia('(min-width:992px)').matches); });
    $('prefResetCols').addEventListener('click', () => { Object.keys(localStorage).filter(k => /^lk_tbl_.*_hidden$/.test(k)).forEach(k => localStorage.removeItem(k)); LKUI.toast('Table columns reset', 'success'); });

    // ---- system health
    const dur = (sec) => { const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60); return (d ? d + 'd ' : '') + (h ? h + 'h ' : '') + m + 'm'; };
    async function loadHealth() {
        if (!isSuper) return;
        $('sysBody').innerHTML = '<div class="sk sk-block"></div>';
        try {
            const r = await API.admins.systemHealth(); if (!r.success) throw r; const d = r.data;
            $('sysChecked').textContent = 'Checked ' + LKUI.fmtDateTime(d.checked_at);
            const card = (ok, icon, t, sub) => `<div class="hc"><div class="hc-ico ${ok === true ? 'ok' : ok === false ? 'bad' : 'off'}"><i class="bi ${icon}"></i></div><div><div class="hc-t">${E(t)}</div><div class="hc-d">${E(sub)}</div></div></div>`;
            const tables = Object.entries(d.database.tables).map(([k, v]) => `<dt>${E(k.replace(/_/g, ' '))}</dt><dd>${v == null ? '—' : Number(v).toLocaleString('en-IN')} rows</dd>`).join('');
            $('sysBody').innerHTML = `
              <div class="health-grid mb-4">
                ${card(true, 'bi-hdd-network', 'API server online', `Up ${dur(d.server.uptime_seconds)} · Node ${d.server.node_version}`)}
                ${card(d.database.connected, 'bi-database', d.database.connected ? 'Database connected' : 'Database unreachable', d.database.connected ? `${d.database.latency_ms} ms · MySQL ${d.database.version}` : 'Check DB credentials')}
                ${card(d.server.memory_mb.rss < 800, 'bi-memory', 'Memory in use', `${d.server.memory_mb.rss} MB total · ${d.server.memory_mb.heap_used} MB heap`)}
                ${d.integrations.map(i => card(i.configured ? true : null, i.configured ? 'bi-check2-circle' : 'bi-dash-circle', i.label, i.configured ? i.detail : 'Not configured')).join('')}
              </div>
              <div class="row g-4"><div class="col-lg-6"><h6 class="mb-2">Database records</h6><dl class="kv">${tables}</dl></div>
              <div class="col-lg-6"><h6 class="mb-2">Scheduled jobs</h6><dl class="kv">${d.schedules.map(j => `<dt>${E(j.time)}</dt><dd>${E(j.job)}</dd>`).join('')}</dl>
              <p class="small text-muted-soft mt-2 mb-0">Last recorded admin activity: ${d.last_activity_at ? E(LKUI.timeAgo(d.last_activity_at)) : 'none'}</p></div></div>`;
        } catch (e) { $('sysBody').innerHTML = `<div class="alert alert-danger mb-0">${E((e && e.message) || 'Could not read system health. Is the backend updated to the new version?')}</div>`; }
    }
    $('sysReload').addEventListener('click', loadHealth);
    LKUI.onRefresh(() => { if ($('pane-system').classList.contains('active')) return loadHealth(); });
});
