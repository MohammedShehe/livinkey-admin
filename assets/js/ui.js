/* ==========================================================================
   Livinkey Admin — shared UI kit (LKUI)
   Load BEFORE api.js. No dependencies other than Bootstrap's modal/dropdown.

   LKUI.esc(str)                      HTML-escape (use for ALL server data in templates)
   LKUI.toast(msg, type)              success | info | warning | danger
   LKUI.confirm({...})  -> Promise<boolean>
   LKUI.prompt({...})   -> Promise<string|null>
   LKUI.runBatch(items, worker, opts) progress dialog for bulk operations
   LKUI.table(tableEl, opts)          sorting, pagination, column toggle, CSV,
                                      mobile cards and bulk selection for any .data-table
   LKUI.onRefresh(fn)                 register the page loader used by the top-bar Refresh
   LKUI.timeAgo(date) / LKUI.seen(date)
   ========================================================================== */
(function () {
    'use strict';

    const LS = {
        get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* private mode */ } },
        json(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (_) { return d; } }
    };

    // ------------------------------------------------------------ helpers
    const esc = (v) => String(v ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const debounce = (fn, ms = 250) => {
        let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
    };

    const parseDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) return isNaN(d) ? null : d;
        // MySQL "YYYY-MM-DD HH:mm:ss" (no timezone) -> treat as local-agnostic ISO
        const s = String(d).trim().replace(' ', 'T');
        const dt = new Date(s);
        return isNaN(dt) ? null : dt;
    };

    function timeAgo(d) {
        const dt = parseDate(d); if (!dt) return 'Never';
        const sec = Math.round((Date.now() - dt.getTime()) / 1000);
        if (sec < 0) return 'Just now';
        if (sec < 45) return 'Just now';
        const m = Math.round(sec / 60); if (m < 60) return m + ' min ago';
        const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
        const dd = Math.round(h / 24); if (dd < 30) return dd + (dd === 1 ? ' day ago' : ' days ago');
        const mo = Math.round(dd / 30); if (mo < 12) return mo + (mo === 1 ? ' month ago' : ' months ago');
        return Math.round(mo / 12) + ' yr ago';
    }

    function fmtDateTime(d) {
        const dt = parseDate(d); if (!dt) return '—';
        return dt.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    /** "Last seen" pill: green < 1 day, amber < 14 days, grey otherwise / never */
    function seen(d, opts = {}) {
        const dt = parseDate(d);
        if (!dt) return `<span class="seen"><span class="sd"></span><span class="text-muted-soft">${esc(opts.never || 'Never')}</span></span>`;
        const days = (Date.now() - dt.getTime()) / 86400000;
        const cls = days < 1 ? 'fresh' : days < 14 ? 'stale' : '';
        return `<span class="seen ${cls}" title="${esc(fmtDateTime(dt))}"><span class="sd"></span><span>${esc(timeAgo(dt))}</span></span>`;
    }

    // ------------------------------------------------------------ toast
    function toast(message, type = 'success', opts = {}) {
        const icons = { success: 'bi-check-circle-fill', info: 'bi-info-circle-fill', danger: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill' };
        if (!icons[type]) type = 'info';
        let host = document.getElementById('lkToastContainer');
        if (!host) {
            host = document.createElement('div');
            host.id = 'lkToastContainer';
            host.className = 'toast-lk';
            host.setAttribute('aria-live', 'polite');
            document.body.appendChild(host);
        }
        // collapse exact duplicates
        const dupKey = type + '|' + message;
        const existing = [...host.children].find(n => n.dataset.k === dupKey);
        if (existing) { existing.classList.remove('leaving'); existing.style.animation = 'none'; void existing.offsetWidth; existing.style.animation = ''; clearTimeout(existing._t); existing._t = setTimeout(() => kill(existing), opts.duration || 4000); return; }
        const el = document.createElement('div');
        el.className = 't-' + type + ' lk-toast';
        el.dataset.k = dupKey;
        el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
        // Existing callers pass HTML-free strings; escape unless explicitly trusted.
        el.innerHTML = `<i class="bi ${icons[type]}"></i><div class="tt">${opts.html ? message : esc(message)}</div><button class="tx" aria-label="Dismiss"><i class="bi bi-x-lg"></i></button>`;
        el.querySelector('.tx').addEventListener('click', () => kill(el));
        host.appendChild(el);
        while (host.children.length > 4) kill(host.firstElementChild, true);
        el._t = setTimeout(() => kill(el), opts.duration || (type === 'danger' ? 6000 : 4000));
        function kill(n, now) {
            if (!n || !n.parentNode) return;
            clearTimeout(n._t);
            if (now) return n.remove();
            n.classList.add('leaving'); setTimeout(() => n.remove(), 200);
        }
    }

    // ------------------------------------------------------------ dialogs
    function makeModal(html, cls = '') {
        const wrap = document.createElement('div');
        wrap.className = 'modal fade lk-dialog ' + cls;
        wrap.tabIndex = -1;
        wrap.innerHTML = `<div class="modal-dialog modal-dialog-centered" style="max-width:440px"><div class="modal-content">${html}</div></div>`;
        document.body.appendChild(wrap);
        const modal = new bootstrap.Modal(wrap, { backdrop: 'static', keyboard: true });
        wrap.addEventListener('hidden.bs.modal', () => { modal.dispose(); wrap.remove(); });
        return { wrap, modal };
    }

    function confirmDialog(o = {}) {
        const tone = o.tone || 'danger';
        const icon = o.icon || ({ danger: 'bi-trash3', warn: 'bi-exclamation-triangle', info: 'bi-info-circle', ok: 'bi-check2-circle' })[tone] || 'bi-question-circle';
        return new Promise((resolve) => {
            const { wrap, modal } = makeModal(`
                <div class="modal-body">
                    <div class="dlg-icon ${esc(tone)}"><i class="bi ${esc(icon)}"></i></div>
                    <h5>${esc(o.title || 'Are you sure?')}</h5>
                    <p>${o.html ? o.body : esc(o.body || 'This action cannot be undone.')}</p>
                    ${o.requireText ? `<div class="mt-3"><input class="form-control text-center" data-req placeholder="Type ${esc(o.requireText)} to confirm" autocomplete="off"></div>` : ''}
                </div>
                <div class="dlg-actions">
                    <button type="button" class="btn btn-outline-brand" data-act="no">${esc(o.cancelText || 'Cancel')}</button>
                    <button type="button" class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-brand'}" data-act="yes" ${o.requireText ? 'disabled' : ''}>${esc(o.confirmText || 'Confirm')}</button>
                </div>`);
            let answer = false;
            const yes = wrap.querySelector('[data-act=yes]');
            const req = wrap.querySelector('[data-req]');
            if (req) req.addEventListener('input', () => { yes.disabled = req.value.trim().toLowerCase() !== String(o.requireText).toLowerCase(); });
            yes.addEventListener('click', () => { answer = true; modal.hide(); });
            wrap.querySelector('[data-act=no]').addEventListener('click', () => modal.hide());
            wrap.addEventListener('hidden.bs.modal', () => resolve(answer));
            wrap.addEventListener('shown.bs.modal', () => (req || yes).focus());
            modal.show();
        });
    }

    function promptDialog(o = {}) {
        return new Promise((resolve) => {
            const { wrap, modal } = makeModal(`
                <div class="modal-body">
                    <div class="dlg-icon ${esc(o.tone || 'info')}"><i class="bi ${esc(o.icon || 'bi-pencil-square')}"></i></div>
                    <h5>${esc(o.title || 'Enter a value')}</h5>
                    ${o.body ? `<p class="mb-3">${esc(o.body)}</p>` : ''}
                    <div class="text-start">
                        ${o.label ? `<label class="form-label">${esc(o.label)}</label>` : ''}
                        ${o.multiline ? `<textarea class="form-control" rows="3" placeholder="${esc(o.placeholder || '')}">${esc(o.value || '')}</textarea>`
                                      : `<input class="form-control" type="${esc(o.type || 'text')}" placeholder="${esc(o.placeholder || '')}" value="${esc(o.value || '')}">`}
                        <div class="invalid-feedback">This field is required.</div>
                    </div>
                </div>
                <div class="dlg-actions">
                    <button type="button" class="btn btn-outline-brand" data-act="no">Cancel</button>
                    <button type="button" class="btn btn-brand" data-act="yes">${esc(o.confirmText || 'Save')}</button>
                </div>`);
            let result = null;
            const field = wrap.querySelector('.form-control');
            const submit = () => {
                const v = field.value.trim();
                if (o.required && !v) { field.classList.add('is-invalid'); field.focus(); return; }
                result = v; modal.hide();
            };
            wrap.querySelector('[data-act=yes]').addEventListener('click', submit);
            wrap.querySelector('[data-act=no]').addEventListener('click', () => modal.hide());
            field.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !o.multiline) { e.preventDefault(); submit(); } });
            field.addEventListener('input', () => field.classList.remove('is-invalid'));
            wrap.addEventListener('hidden.bs.modal', () => resolve(result));
            wrap.addEventListener('shown.bs.modal', () => field.focus());
            modal.show();
        });
    }

    /** Run an async worker over many items with a live progress dialog. */
    async function runBatch(items, worker, o = {}) {
        const concurrency = o.concurrency || 3;
        const { wrap, modal } = makeModal(`
            <div class="modal-body">
                <div class="dlg-icon info"><i class="bi bi-arrow-repeat"></i></div>
                <h5>${esc(o.title || 'Working…')}</h5>
                <p data-p>0 of ${items.length} done</p>
                <div class="dlg-progress"><span data-bar></span></div>
            </div>`);
        modal.show();
        await new Promise(r => wrap.addEventListener('shown.bs.modal', r, { once: true }));
        const failed = []; let done = 0, ok = 0, idx = 0;
        const bar = wrap.querySelector('[data-bar]'), label = wrap.querySelector('[data-p]');
        const tick = () => { label.textContent = `${done} of ${items.length} done`; bar.style.width = (done / items.length * 100) + '%'; };
        async function lane() {
            while (idx < items.length) {
                const item = items[idx++];
                try { const r = await worker(item); if (r && r.success === false) throw new Error(r.message || 'Failed'); ok++; }
                catch (e) { failed.push({ item, error: e && e.message ? e.message : 'Failed' }); }
                done++; tick();
            }
        }
        await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
        modal.hide();
        await new Promise(r => setTimeout(r, 250));
        return { ok, failed, total: items.length };
    }

    // ------------------------------------------------------------ refresh manager
    const Refresh = {
        fn: null, last: null, busy: false, timer: null,
        register(fn) { this.fn = fn; },
        async run(manual) {
            if (!this.fn || this.busy) return;
            this.busy = true; document.dispatchEvent(new CustomEvent('lk:refresh-start'));
            try { await this.fn({ manual: !!manual }); this.last = new Date(); }
            catch (e) { if (manual) toast((e && e.message) || 'Refresh failed', 'danger'); }
            finally { this.busy = false; document.dispatchEvent(new CustomEvent('lk:refresh-end', { detail: { at: this.last } })); }
        },
        setAuto(seconds) {
            clearInterval(this.timer); this.timer = null;
            if (!seconds || !this.fn) return;
            this.timer = setInterval(() => {
                if (document.hidden || document.querySelector('.modal.show') || !navigator.onLine) return;
                this.run(false);
            }, seconds * 1000);
        }
    };
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Refresh.fn && Refresh.last && Date.now() - Refresh.last.getTime() > 90000 && !document.querySelector('.modal.show')) Refresh.run(false);
    });

    // ------------------------------------------------------------ CSV
    function toCSV(rows) {
        return rows.map(r => r.map(c => {
            const s = String(c ?? '').replace(/\s+/g, ' ').trim();
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(',')).join('\r\n');
    }
    function downloadCSV(rows, filename) {
        const blob = new Blob(['\ufeff' + toCSV(rows)], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = filename || 'export.csv';
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }

    // ------------------------------------------------------------ bulk bar (singleton)
    let bulkBar = null;
    function getBulkBar() {
        if (bulkBar) return bulkBar;
        bulkBar = document.createElement('div');
        bulkBar.className = 'lk-bulkbar'; bulkBar.setAttribute('role', 'toolbar'); bulkBar.setAttribute('aria-label', 'Bulk actions');
        document.body.appendChild(bulkBar);
        return bulkBar;
    }

    // ------------------------------------------------------------ table kit
    /**
     * LKUI.table('#tenantsTable' | element, {
     *   key: 'tenants',                  // storage namespace
     *   noun: 'tenant',                  // for "3 tenants selected"
     *   pageSize: 25,                    // 0 disables client paging
     *   sort: true, columns: true, csv: 'tenants',
     *   skipCols: [..indexes],           // excluded from CSV / column menu (e.g. actions)
     *   bulk: { idOf: tr => tr.dataset.id, actions: [{label, icon, danger, run(ids, rows)}] }
     * })
     * Works on tables whose <tbody> is re-rendered by the page: every re-render is
     * re-enhanced automatically and the selection survives by row id.
     */
    function enhanceTable(target, o = {}) {
        const table = typeof target === 'string' ? document.querySelector(target) : target;
        if (!table || table._lk) return table && table._lk;
        const thead = table.tHead, tbody = table.tBodies[0];
        if (!thead || !tbody) return null;
        const key = 'lk_tbl_' + (o.key || table.id || 'table');
        const state = {
            sortCol: -1, sortDir: 'asc',
            page: 1, size: o.pageSize === undefined ? Number(LS.get('lk_pref_pagesize', 25)) : o.pageSize,
            hidden: new Set(LS.json(key + '_hidden', o.defaultHidden || [])),
            selected: new Set(), lastIdx: null, busy: false
        };
        const bulk = o.bulk || null;
        const noun = o.noun || 'item';
        table.classList.add('lk-stack');

        // --- header prep
        const headRow = thead.rows[thead.rows.length - 1];
        const ths = () => [...headRow.cells].filter(c => !c.classList.contains('col-check'));
        if (bulk && !headRow.querySelector('.col-check')) {
            const th = document.createElement('th'); th.className = 'col-check';
            th.innerHTML = '<input type="checkbox" aria-label="Select all rows on this page">';
            headRow.insertBefore(th, headRow.firstChild);
        }
        const headCheck = headRow.querySelector('.col-check input');

        ths().forEach((th, i) => {
            if (o.sort !== false && th.textContent.trim() && !th.classList.contains('no-sort') && !(o.skipCols || []).includes(i)) {
                th.classList.add('sortable'); th.tabIndex = 0; th.setAttribute('role', 'button');
                const go = () => {
                    if (state.sortCol === i) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'; else { state.sortCol = i; state.sortDir = 'asc'; }
                    state.page = 1; apply();
                };
                th.addEventListener('click', go);
                th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
            }
        });

        // --- toolbar + pager
        const resp = table.closest('.table-responsive') || table;
        const toolbar = document.createElement('div');
        toolbar.className = 'lk-toolbar';
        const colMenuId = 'colmenu_' + Math.random().toString(36).slice(2, 7);
        toolbar.innerHTML = `
            <div class="tb-left"><span class="text-muted-soft small" data-count></span></div>
            <div class="tb-right">
                ${o.columns !== false ? `<div class="dropdown"><button class="btn btn-outline-brand btn-sm" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false"><i class="bi bi-layout-three-columns"></i> Columns</button><div class="dropdown-menu dropdown-menu-end lk-colmenu" id="${colMenuId}"></div></div>` : ''}
                ${o.csv ? `<button class="btn btn-outline-brand btn-sm" data-csv><i class="bi bi-filetype-csv"></i> Export</button>` : ''}
            </div>`;
        resp.parentNode.insertBefore(toolbar, resp);
        const pager = document.createElement('div');
        pager.className = 'lk-pager'; resp.parentNode.insertBefore(pager, resp.nextSibling);

        // --- helpers
        const dataRows = () => [...tbody.rows].filter(r => !(r.cells.length === 1 && r.cells[0].colSpan > 1) && !r.classList.contains('sk-row'));
        const dataCells = (r) => [...r.cells].filter(c => !c.classList.contains('col-check'));
        const rowId = (tr) => bulk ? String(bulk.idOf ? bulk.idOf(tr) : tr.dataset.id) : null;
        const cellText = (c) => (c ? c.textContent.replace(/\s+/g, ' ').trim() : '');

        function stamp(rows) {
            const labels = ths().map(t => t.textContent.trim());
            rows.forEach(r => dataCells(r).forEach((c, i) => { if (!c.hasAttribute('data-label')) c.setAttribute('data-label', labels[i] || ''); }));
        }
        function injectChecks(rows) {
            if (!bulk) return;
            rows.forEach(r => {
                if (r.querySelector(':scope > .col-check')) return;
                const id = rowId(r); if (id == null || id === 'undefined') return;
                const td = document.createElement('td'); td.className = 'col-check';
                td.innerHTML = `<input type="checkbox" aria-label="Select row" data-id="${esc(id)}">`;
                r.insertBefore(td, r.firstChild);
            });
            rows.forEach(r => {
                const cb = r.querySelector(':scope > .col-check input'); if (!cb) return;
                cb.checked = state.selected.has(cb.dataset.id); r.classList.toggle('is-selected', cb.checked);
            });
        }
        function sortRows(rows) {
            if (state.sortCol < 0) return rows;
            const i = state.sortCol, dir = state.sortDir === 'asc' ? 1 : -1;
            const num = (s) => { const m = String(s).replace(/[, ]/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
            const val = (r) => cellText(dataCells(r)[i]);
            return rows.map((r, n) => ({ r, n, v: val(r) })).sort((a, b) => {
                const isMoney = (v) => /^[₹$]?\s?-?[\d,]+(\.\d+)?$/.test(v);
                const isDate = (v) => /^(\d{1,2}[\s\/-][A-Za-z]{3,9}[\s,\/-]*\d{4}|\d{4}-\d{2}-\d{2})/.test(v);
                let c;
                if (isMoney(a.v) && isMoney(b.v)) c = num(a.v) - num(b.v);
                else if (isDate(a.v) && isDate(b.v)) c = Date.parse(a.v) - Date.parse(b.v);
                else c = a.v.localeCompare(b.v, undefined, { numeric: true, sensitivity: 'base' });
                return (c || a.n - b.n) * dir;
            }).map(x => x.r);
        }
        function applyColumns() {
            const cols = ths();
            const apply = (row, getter) => { const cells = getter(row); cols.forEach((_, i) => { if (cells[i]) cells[i].style.display = state.hidden.has(i) ? 'none' : ''; }); };
            apply(headRow, r => [...r.cells].filter(c => !c.classList.contains('col-check')));
            dataRows().forEach(r => apply(r, dataCells));
        }
        function paint() {
            const rows = sortRows(dataRows());
            const size = state.size;
            const pages = size ? Math.max(1, Math.ceil(rows.length / size)) : 1;
            if (state.page > pages) state.page = pages;
            const start = size ? (state.page - 1) * size : 0, end = size ? start + size : rows.length;
            const frag = document.createDocumentFragment();
            rows.forEach((r, n) => { r.hidden = !(n >= start && n < end); frag.appendChild(r); });
            // keep non-data rows (empty/loader) in place, data rows ordered
            const other = [...tbody.rows].filter(r => !rows.includes(r));
            tbody.appendChild(frag); other.forEach(r => tbody.appendChild(r));
            ths().forEach((th, i) => { if (th.classList.contains('sortable')) { if (i === state.sortCol) th.dataset.dir = state.sortDir; else delete th.dataset.dir; } });
            toolbar.querySelector('[data-count]').textContent = rows.length ? `${rows.length} ${noun}${rows.length === 1 ? '' : 's'}` : '';
            // pager (hidden when there is nothing to choose between)
            pager.innerHTML = rows.length > 10 ? sizeSelect(rows.length, start, Math.min(end, rows.length), pages) : '';
            pager.style.display = rows.length ? '' : 'none';
            toolbar.style.display = (rows.length || o.alwaysToolbar) ? '' : 'none';
            syncSelectionUI();
        }
        function sizeSelect(total, start, end, pages) {
            const opts = [10, 25, 50, 100, 0].map(n => `<option value="${n}" ${n === state.size ? 'selected' : ''}>${n ? n : 'All'}</option>`).join('');
            return `<div class="d-flex align-items-center gap-2"><span>Rows</span><select class="form-select form-select-sm" data-size aria-label="Rows per page">${opts}</select>
                <span>${total ? (start + 1) + '–' + end + ' of ' + total : '0'}</span></div>
                <div class="pg-btns">${state.size && pages > 1 ? `
                    <button class="btn-icon" data-pg="prev" ${state.page <= 1 ? 'disabled' : ''} aria-label="Previous page"><i class="bi bi-chevron-left"></i></button>
                    <span class="small">Page ${state.page} / ${pages}</span>
                    <button class="btn-icon" data-pg="next" ${state.page >= pages ? 'disabled' : ''} aria-label="Next page"><i class="bi bi-chevron-right"></i></button>` : ''}</div>`;
        }
        function buildColMenu() {
            const menu = document.getElementById(colMenuId); if (!menu) return;
            menu.innerHTML = ths().map((th, i) => (o.skipCols || []).includes(i) || !th.textContent.trim() ? '' :
                `<label><input type="checkbox" data-col="${i}" ${state.hidden.has(i) ? '' : 'checked'}> ${esc(th.textContent.trim())}</label>`).join('')
                + `<div class="dropdown-divider"></div><button class="btn btn-link btn-sm w-100" data-colreset>Show all columns</button>`;
        }

        // --- selection
        function ids() { return [...state.selected]; }
        function visibleCheckboxes() { return dataRows().filter(r => !r.hidden).map(r => r.querySelector(':scope > .col-check input')).filter(Boolean); }
        function syncSelectionUI() {
            if (!bulk) return;
            const vis = visibleCheckboxes();
            const n = vis.filter(c => c.checked).length;
            if (headCheck) { headCheck.checked = vis.length > 0 && n === vis.length; headCheck.indeterminate = n > 0 && n < vis.length; }
            const bar = getBulkBar();
            const count = state.selected.size;
            if (bar._owner !== table && !count) return;
            bar._owner = count ? table : null;
            bar.classList.toggle('show', count > 0);
            if (!count) return;
            const acts = (bulk.actions || []).filter(a => a.visible === undefined || (typeof a.visible === 'function' ? a.visible() : a.visible));
            bar.innerHTML = `<span class="bb-count"><b>${count}</b> ${esc(noun)}${count === 1 ? '' : 's'} selected</span>
                ${acts.map((a, i) => `<button class="btn btn-bb ${a.danger ? 'danger' : ''}" data-ba="${i}"><i class="bi ${esc(a.icon || 'bi-check2')}"></i> ${esc(a.label)}</button>`).join('')}
                <button class="bb-clear" data-clear>Clear</button>`;
            bar.onclick = async (e) => {
                if (e.target.closest('[data-clear]')) { clearSelection(); return; }
                const b = e.target.closest('[data-ba]'); if (!b) return;
                const a = acts[+b.dataset.ba];
                const rows = dataRows().filter(r => state.selected.has(rowId(r)));
                const done = await a.run(ids(), rows);
                if (done !== false) clearSelection();
            };
        }
        function clearSelection() { state.selected.clear(); dataRows().forEach(r => { const cb = r.querySelector(':scope > .col-check input'); if (cb) cb.checked = false; r.classList.remove('is-selected'); }); syncSelectionUI(); }

        tbody.addEventListener('click', (e) => {
            const cb = e.target.closest('.col-check input'); if (!cb) return;
            const rows = dataRows().filter(r => !r.hidden); const tr = cb.closest('tr'); const idx = rows.indexOf(tr);
            if (e.shiftKey && state.lastIdx !== null && idx >= 0) {
                const [a, b] = [Math.min(idx, state.lastIdx), Math.max(idx, state.lastIdx)];
                rows.slice(a, b + 1).forEach(r => { const c = r.querySelector(':scope > .col-check input'); if (c) { c.checked = cb.checked; toggle(c); } });
            } else toggle(cb);
            state.lastIdx = idx; syncSelectionUI();
        });
        function toggle(cb) { const id = cb.dataset.id; if (cb.checked) state.selected.add(id); else state.selected.delete(id); cb.closest('tr').classList.toggle('is-selected', cb.checked); }
        if (headCheck) headCheck.addEventListener('change', () => {
            visibleCheckboxes().forEach(c => { c.checked = headCheck.checked; toggle(c); }); syncSelectionUI();
        });

        // --- toolbar & pager events
        toolbar.addEventListener('change', (e) => {
            const c = e.target.closest('[data-col]'); if (!c) return;
            const i = +c.dataset.col; c.checked ? state.hidden.delete(i) : state.hidden.add(i);
            LS.set(key + '_hidden', JSON.stringify([...state.hidden])); applyColumns();
        });
        toolbar.addEventListener('click', (e) => {
            if (e.target.closest('[data-colreset]')) { state.hidden.clear(); LS.set(key + '_hidden', '[]'); buildColMenu(); applyColumns(); return; }
            if (e.target.closest('[data-csv]')) exportCSV();
        });
        pager.addEventListener('click', (e) => {
            const b = e.target.closest('[data-pg]'); if (!b || b.disabled) return;
            state.page += b.dataset.pg === 'next' ? 1 : -1; paint();
            resp.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        pager.addEventListener('change', (e) => {
            const s = e.target.closest('[data-size]'); if (!s) return;
            state.size = Number(s.value); state.page = 1; LS.set('lk_pref_pagesize', String(state.size)); paint();
        });

        function exportCSV() {
            const skip = new Set(o.skipCols || []);
            const cols = ths().map((t, i) => ({ i, name: t.textContent.trim() })).filter(c => c.name && !skip.has(c.i) && !state.hidden.has(c.i));
            const rows = sortRows(dataRows());
            const sel = state.selected.size ? rows.filter(r => state.selected.has(rowId(r))) : rows;
            const out = [cols.map(c => c.name)].concat(sel.map(r => { const cells = dataCells(r); return cols.map(c => cellText(cells[c.i])); }));
            const stamp = new Date().toISOString().slice(0, 10);
            downloadCSV(out, `${o.csv === true ? (o.key || 'export') : o.csv}-${stamp}.csv`);
            toast(`Exported ${sel.length} ${noun}${sel.length === 1 ? '' : 's'}${state.selected.size ? ' (selected)' : ''}`, 'success');
        }

        // --- orchestrate (re-run on every re-render of the page)
        function apply() {
            if (state.busy) return; state.busy = true; mo.disconnect();
            try { const rows = dataRows(); stamp(rows); injectChecks(rows); applyColumns(); paint(); }
            finally { state.busy = false; mo.observe(tbody, { childList: true }); }
        }
        const mo = new MutationObserver(() => requestAnimationFrame(apply));
        buildColMenu(); apply();
        const api = { refresh: apply, clearSelection, selected: ids, state };
        table._lk = api; return api;
    }

    // ------------------------------------------------------------ connectivity
    function setOnline(on) {
        document.body.classList.toggle('is-offline', !on);
        if (!on) toast('You are offline. Changes will not be saved until the connection returns.', 'warning', { duration: 6000 });
        else if (document.body.dataset.wasOffline) toast('Back online', 'success');
        document.body.dataset.wasOffline = on ? '' : '1';
        document.querySelectorAll('.conn-dot').forEach(d => d.classList.toggle('off', !on));
        document.querySelectorAll('.conn-text').forEach(t => { t.textContent = on ? 'Connected' : 'Offline'; });
    }
    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));

    // ------------------------------------------------------------ keyboard
    document.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        const typing = ['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable;
        if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) {
            const s = document.querySelector('.table-search input, input[type=search], #tenantSearch, [id$=Search]');
            if (s) { e.preventDefault(); s.focus(); s.select && s.select(); }
        }
    });

    // ------------------------------------------------------------ theme (light / dark / system)
    const Theme = {
        pref() { return LS.get('lk_theme', 'system'); },
        effective() { const p = this.pref(); return p === 'system' ? (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : p; },
        apply() {
            const t = this.effective(), r = document.documentElement;
            r.setAttribute('data-theme', t); r.setAttribute('data-bs-theme', t);
            document.querySelectorAll('.theme-toggle').forEach(b => { b.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; b.setAttribute('aria-label', b.title); });
            document.dispatchEvent(new CustomEvent('lk:theme', { detail: t }));
        },
        set(p) { LS.set('lk_theme', p); this.apply(); },
        toggle() { this.set(this.effective() === 'dark' ? 'light' : 'dark'); }
    };
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (Theme.pref() === 'system') Theme.apply(); });

    window.LKUI = {
        theme: Theme,
        esc, debounce, parseDate, timeAgo, fmtDateTime, seen,
        toast, confirm: confirmDialog, prompt: promptDialog, runBatch,
        table: enhanceTable, downloadCSV, ls: LS,
        onRefresh: (fn) => Refresh.register(fn), refresh: (m) => Refresh.run(m), refreshState: Refresh,
        setOnline
    };
    window.esc = window.esc || esc;
})();
