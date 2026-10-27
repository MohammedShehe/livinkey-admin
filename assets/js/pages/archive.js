document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderLayout === 'function') {
        renderLayout('archive', 'Tenant Archive', 'Checked-out & archived tenants');
    }
    const page = document.getElementById('pageContent');
    if (page) page.style.display = '';

    const canView = typeof Permissions !== 'undefined' && (Permissions.canView('archive') || Permissions.canView('tenants'));
    const canEdit = typeof Permissions !== 'undefined' && (Permissions.canEdit('archive') || Permissions.canEdit('tenants'));
    const canDelete = typeof Permissions !== 'undefined' && (Permissions.canDelete('archive') || Permissions.canDelete('tenants'));

    if (!canView) {
        document.getElementById('archiveTableBody').innerHTML =
            '<tr><td colspan="8" class="text-center text-danger py-4">You do not have permission to view the archive.</td></tr>';
        return;
    }

    let rows = [];
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));

    // Year options
    const yearSel = document.getElementById('filterYear');
    const thisYear = new Date().getFullYear();
    for (let y = thisYear; y >= thisYear - 10; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        yearSel.appendChild(opt);
    }

    function fmtDate(d) {
        if (!d) return '—';
        try {
            const x = new Date(d);
            if (isNaN(x.getTime())) return String(d).slice(0, 10);
            return x.toISOString().slice(0, 10);
        } catch { return '—'; }
    }

    function selectedIds() {
        return Array.from(document.querySelectorAll('.row-check:checked')).map(el => el.value);
    }

    function updateBulkButtons() {
        const ids = selectedIds();
        document.getElementById('btnRestoreSelected').disabled = !canEdit || !ids.length;
        document.getElementById('btnPermDeleteSelected').disabled = !canDelete || !ids.length;
    }

    async function loadStats() {
        try {
            const res = await API.tenants.archiveStats();
            if (res.success && res.data) {
                document.getElementById('statCheckedOut').textContent = res.data.checked_out_count ?? 0;
                document.getElementById('statArchived').textContent = res.data.archived_count ?? 0;
                document.getElementById('statAll').textContent = res.data.all_count ?? 0;
            }
        } catch (e) {
            console.warn(e);
        }
    }

    async function loadList() {
        const tbody = document.getElementById('archiveTableBody');
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Loading…</td></tr>';
        const params = {
            search: document.getElementById('filterSearch').value.trim() || undefined,
            status: document.getElementById('filterStatus').value || undefined,
            gender: document.getElementById('filterGender').value || undefined,
            residency: document.getElementById('filterResidency').value || undefined,
            year: document.getElementById('filterYear').value || undefined,
            month: document.getElementById('filterMonth').value || undefined
        };
        try {
            const res = await API.tenants.archiveList(params);
            rows = (res.success && res.data) ? res.data : [];
            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No archived or checked-out tenants found.</td></tr>';
                return;
            }
            tbody.innerHTML = rows.map(t => {
                const statusChip = t.status === 'checked_out'
                    ? '<span class="chip chip-warning">Checked out</span>'
                    : '<span class="chip chip-gray">Archived</span>';
                const endDate = t.status === 'checked_out' ? fmtDate(t.checkout_date) : fmtDate(t.archived_at);
                return `<tr class="archive-row" data-id="${t.id}" style="cursor:pointer;" title="Click to view full details">
                    <td><input type="checkbox" class="row-check" value="${t.id}"></td>
                    <td>
                        <div class="fw-semibold">${escapeHtml(t.full_name || '—')}</div>
                        <div class="small text-muted">${escapeHtml(t.email || '')}</div>
                        <div class="small text-muted">${escapeHtml((t.country_code || '') + ' ' + (t.phone || ''))}</div>
                    </td>
                    <td>
                        <div>${escapeHtml(t.pg_name || '—')}</div>
                        <div class="small text-muted">Room ${escapeHtml(t.room_number || '—')}</div>
                    </td>
                    <td>${fmtDate(t.arrival_date)}</td>
                    <td>${endDate}</td>
                    <td>${statusChip}</td>
                    <td class="small">${escapeHtml(t.archive_reason || '—')}</td>
                    <td class="text-end text-nowrap">
                        <button class="btn-icon me-1" title="View details" data-action="view" data-id="${t.id}"><i class="bi bi-eye"></i></button>
                        ${canEdit ? `<button class="btn-icon me-1" title="Restore" data-action="restore" data-id="${t.id}"><i class="bi bi-arrow-counterclockwise"></i></button>` : ''}
                        ${canDelete ? `<button class="btn-icon" title="Permanent delete" data-action="perm" data-id="${t.id}"><i class="bi bi-trash3"></i></button>` : ''}
                    </td>
                </tr>`;
            }).join('');
            tbody.querySelectorAll('.row-check').forEach(el => el.addEventListener('change', updateBulkButtons));
            tbody.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const action = btn.getAttribute('data-action');
                    if (action === 'view') openArchiveDetail(id);
                    else if (action === 'restore') confirmRestore([id]);
                    else confirmPermDelete([id]);
                });
            });
            tbody.querySelectorAll('tr.archive-row').forEach(tr => {
                tr.addEventListener('click', (e) => {
                    if (e.target.closest('input, button, a')) return;
                    openArchiveDetail(tr.dataset.id);
                });
            });
            updateBulkButtons();
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">${escapeHtml(e.message || 'Failed to load')}</td></tr>`;
        }
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    async function openArchiveDetail(id) {
        let modalEl = document.getElementById('archiveDetailModal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'archiveDetailModal';
            modalEl.className = 'modal fade';
            modalEl.tabIndex = -1;
            modalEl.innerHTML = `
              <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Tenant details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                  </div>
                  <div class="modal-body" id="archiveDetailBody">
                    <div class="text-center text-muted py-4">Loading…</div>
                  </div>
                </div>
              </div>`;
            document.body.appendChild(modalEl);
        }
        const body = document.getElementById('archiveDetailBody');
        body.innerHTML = '<div class="text-center text-muted py-4">Loading…</div>';
        bootstrap.Modal.getOrCreateInstance(modalEl).show();

        try {
            const [tenantRes, docsRes] = await Promise.all([
                API.tenants.getById(id),
                API.documents.admin.getByTenant(id).catch(() => ({ success: false, data: [] }))
            ]);
            if (!tenantRes.success || !tenantRes.data) {
                body.innerHTML = `<div class="text-danger">${escapeHtml(tenantRes.message || 'Failed to load tenant')}</div>`;
                return;
            }
            const t = tenantRes.data;
            let docs = [];
            if (docsRes.success) {
                if (Array.isArray(docsRes.data)) docs = docsRes.data;
                else if (docsRes.data?.uploaded_documents) docs = docsRes.data.uploaded_documents;
                else if (docsRes.data?.documents) docs = docsRes.data.documents;
            }

            const field = (label, val) =>
                `<div class="col-md-4 mb-2"><div class="small text-muted">${label}</div><div class="fw-semibold">${escapeHtml(val == null || val === '' ? '—' : String(val))}</div></div>`;

            let html = `
              <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                <div>
                  <div class="fs-5 fw-bold">${escapeHtml(t.full_name || '—')}</div>
                  <div class="text-muted small">${escapeHtml(t.email || '')} · ${escapeHtml((t.country_code || '') + ' ' + (t.phone || ''))}</div>
                </div>
                <div>
                  <span class="chip ${t.status === 'checked_out' ? 'chip-warning' : 'chip-gray'}">${escapeHtml(t.status || 'inactive')}</span>
                </div>
              </div>
              <div class="row g-2 mb-3">
                ${field('PG', t.pg_name)}
                ${field('Room', t.room_number)}
                ${field('Gender', t.gender)}
                ${field('Nationality', t.nationality)}
                ${field('Residency', t.residency)}
                ${field('Rent', t.rent != null ? '₹' + t.rent : null)}
                ${field('Security fee', t.security_fee != null ? '₹' + t.security_fee : null)}
                ${field('Arrival date', fmtDate(t.arrival_date))}
                ${field('Paid from', fmtDate(t.paid_from))}
                ${field('Paid till', fmtDate(t.paid_till))}
                ${field('Period of stay', t.period_of_stay)}
                ${field('Checkout / archived', fmtDate(t.checkout_date || t.archived_at))}
                ${field('Archive reason', t.archive_reason)}
              </div>
              <h6 class="mb-2">Documents (${docs.length})</h6>`;

            if (!docs.length) {
                html += `<div class="text-muted small">No documents on file.</div>`;
            } else {
                html += `<div class="table-responsive"><table class="table table-sm align-middle">
                  <thead><tr><th>Type</th><th>Uploaded</th><th class="text-end">Actions</th></tr></thead>
                  <tbody>${docs.map(d => `
                    <tr data-doc-id="${d.id}">
                      <td>${escapeHtml(d.document_type || 'document')}</td>
                      <td class="small">${fmtDate(d.created_at || d.upload_date)}</td>
                      <td class="text-end text-nowrap">
                        <button class="btn-icon me-1" title="Download" data-doc-action="dl" data-doc-id="${d.id}"><i class="bi bi-download"></i></button>
                        ${canDelete ? `<button class="btn-icon" title="Delete" data-doc-action="del" data-doc-id="${d.id}"><i class="bi bi-trash3"></i></button>` : ''}
                      </td>
                    </tr>`).join('')}</tbody></table></div>`;
            }
            body.innerHTML = html;

            body.querySelectorAll('[data-doc-action]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const docId = btn.getAttribute('data-doc-id');
                    const action = btn.getAttribute('data-doc-action');
                    if (action === 'dl') {
                        const token = (typeof Auth !== 'undefined' && Auth.getToken) ? Auth.getToken() : localStorage.getItem('token');
                        if (!token) { showToast('Please login to download', 'warning'); return; }
                        window.open(`${API_CONFIG.baseURL}/documents/admin/${docId}/download?token=${encodeURIComponent(token)}`, '_blank');
                    } else if (action === 'del') {
                        if (!confirm('Delete this document permanently?')) return;
                        try {
                            const res = await API.documents.admin.delete(docId);
                            if (res.success) {
                                showToast('Document deleted', 'success');
                                openArchiveDetail(id);
                            } else showToast(res.message || 'Delete failed', 'danger');
                        } catch (err) {
                            showToast(err.message || 'Delete failed', 'danger');
                        }
                    }
                });
            });
        } catch (e) {
            body.innerHTML = `<div class="text-danger">${escapeHtml(e.message || 'Failed to load')}</div>`;
        }
    }

    function confirmRestore(ids) {
        document.getElementById('confirmTitle').textContent = ids.length > 1
            ? `Restore ${ids.length} tenants?`
            : 'Restore this tenant?';
        document.getElementById('confirmBody').textContent =
            'They will return to active Tenants Management. Email/phone must not conflict with existing active tenants.';
        const btn = document.getElementById('confirmActionBtn');
        btn.textContent = 'Restore';
        btn.className = 'btn btn-brand px-4';
        btn.onclick = async function () {
            LOADER.show(btn, 'Restoring...');
            try {
                if (ids.length === 1) {
                    const res = await API.tenants.restore(ids[0]);
                    if (!res.success) throw new Error(res.message || 'Restore failed');
                } else {
                    const res = await API.tenants.restoreBulk(ids);
                    if (!res.success) throw new Error(res.message || 'Restore failed');
                    const failed = (res.results || []).filter(r => !r.success);
                    if (failed.length) {
                        showToast(`${failed.length} could not be restored (possible email/phone conflict).`, 'warning');
                    }
                }
                showToast('Restore completed.', 'success');
                confirmModal.hide();
                loadStats();
                loadList();
            } catch (e) {
                showToast(e.message || 'Restore failed', 'danger');
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    }

    function confirmPermDelete(ids) {
        document.getElementById('confirmTitle').textContent = ids.length > 1
            ? `Permanently delete ${ids.length} tenants?`
            : 'Permanently delete this tenant?';
        document.getElementById('confirmBody').textContent =
            'This removes the tenant, related details, and Cloudinary documents forever. This cannot be undone.';
        const btn = document.getElementById('confirmActionBtn');
        btn.textContent = 'Delete permanently';
        btn.className = 'btn btn-soft-danger px-4';
        btn.onclick = async function () {
            LOADER.show(btn, 'Deleting...');
            try {
                if (ids.length === 1) {
                    const res = await API.tenants.permanentDelete(ids[0]);
                    if (!res.success) throw new Error(res.message || 'Delete failed');
                } else {
                    const res = await API.tenants.permanentDeleteBulk(ids);
                    if (!res.success) throw new Error(res.message || 'Delete failed');
                }
                showToast('Permanent delete completed.', 'success');
                confirmModal.hide();
                loadStats();
                loadList();
            } catch (e) {
                showToast(e.message || 'Delete failed', 'danger');
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    }

    document.getElementById('selectAll').addEventListener('change', (e) => {
        document.querySelectorAll('.row-check').forEach(c => { c.checked = e.target.checked; });
        updateBulkButtons();
    });
    document.getElementById('btnApplyFilters').addEventListener('click', loadList);
    document.getElementById('filterSearch').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loadList();
    });
    document.getElementById('btnRestoreSelected').addEventListener('click', () => {
        const ids = selectedIds();
        if (ids.length) confirmRestore(ids);
    });
    document.getElementById('btnPermDeleteSelected').addEventListener('click', () => {
        const ids = selectedIds();
        if (ids.length) confirmPermDelete(ids);
    });

    LKUI.onRefresh(() => Promise.all([loadStats(), loadList()]));
    loadStats();
    loadList();
});
