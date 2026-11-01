// PG extras: Offers manager + Electricity formula editor (opened from each PG card).
(function () {
    'use strict';
    const E = LKUI.esc;
    const isSuper = (Auth.getSession() || {}).role === 'super_admin';
    const canEdit = () => Permissions.hasPermission('pgs', 'edit');
    const $ = (id) => document.getElementById(id);
    const mk = (id, html) => { let el = $(id); if (el) el.remove(); el = document.createElement('div'); el.className = 'modal fade'; el.id = id; el.tabIndex = -1; el.innerHTML = html; document.body.appendChild(el); return new bootstrap.Modal(el); };
    const fmtD = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const pgName = (id) => { const c = document.querySelector(`[onclick*="viewPgDetail('${id}')"] .fw-bold`); return c ? c.textContent : 'PG'; };

    // =============================== OFFERS ===============================
    let offPg = null, offModal = null, offers = [], editingOffer = null;

    window.openOffers = async function (pgId) {
        offPg = pgId;
        offModal = mk('offersModal', `
          <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"><div class="modal-content">
            <div class="modal-header"><div><h5 class="modal-title mb-0"><i class="bi bi-megaphone me-2"></i>Offers · ${E(pgName(pgId))}</h5>
              <div class="small text-muted-soft">Live offers appear on this PG in the public website and the guest app.</div></div>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
              <div id="offList"></div>
              <div id="offForm" class="d-none"></div>
            </div>
            <div class="modal-footer" id="offFoot"><button class="btn btn-ghost" data-bs-dismiss="modal">Close</button>${canEdit() ? '<button class="btn btn-brand" id="offNew"><i class="bi bi-plus-lg"></i> New offer</button>' : ''}</div>
          </div></div>`);
        offModal.show();
        if (canEdit()) $('offNew').onclick = () => showOfferForm(null);
        await loadOffers();
    };

    async function loadOffers() {
        $('offList').innerHTML = '<div class="text-center text-muted-soft py-4">Loading…</div>';
        try { offers = (await API.offers.listForPg(offPg)).data; renderOffers(); }
        catch (e) { $('offList').innerHTML = `<div class="alert alert-danger">${E(e.message || 'Could not load offers')}</div>`; }
    }

    function renderOffers() {
        $('offForm').classList.add('d-none'); $('offList').classList.remove('d-none'); $('offFoot').classList.remove('d-none');
        if (!offers.length) { $('offList').innerHTML = '<div class="empty-state py-4"><i class="bi bi-gift"></i><p class="fw-semibold mb-1">No offers yet</p><p class="mb-0">Create one and switch it on to show it to visitors and guests.</p></div>'; return; }
        $('offList').innerHTML = `<div class="d-flex flex-column gap-2">${offers.map(o => {
            const state = !o.is_active ? '<span class="chip chip-gray">Off</span>' : o.is_live ? '<span class="chip chip-green dot">Live</span>' : (o.valid_from && o.valid_from > new Date().toISOString().slice(0, 10) ? '<span class="chip chip-amber">Scheduled</span>' : '<span class="chip chip-red">Expired</span>');
            return `<div class="offer-card ${o.is_active ? '' : 'off'}">
              <span class="offer-badge">${E(o.headline)}</span>
              <div class="flex-grow-1 min-w-0"><div class="fw-semibold">${E(o.title)} ${state}</div>
                <div class="small text-muted-soft">${E([o.coupon_code && 'Code ' + o.coupon_code, o.valid_from && 'from ' + fmtD(o.valid_from), o.valid_until && 'till ' + fmtD(o.valid_until)].filter(Boolean).join(' · ') || 'No end date')}</div></div>
              ${canEdit() ? `<div class="form-check form-switch m-0" title="Turn on / off"><input class="form-check-input" type="checkbox" role="switch" data-tg="${o.id}" ${o.is_active ? 'checked' : ''}></div>
              <button class="btn btn-sm btn-ghost" data-ed="${o.id}" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-ghost text-danger" data-dl="${o.id}" title="Delete"><i class="bi bi-trash3"></i></button>` : ''}
            </div>`; }).join('')}</div>`;
        $('offList').querySelectorAll('[data-tg]').forEach(i => i.onchange = async () => {
            try { const r = await API.offers.toggle(offPg, i.dataset.tg, i.checked); LKUI.toast(r.message, 'success'); await loadOffers(); }
            catch (e) { LKUI.toast(e.message || 'Could not change offer', 'danger'); i.checked = !i.checked; }
        });
        $('offList').querySelectorAll('[data-ed]').forEach(b => b.onclick = () => showOfferForm(offers.find(o => String(o.id) === b.dataset.ed)));
        $('offList').querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => {
            const o = offers.find(x => String(x.id) === b.dataset.dl);
            if (!await LKUI.confirm({ title: 'Delete this offer?', body: `“${o.title}” will disappear from the website and app.`, confirmText: 'Delete' })) return;
            try { await API.offers.remove(offPg, o.id); LKUI.toast('Offer deleted', 'success'); await loadOffers(); } catch (e) { LKUI.toast(e.message, 'danger'); }
        });
    }

    function showOfferForm(o) {
        editingOffer = o;
        $('offList').classList.add('d-none'); $('offFoot').classList.add('d-none');
        const f = $('offForm'); f.classList.remove('d-none');
        f.innerHTML = `<h6 class="mb-3">${o ? 'Edit offer' : 'New offer'}</h6><div class="row g-3">
          <div class="col-12"><label class="form-label">Offer title <span class="text-danger">*</span></label><input class="form-control" id="ofTitle" maxlength="150" placeholder="e.g. Early-bird: first month 10% off" value="${E(o ? o.title : '')}"></div>
          <div class="col-md-4"><label class="form-label">Type</label><select class="form-select" id="ofType">
            <option value="percent">Percentage off</option><option value="flat">Flat amount off</option><option value="free">Free perk (e.g. free Wi-Fi)</option><option value="custom">Custom text</option></select></div>
          <div class="col-md-4" id="ofValWrap"><label class="form-label" id="ofValLbl">Discount</label><input type="number" class="form-control" id="ofVal" min="0" step="0.01" value="${o && o.offer_value != null ? o.offer_value : ''}"></div>
          <div class="col-md-4"><label class="form-label">Badge text <span class="text-muted-soft small">(optional)</span></label><input class="form-control" id="ofBadge" maxlength="40" placeholder="Auto: 10% OFF" value="${E(o ? o.badge_text : '')}"></div>
          <div class="col-12"><label class="form-label">Details</label><textarea class="form-control" id="ofDesc" rows="2" maxlength="1000" placeholder="What does the visitor get?">${E(o ? o.description : '')}</textarea></div>
          <div class="col-md-4"><label class="form-label">Coupon code</label><input class="form-control" id="ofCode" maxlength="40" style="text-transform:uppercase" value="${E(o ? o.coupon_code : '')}"></div>
          <div class="col-md-4"><label class="form-label">Starts on</label><input type="date" class="form-control" id="ofFrom" value="${E(o ? o.valid_from || '' : '')}"></div>
          <div class="col-md-4"><label class="form-label">Ends on</label><input type="date" class="form-control" id="ofTo" value="${E(o ? o.valid_until || '' : '')}"></div>
          <div class="col-12"><label class="form-label">Terms &amp; conditions</label><textarea class="form-control" id="ofTerms" rows="2" maxlength="1000">${E(o ? o.terms : '')}</textarea></div>
          <div class="col-md-6"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="ofActive" ${!o || o.is_active ? 'checked' : ''}><label class="form-check-label" for="ofActive">Switch this offer on</label></div></div>
          ${o ? '' : '<div class="col-md-6"><div class="form-check"><input class="form-check-input" type="checkbox" id="ofNotify" checked><label class="form-check-label" for="ofNotify">Notify guests on their phones</label></div></div>'}
        </div>
        <div class="alert alert-danger py-2 mt-3 mb-0 d-none" id="ofErr"></div>
        <div class="d-flex justify-content-end gap-2 mt-3"><button class="btn btn-ghost" id="ofCancel">Back</button><button class="btn btn-brand" id="ofSave"><i class="bi bi-check2"></i> Save offer</button></div>`;
        $('ofType').value = o ? o.offer_type : 'percent';
        const sync = () => { const t = $('ofType').value; $('ofValWrap').style.display = (t === 'percent' || t === 'flat') ? '' : 'none'; $('ofValLbl').textContent = t === 'percent' ? 'Discount (%)' : 'Discount (₹)'; };
        $('ofType').onchange = sync; sync();
        $('ofCancel').onclick = renderOffers;
        $('ofSave').onclick = async () => {
            const err = (m) => { $('ofErr').textContent = m; $('ofErr').classList.remove('d-none'); };
            const d = { title: $('ofTitle').value.trim(), offer_type: $('ofType').value, offer_value: $('ofVal').value, badge_text: $('ofBadge').value.trim(), description: $('ofDesc').value.trim(),
                coupon_code: $('ofCode').value.trim(), valid_from: $('ofFrom').value, valid_until: $('ofTo').value, terms: $('ofTerms').value.trim(), is_active: $('ofActive').checked };
            if (!o) d.notify_guests = $('ofNotify').checked;
            if (!d.title) return err('Please give the offer a title.');
            if ((d.offer_type === 'percent' || d.offer_type === 'flat') && !(Number(d.offer_value) > 0)) return err('Enter a discount value greater than 0.');
            if (d.valid_from && d.valid_until && d.valid_until < d.valid_from) return err('The end date cannot be before the start date.');
            $('ofSave').disabled = true;
            try { const r = o ? await API.offers.update(offPg, o.id, d) : await API.offers.create(offPg, d); LKUI.toast(r.message, 'success'); await loadOffers(); }
            catch (e) { err(e.message || 'Could not save'); $('ofSave').disabled = false; }
        };
    }

    // ============================ ELECTRICITY =============================
    const calc = (s, prev, cur) => {
        const units = Math.round((cur - prev) * (s.multiplier || 1) * 100) / 100, lines = [];
        let energy = 0;
        if (s.billing_mode === 'slab') { let from = 0, left = units; for (const sl of s.slabs) { if (left <= 0) break; const cap = sl.upto == null ? Infinity : sl.upto - from; const used = Math.min(left, cap); if (used > 0) { lines.push([`${from}–${sl.upto == null ? 'above' : sl.upto} units`, used, sl.rate, used * sl.rate]); energy += used * sl.rate; } left -= used; if (sl.upto != null) from = sl.upto; } }
        else { energy = units * s.rate_per_unit; lines.push(['Energy charge', units, s.rate_per_unit, energy]); }
        let sub = energy + (s.fixed_charge || 0), minHit = false; if (s.min_charge > 0 && sub < s.min_charge) { sub = s.min_charge; minHit = true; }
        const tax = sub * (s.tax_percent || 0) / 100; let total = sub + tax; if (s.round_to_rupee) total = Math.round(total);
        return { units, lines, energy, fixed: s.fixed_charge || 0, minHit, sub, tax, total };
    };

    window.openElectricity = async function (pgId) {
        if (!isSuper) return LKUI.toast('Only a Super Admin can change electricity formulas.', 'warning');
        let all; try { all = (await API.electricity.settings()).data; } catch (e) { return LKUI.toast(e.message || 'Could not load', 'danger'); }
        const cur = all.find(x => String(x.pg_id) === String(pgId));
        let slabs = (cur.slabs && cur.slabs.length ? cur.slabs : [{ upto: 100, rate: 6 }, { upto: null, rate: 8 }]).map(s => ({ ...s }));
        const m = mk('elecModal', `<div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"><div class="modal-content">
          <div class="modal-header"><div><h5 class="modal-title mb-0"><i class="bi bi-lightning-charge me-2"></i>Electricity formula · ${E(cur.pg_name)}</h5>
            <div class="small text-muted-soft">Set once. Billing staff then only enter the previous and current meter readings.</div></div><button class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body"><div class="row g-3">
            <div class="col-md-6"><label class="form-label">How is it charged?</label><select class="form-select" id="elMode"><option value="flat">One rate for every unit</option><option value="slab">Slabs (rate changes as usage grows)</option></select></div>
            <div class="col-md-6" id="elRateWrap"><label class="form-label">Cost per unit (₹)</label><input type="number" class="form-control" id="elRate" min="0" step="0.01" value="${cur.rate_per_unit || ''}"></div>
            <div class="col-12 d-none" id="elSlabWrap"><label class="form-label">Slabs</label><div id="elSlabs"></div><button class="btn btn-sm btn-ghost mt-2" id="elAddSlab" type="button"><i class="bi bi-plus"></i> Add slab</button></div>
            <div class="col-md-3 col-6"><label class="form-label">Fixed charge (₹)</label><input type="number" class="form-control" id="elFixed" min="0" step="0.01" value="${cur.fixed_charge || 0}"></div>
            <div class="col-md-3 col-6"><label class="form-label">Minimum bill (₹)</label><input type="number" class="form-control" id="elMin" min="0" step="0.01" value="${cur.min_charge || 0}"></div>
            <div class="col-md-3 col-6"><label class="form-label">Meter multiplier</label><input type="number" class="form-control" id="elMul" min="0.001" step="0.001" value="${cur.multiplier || 1}"></div>
            <div class="col-md-3 col-6"><label class="form-label">Tax / duty (%)</label><input type="number" class="form-control" id="elTax" min="0" max="100" step="0.01" value="${cur.tax_percent || 0}"></div>
            <div class="col-md-6"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="elRound" ${cur.round_to_rupee ? 'checked' : ''}><label class="form-check-label" for="elRound">Round the bill to a whole rupee</label></div></div>
            <div class="col-md-6"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="elActive" ${cur.is_active ? 'checked' : ''}><label class="form-check-label" for="elActive">Use this formula when creating bills</label></div></div>
            <div class="col-12"><div class="p-3 rounded-3" style="background:var(--lk-green-50);border:1px solid var(--border)">
              <div class="fw-semibold mb-2"><i class="bi bi-calculator me-1"></i>Try it</div>
              <div class="row g-2"><div class="col-6"><input type="number" class="form-control" id="elPrev" placeholder="Previous reading" value="1000"></div><div class="col-6"><input type="number" class="form-control" id="elCurr" placeholder="Current reading" value="1150"></div></div>
              <div id="elPreview" class="mt-2 small"></div></div></div>
          </div><div class="alert alert-danger py-2 mt-3 mb-0 d-none" id="elErr"></div></div>
          <div class="modal-footer justify-content-between"><button class="btn btn-ghost" id="elCopy" ${all.length < 2 ? 'hidden' : ''}><i class="bi bi-copy"></i> Copy to other PGs…</button>
            <div class="d-flex gap-2"><button class="btn btn-ghost" data-bs-dismiss="modal">Cancel</button><button class="btn btn-brand" id="elSave"><i class="bi bi-check2"></i> Save formula</button></div></div>
        </div></div>`);
        m.show(); $('elMode').value = cur.billing_mode;
        const read = () => ({ billing_mode: $('elMode').value, rate_per_unit: Number($('elRate').value) || 0, slabs: slabs.map(s => ({ upto: s.upto === '' || s.upto == null ? null : Number(s.upto), rate: Number(s.rate) || 0 })),
            fixed_charge: Number($('elFixed').value) || 0, min_charge: Number($('elMin').value) || 0, multiplier: Number($('elMul').value) || 1, tax_percent: Number($('elTax').value) || 0, round_to_rupee: $('elRound').checked ? 1 : 0, is_active: $('elActive').checked ? 1 : 0 });
        const drawSlabs = () => {
            $('elSlabs').innerHTML = slabs.map((s, i) => { const last = i === slabs.length - 1; return `<div class="row g-2 align-items-center mb-2">
              <div class="col-5">${last ? '<input class="form-control" value="and above" disabled>' : `<div class="input-group"><span class="input-group-text">up to</span><input type="number" class="form-control" data-su="${i}" value="${s.upto ?? ''}" min="1"><span class="input-group-text">units</span></div>`}</div>
              <div class="col-5"><div class="input-group"><span class="input-group-text">₹</span><input type="number" class="form-control" data-sr="${i}" value="${s.rate ?? ''}" min="0" step="0.01"><span class="input-group-text">/unit</span></div></div>
              <div class="col-2">${slabs.length > 1 ? `<button class="btn btn-sm btn-ghost text-danger" data-sd="${i}" type="button"><i class="bi bi-x-lg"></i></button>` : ''}</div></div>`; }).join('');
            $('elSlabs').querySelectorAll('[data-su]').forEach(i => i.oninput = () => { slabs[i.dataset.su].upto = i.value; preview(); });
            $('elSlabs').querySelectorAll('[data-sr]').forEach(i => i.oninput = () => { slabs[i.dataset.sr].rate = i.value; preview(); });
            $('elSlabs').querySelectorAll('[data-sd]').forEach(b => b.onclick = () => { slabs.splice(b.dataset.sd, 1); slabs[slabs.length - 1].upto = null; drawSlabs(); preview(); });
        };
        const preview = () => {
            const s = read(), p = Number($('elPrev').value), c = Number($('elCurr').value);
            if (!(c >= p)) return $('elPreview').innerHTML = '<span class="text-danger">Current reading must be higher than the previous one.</span>';
            const r = calc(s, p, c);
            $('elPreview').innerHTML = `<div>${r.units} units${s.multiplier !== 1 ? ` (after ×${s.multiplier})` : ''}</div>` + r.lines.map(l => `<div class="d-flex justify-content-between"><span>${E(l[0])}: ${l[1]} × ₹${l[2]}</span><span>${inr(l[3])}</span></div>`).join('') +
              (r.fixed ? `<div class="d-flex justify-content-between"><span>Fixed charge</span><span>${inr(r.fixed)}</span></div>` : '') + (r.minHit ? `<div class="text-muted-soft">Minimum bill applied</div>` : '') + (r.tax ? `<div class="d-flex justify-content-between"><span>Tax ${s.tax_percent}%</span><span>${inr(r.tax)}</span></div>` : '') +
              `<div class="d-flex justify-content-between fw-bold border-top pt-1 mt-1"><span>Electricity bill</span><span>${inr(r.total)}</span></div>`;
        };
        const mode = () => { const sl = $('elMode').value === 'slab'; $('elSlabWrap').classList.toggle('d-none', !sl); $('elRateWrap').classList.toggle('d-none', sl); if (sl) drawSlabs(); preview(); };
        $('elMode').onchange = mode; $('elAddSlab').onclick = () => { slabs[slabs.length - 1].upto = (Number(slabs[slabs.length - 2]?.upto || 0) + 100) || 100; slabs.push({ upto: null, rate: '' }); drawSlabs(); preview(); };
        ['elRate', 'elFixed', 'elMin', 'elMul', 'elTax', 'elRound', 'elPrev', 'elCurr'].forEach(id => $(id).addEventListener('input', preview)); mode();
        $('elSave').onclick = async () => {
            const b = $('elSave'); b.disabled = true;
            try { const r = await API.electricity.save(pgId, read()); LKUI.toast(r.message, 'success'); m.hide(); }
            catch (e) { $('elErr').textContent = e.message || 'Could not save'; $('elErr').classList.remove('d-none'); } finally { b.disabled = false; }
        };
        $('elCopy').onclick = async () => {
            const others = all.filter(x => String(x.pg_id) !== String(pgId));
            const pick = await LKUI.prompt({ title: 'Copy this formula to…', body: 'Type the PG numbers separated by commas, or "all".\n' + others.map(o => `${o.pg_id} = ${o.pg_name}`).join('\n'), placeholder: 'all' });
            if (!pick) return;
            const ids = /^all$/i.test(pick.trim()) ? others.map(o => o.pg_id) : pick.split(',').map(x => Number(x.trim())).filter(Boolean);
            try { await API.electricity.save(pgId, read()); const r = await API.electricity.copy(pgId, ids); LKUI.toast(r.message, 'success'); m.hide(); } catch (e) { LKUI.toast(e.message || 'Could not copy', 'danger'); }
        };
    };
})();
