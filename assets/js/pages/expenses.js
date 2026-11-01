// Expenses — record, filter and analyse what is paid to run each PG.
document.addEventListener('DOMContentLoaded', () => {
    renderLayout('expenses', 'Expenses', 'Track every rupee spent on your properties');
    const E = LKUI.esc, $ = (id) => document.getElementById(id);
    const { inr, compact } = LKCharts;
    const can = (a) => Permissions.hasPermission('expenses', a);
    if (!can('view')) {
        $('mainContent').innerHTML = '<div class="empty-state"><i class="bi bi-shield-lock"></i><p class="fw-semibold mb-1">No access</p><p class="mb-0">You do not have permission to view expenses.</p></div>';
        return;
    }
    $('addBtn').hidden = !can('add');
    $('exportBtn').hidden = !can('export') && !Permissions.hasPermission('expenses', 'view');

    let meta = { categories: [], pgs: [] };
    let page = 1, editing = null, lastRows = [];
    const catLabel = (k) => (meta.categories.find(c => c.key === k) || { label: k }).label;
    const catIcon = (k) => (meta.categories.find(c => c.key === k) || { icon: 'bi-tag' }).icon;
    const METHOD = { cash: 'Cash', upi: 'UPI', bank_transfer: 'Bank transfer', card: 'Card', cheque: 'Cheque', other: 'Other' };
    const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    function range() {
        const k = $('fPeriod').value, n = new Date();
        if (k === 'this_month') return { from: iso(new Date(n.getFullYear(), n.getMonth(), 1)), to: iso(n) };
        if (k === 'last_month') return { from: iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)), to: iso(new Date(n.getFullYear(), n.getMonth(), 0)) };
        if (k === 'last_3m') return { from: iso(new Date(n.getFullYear(), n.getMonth() - 2, 1)), to: iso(n) };
        if (k === 'this_year') return { from: iso(new Date(n.getFullYear(), 0, 1)), to: iso(n) };
        if (k === 'custom') return { from: $('fFrom').value || '', to: $('fTo').value || '' };
        return { from: '', to: '' };
    }
    const filters = () => ({ pg_id: $('fPg').value, category: $('fCat').value, q: $('fQ').value.trim(), ...range() });
    const periodLabel = () => $('fPeriod').selectedOptions[0].textContent.replace('…', '');

    // ---------- stats ----------
    function renderStats(s) {
        const sm = s.summary;
        const mom = sm.last_month > 0 ? Math.round((sm.this_month - sm.last_month) / sm.last_month * 100) : null;
        const net = sm.net;
        const k = (label, icon, ico, value, sub, cls = '') => `<div class="col-6 col-xl-3"><div class="kpi ${cls}"><div class="k-top"><span>${label}</span><span class="k-ico ${ico}"><i class="bi ${icon}"></i></span></div><div class="k-val">${value}</div><div class="k-sub">${sub}</div></div></div>`;
        $('kpiRow').innerHTML =
            k('Total spent', 'bi-wallet2', 'stat-icon-amber', inr(sm.total), `<b>${sm.count}</b> expense${sm.count === 1 ? '' : 's'} · ${E(periodLabel())}`) +
            k('This month', 'bi-calendar-month', 'stat-icon-blue', inr(sm.this_month),
                mom === null ? 'No spending last month' : `<b class="${mom > 0 ? 'delta-up' : 'delta-down'}">${mom > 0 ? '▲' : '▼'} ${Math.abs(mom)}%</b> vs last month (${compact(sm.last_month)})`) +
            k('Collected in period', 'bi-cash-stack', 'stat-icon-green', inr(sm.income), 'Rent and bills paid by tenants') +
            k(net >= 0 ? 'Net surplus' : 'Net deficit', net >= 0 ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow', net >= 0 ? 'stat-icon-green' : 'stat-icon-red', inr(Math.abs(net)),
                sm.expense_ratio === null ? 'No income recorded yet' : `Expenses are <b>${sm.expense_ratio}%</b> of income`, net < 0 ? 'bad' : '');

        // 12-month chart
        const months = []; const now = new Date();
        for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-IN', { month: 'short' }) }); }
        const m1 = {}, m2 = {}; s.trend.income.forEach(x => m1[x.month] = x.total); s.trend.expenses.forEach(x => m2[x.month] = x.total);
        $('trendBody').innerHTML = LKCharts.groupedBars(months.map(m => m.label), [
            { name: 'Collected', color: 'var(--lk-green)', values: months.map(m => m1[m.key] || 0) },
            { name: 'Expenses', color: '#E0864A', values: months.map(m => m2[m.key] || 0) }]);

        $('catBody').innerHTML = LKCharts.donut(s.by_category.map(c => ({ label: catLabel(c.category), value: c.total })), { centerLabel: 'spent' });
        $('pgBody').innerHTML = LKCharts.hbars(s.by_pg.map(p => ({ label: p.pg_name, value: p.total, sub: `${p.count} expense${p.count === 1 ? '' : 's'} · ${p.pct}% of spending` })));
        $('topBody').innerHTML = s.top_expenses.length ? `<ul class="feed">${s.top_expenses.map(t => `<li><span class="f-ico"><i class="bi ${E(catIcon(t.category))}"></i></span><div class="f-main"><b>${E(t.title)}</b><div class="cell-sub">${E(catLabel(t.category))} · ${E(t.pg_name || 'Shared')} · ${E(fmtDate(t.expense_date))}</div></div><b>${inr(t.amount)}</b></li>`).join('')}</ul>`
            : '<div class="empty-state py-4"><i class="bi bi-receipt"></i><p class="fw-semibold mb-0">No expenses yet</p></div>';
    }

    // ---------- list ----------
    function renderList(d) {
        lastRows = d.rows;
        $('listSub').textContent = `${d.total} record${d.total === 1 ? '' : 's'} · total ${inr(d.total_amount)}`;
        $('expBody').innerHTML = d.rows.length ? d.rows.map(r => `<tr>
            <td data-label="Date">${E(fmtDate(r.expense_date))}</td>
            <td data-label="Expense"><div class="fw-semibold">${E(r.title)}</div><div class="cell-sub">${E([r.paid_to, r.reference_no && 'Ref ' + r.reference_no].filter(Boolean).join(' · ') || '')}</div></td>
            <td data-label="Category"><span class="chip chip-gray"><i class="bi ${E(catIcon(r.category))}"></i> ${E(catLabel(r.category))}</span></td>
            <td data-label="PG">${E(r.pg_name || 'Shared')}</td>
            <td data-label="Paid by"><span class="cell-sub">${E(METHOD[r.payment_method] || r.payment_method)}</span></td>
            <td data-label="Amount" class="text-end fw-bold">${inr(r.amount)}</td>
            <td class="text-end text-nowrap">
              ${r.receipt_url ? `<a class="btn btn-sm btn-ghost" href="${E(r.receipt_url)}" target="_blank" rel="noopener" title="View receipt"><i class="bi bi-paperclip"></i></a>` : ''}
              ${can('edit') ? `<button class="btn btn-sm btn-ghost" data-edit="${r.id}" title="Edit"><i class="bi bi-pencil"></i></button>` : ''}
              ${can('delete') ? `<button class="btn btn-sm btn-ghost text-danger" data-del="${r.id}" title="Delete"><i class="bi bi-trash3"></i></button>` : ''}
            </td></tr>`).join('')
            : '<tr><td colspan="7"><div class="empty-state py-4"><i class="bi bi-receipt"></i><p class="fw-semibold mb-1">No expenses found</p><p class="mb-0">Change the filters or add your first expense.</p></div></td></tr>';
        const pages = Math.max(1, Math.ceil(d.total / d.limit));
        $('pager').innerHTML = `<span class="small text-muted-soft">Page ${d.page} of ${pages}</span><div class="btn-group"><button class="btn btn-sm btn-ghost" id="pPrev" ${d.page <= 1 ? 'disabled' : ''}>Previous</button><button class="btn btn-sm btn-ghost" id="pNext" ${d.page >= pages ? 'disabled' : ''}>Next</button></div>`;
        $('pPrev').onclick = () => { page--; loadList(); };
        $('pNext').onclick = () => { page++; loadList(); };
    }

    async function loadList() {
        try { const r = await API.expenses.list({ ...filters(), page, limit: 25, sort: $('fSort').value }); renderList(r.data); }
        catch (e) { LKUI.toast(e.message || 'Could not load expenses', 'danger'); }
    }
    async function loadStats() {
        try { renderStats((await API.expenses.stats(filters())).data); }
        catch (e) { LKUI.toast(e.message || 'Could not load statistics', 'danger'); }
    }
    const reload = () => { page = 1; loadStats(); loadList(); };

    // ---------- modal ----------
    const modal = new bootstrap.Modal($('expModal'));
    function openForm(row) {
        editing = row || null;
        $('expModalTitle').textContent = row ? 'Edit expense' : 'Add expense';
        $('eTitle').value = row ? row.title : ''; $('eAmount').value = row ? row.amount : '';
        $('eCat').value = row ? row.category : meta.categories[0].key;
        $('ePg').value = row && row.pg_id ? row.pg_id : ($('fPg').value && $('fPg').value !== 'none' ? $('fPg').value : '');
        $('eDate').value = row ? row.expense_date : iso(new Date()); $('eDate').max = iso(new Date());
        $('eMethod').value = row ? row.payment_method : 'cash';
        $('ePaidTo').value = row ? row.paid_to || '' : ''; $('eRef').value = row ? row.reference_no || '' : ''; $('eNotes').value = row ? row.notes || '' : '';
        $('eReceipt').value = ''; $('eRemove').checked = false;
        $('eRemoveWrap').classList.toggle('d-none', !(row && row.receipt_url));
        $('eReceiptHint').textContent = row && row.receipt_url ? 'A receipt is attached. Choose a file to replace it.' : 'JPG, PNG or PDF up to 5 MB.';
        $('eError').classList.add('d-none'); modal.show();
    }
    $('addBtn').onclick = () => openForm(null);
    $('eSave').onclick = async () => {
        const err = (m) => { $('eError').textContent = m; $('eError').classList.remove('d-none'); };
        const title = $('eTitle').value.trim(), amount = parseFloat($('eAmount').value);
        if (!title) return err('Please enter what this expense was for.');
        if (!(amount > 0)) return err('Enter an amount greater than 0.');
        if (!$('eDate').value) return err('Choose the date you paid this.');
        const f = $('eReceipt').files[0];
        if (f && f.size > 5 * 1024 * 1024) return err('The receipt is larger than 5 MB.');
        const fd = new FormData();
        fd.append('title', title); fd.append('amount', amount); fd.append('category', $('eCat').value); fd.append('pg_id', $('ePg').value);
        fd.append('expense_date', $('eDate').value); fd.append('payment_method', $('eMethod').value);
        fd.append('paid_to', $('ePaidTo').value); fd.append('reference_no', $('eRef').value); fd.append('notes', $('eNotes').value);
        if (f) fd.append('receipt', f); if ($('eRemove').checked) fd.append('remove_receipt', '1');
        const btn = $('eSave'); btn.disabled = true;
        try {
            const r = editing ? await API.expenses.update(editing.id, fd) : await API.expenses.create(fd);
            LKUI.toast(r.message || 'Saved', 'success'); modal.hide(); reload();
        } catch (e) { err(e.message || 'Could not save the expense.'); }
        finally { btn.disabled = false; }
    };

    $('expBody').addEventListener('click', async (ev) => {
        const ed = ev.target.closest('[data-edit]'), del = ev.target.closest('[data-del]');
        if (ed) openForm(lastRows.find(r => String(r.id) === ed.dataset.edit));
        if (del) {
            const row = lastRows.find(r => String(r.id) === del.dataset.del);
            const ok = await LKUI.confirm({ title: 'Delete this expense?', body: `“${row.title}” (${inr(row.amount)}) will be removed from your records and statistics.`, confirmText: 'Delete' });
            if (!ok) return;
            try { await API.expenses.remove(row.id); LKUI.toast('Expense deleted', 'success'); reload(); } catch (e) { LKUI.toast(e.message || 'Could not delete', 'danger'); }
        }
    });

    // ---------- CSV ----------
    $('exportBtn').onclick = async () => {
        try {
            const r = await API.expenses.list({ ...filters(), page: 1, limit: 1000, sort: 'date_desc' });
            const rows = r.data.rows; if (!rows.length) return LKUI.toast('Nothing to export for this selection', 'info');
            const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const csv = ['Date,Title,Category,PG,Paid using,Paid to,Reference,Amount,Notes'].concat(rows.map(x => [x.expense_date, x.title, catLabel(x.category), x.pg_name || 'Shared', METHOD[x.payment_method], x.paid_to, x.reference_no, x.amount, x.notes].map(q).join(','))).join('\n');
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `livinkey-expenses-${iso(new Date())}.csv`; a.click(); URL.revokeObjectURL(a.href);
        } catch (e) { LKUI.toast(e.message || 'Export failed', 'danger'); }
    };

    // ---------- init ----------
    ['fPg', 'fCat', 'fSort'].forEach(id => $(id).addEventListener('change', reload));
    $('fPeriod').addEventListener('change', () => { const c = $('fPeriod').value === 'custom'; $('customFrom').classList.toggle('d-none', !c); $('customTo').classList.toggle('d-none', !c); if (!c) reload(); });
    ['fFrom', 'fTo'].forEach(id => $(id).addEventListener('change', reload));
    $('fQ').addEventListener('input', LKUI.debounce ? LKUI.debounce(reload, 350) : reload);
    LKUI.onRefresh(reload);

    (async () => {
        try {
            meta = (await API.expenses.meta()).data;
            $('fPg').innerHTML = '<option value="">All PGs</option><option value="none">Shared / head office</option>' + meta.pgs.map(p => `<option value="${p.id}">${E(p.name)}</option>`).join('');
            $('ePg').innerHTML = '<option value="">Shared / head office</option>' + meta.pgs.map(p => `<option value="${p.id}">${E(p.name)}</option>`).join('');
            const opts = meta.categories.map(c => `<option value="${E(c.key)}">${E(c.label)}</option>`).join('');
            $('fCat').innerHTML = '<option value="">All categories</option>' + opts; $('eCat').innerHTML = opts;
            const p = new URLSearchParams(location.search); if (p.get('pg')) $('fPg').value = p.get('pg');
            if (p.get('new') && can('add')) openForm(null);
        } catch (e) { LKUI.toast(e.message || 'Could not load options', 'danger'); }
        reload();
    })();
});
