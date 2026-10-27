// Website control — manages the public site's content flags through /site-settings/website.
document.addEventListener('DOMContentLoaded', () => {
    renderLayout('website', 'Website control', 'Manage what visitors see on the public website');
    const E = LKUI.esc, $ = (id) => document.getElementById(id);
    const canEdit = Permissions.canEdit('about_livinkey');
    const TEXT = ['site_name', 'site_tagline', 'contact_phone', 'contact_whatsapp', 'contact_email', 'contact_address', 'social_instagram', 'social_facebook', 'announcement_text', 'announcement_link', 'announcement_type', 'maintenance_message'];
    const BOOL = ['announcement_enabled', 'maintenance_mode', 'show_chatbot', 'show_reviews', 'show_stats'];
    let saved = {};

    // pane navigation (deep-linkable: website.html#maintenance)
    function showPane(p) {
        document.querySelectorAll('.settings-pane').forEach(x => x.classList.toggle('active', x.id === 'pane-' + p));
        document.querySelectorAll('#wsNav button').forEach(b => b.classList.toggle('active', b.dataset.pane === p));
        history.replaceState(null, '', '#' + p);
        document.getElementById('saveBar').style.display = p === 'more' ? 'none' : '';
    }
    document.querySelectorAll('#wsNav button').forEach(b => b.addEventListener('click', () => showPane(b.dataset.pane)));
    const h = location.hash.slice(1); if (h && document.getElementById('pane-' + h)) showPane(h);

    const read = () => { const o = {}; TEXT.forEach(k => o[k] = $(k).value.trim()); BOOL.forEach(k => o[k] = $(k).checked); return o; };
    const write = (o) => { TEXT.forEach(k => $(k).value = o[k] ?? ''); BOOL.forEach(k => $(k).checked = !!o[k]); };
    const dirty = () => { const c = read(); return Object.keys(c).some(k => c[k] !== saved[k]); };

    function refreshUI() {
        const c = read();
        $('announceCount').textContent = c.announcement_text.length;
        $('announceState').textContent = c.announcement_enabled ? 'Visible' : 'Hidden';
        $('maintState').textContent = c.maintenance_mode ? 'On — site is hidden' : 'Off';
        $('spAnnounce').innerHTML = c.announcement_enabled && c.announcement_text ? `<div class="sp-announce ${E(c.announcement_type)}">${E(c.announcement_text)}</div>` : '<div class="sp-announce info" style="opacity:.45">Banner hidden</div>';
        $('spName').textContent = c.site_name || 'Livinkey'; $('spTag').textContent = c.site_tagline;
        $('spMaintName').textContent = c.site_name || 'Livinkey'; $('spMaint').textContent = c.maintenance_message;
        const d = dirty(); $('saveBar').classList.toggle('is-dirty', d); $('saveBtn').disabled = !d || !canEdit;
        // top banner reflects the SAVED state
        const live = !saved.maintenance_mode;
        const st = $('siteState'); st.className = 'state-banner mb-3 ' + (live ? 'live' : 'down');
        $('siteStateText').textContent = live ? 'The public website is live.' : 'The public website is in maintenance mode. Visitors see your message.';
    }

    document.getElementById('wsForm').addEventListener('input', refreshUI);
    document.getElementById('wsForm').addEventListener('change', refreshUI);
    $('discardBtn').addEventListener('click', () => { write(saved); document.querySelectorAll('.is-invalid').forEach(x => x.classList.remove('is-invalid')); refreshUI(); });

    window.addEventListener('beforeunload', (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });

    document.getElementById('wsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!canEdit) return LKUI.toast('You do not have permission to edit the website.', 'warning');
        const c = read();
        document.querySelectorAll('.is-invalid').forEach(x => x.classList.remove('is-invalid'));
        if (c.announcement_enabled && !c.announcement_text) { showPane('announce'); $('announcement_text').classList.add('is-invalid'); return LKUI.toast('Write a message for the banner, or turn it off.', 'warning'); }
        if (c.maintenance_mode && !(await LKUI.confirm({ title: 'Turn on maintenance mode?', body: 'The public website will show a maintenance screen to every visitor until you switch it off.', confirmText: 'Turn on', tone: 'warn' }))) return;
        if (c.maintenance_mode === saved.maintenance_mode && !c.maintenance_mode) { /* no confirmation needed when staying off */ }
        const patch = {}; Object.keys(c).forEach(k => { if (c[k] !== saved[k]) patch[k] = c[k]; });
        const btn = $('saveBtn'); btn.disabled = true; const orig = btn.innerHTML; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving…';
        try {
            const res = await API.siteSettings.updateWebsite(patch);
            if (!res.success) throw res;
            saved = { ...saved, ...res.data.settings }; write(saved);
            $('savedInfo').textContent = 'Saved just now'; LKUI.toast('Website settings saved. Changes appear within a minute.', 'success');
        } catch (err) {
            const errs = (err && (err.data && err.data.errors || err.errors)) || {};
            Object.keys(errs).forEach(k => { const el = $(k); if (el) { el.classList.add('is-invalid'); const f = el.parentNode.querySelector('.invalid-feedback'); if (f) f.textContent = errs[k]; } });
            if (Object.keys(errs).length) { const first = Object.keys(errs)[0]; const pane = $(first).closest('.settings-pane'); if (pane) showPane(pane.id.replace('pane-', '')); }
            LKUI.toast((err && err.message) || 'Could not save settings', 'danger');
        } finally { btn.innerHTML = orig; refreshUI(); }
    });

    async function load() {
        try {
            const res = await API.siteSettings.getWebsite();
            if (!res.success) throw res;
            saved = res.data.settings; write(saved);
            $('savedInfo').textContent = res.data.updated_at ? `Last saved ${LKUI.timeAgo(res.data.updated_at)}${res.data.updated_by ? ' by ' + res.data.updated_by : ''}` : 'No changes yet';
            if (!canEdit) { document.querySelectorAll('#wsForm input,#wsForm textarea,#wsForm select').forEach(x => x.disabled = true); $('discardBtn').disabled = true; }
            refreshUI();
        } catch (err) {
            const denied = err && err.status === 403;
            LKUI.toast(denied ? 'You do not have access to website settings.' : ((err && err.message) || 'Could not load settings'), 'danger');
            if (denied) document.querySelector('.settings-layout').innerHTML = '<div class="section-card w-100"><div class="empty-state"><i class="bi bi-shield-lock"></i><p class="fw-semibold mb-0">No access</p><p class="small">Ask a Super Admin for “About Livinkey” permission.</p></div></div>';
        }
    }
    LKUI.onRefresh(() => { if (dirty() && !confirm('Reloading will discard your unsaved changes. Continue?')) return; return load(); });
    load();
});
