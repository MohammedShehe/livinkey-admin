// Bill creation: electricity amount from meter readings using the PG's formula.
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);
    const E = (v) => LKUI.esc(v);
    const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    let tariffs = null, timer = null, seq = 0, lastCalc = null;

    const mode = () => (document.querySelector('input[name="elecMode"]:checked') || {}).value || 'manual';
    const pgId = () => $('billCreatePg') ? $('billCreatePg').value : '';
    const roomId = () => $('billCreateRoom') ? $('billCreateRoom').value : '';
    const tariffFor = (id) => (tariffs || []).find(t => String(t.pg_id) === String(id));

    function applyMode() {
        const auto = mode() === 'auto';
        $('elecAutoPanel').classList.toggle('d-none', !auto);
        $('billElectricity').readOnly = auto;
        if (!auto) { $('elecNote').textContent = ''; lastCalc = null; }
        else recalc();
    }

    async function loadTariffs() {
        if (tariffs) return;
        try { tariffs = (await API.electricity.settings()).data; } catch (_) { tariffs = []; }
    }

    async function onSelectionChange() {
        if (!$('elecBox')) return;
        await loadTariffs();
        const t = tariffFor(pgId());
        const ready = !!(t && t.configured && t.is_active);
        $('elecModeAuto').disabled = !ready;
        if (!pgId()) { $('elecNote').textContent = 'Choose a PG to use its electricity formula.'; }
        else if (!ready) {
            document.getElementById('elecModeManual').checked = true; applyMode();
            $('elecNote').textContent = 'No electricity formula is set for this PG yet. A Super Admin can set it from PGs → ⚡ button. You can still type the amount.';
        } else if (mode() === 'manual') {
            $('elecNote').textContent = 'Tip: switch to “From meter readings” and just enter the readings.';
        }
        if (ready && roomId()) {
            try {
                const r = (await API.electricity.lastReading({ room_id: roomId() })).data;
                if (r) { $('elecPrev').value = r.reading; $('elecPrevHint').textContent = `From ${r.billing_month || 'last'} bill`; }
                else { $('elecPrevHint').textContent = 'No earlier reading – enter it.'; }
            } catch (_) { /* optional */ }
        }
        if (mode() === 'auto') recalc();
    }

    function recalc() {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const prev = $('elecPrev').value, cur = $('elecCurr').value;
            if (prev === '' || cur === '') { $('elecResult').innerHTML = '<span class="text-muted-soft">Enter both readings to see the bill.</span>'; lastCalc = null; return; }
            const my = ++seq;
            try {
                const r = (await API.electricity.calculate({ pg_id: pgId(), room_id: roomId(), previous_reading: prev, current_reading: cur })).data;
                if (my !== seq) return;
                lastCalc = r;
                $('billElectricity').value = r.total;
                $('billElectricity').dispatchEvent(new Event('input', { bubbles: true }));
                $('elecResult').innerHTML = `<div>${r.units} units used${r.multiplier !== 1 ? ` (×${r.multiplier})` : ''}</div>` +
                    r.lines.map(l => `<div class="d-flex justify-content-between"><span>${E(l.label)}: ${l.units} × ₹${l.rate}</span><span>${inr(l.amount)}</span></div>`).join('') +
                    (r.fixed_charge ? `<div class="d-flex justify-content-between"><span>Fixed charge</span><span>${inr(r.fixed_charge)}</span></div>` : '') +
                    (r.min_charge_applied ? '<div class="text-muted-soft">Minimum bill applied</div>' : '') +
                    (r.tax ? `<div class="d-flex justify-content-between"><span>Tax ${r.tax_percent}%</span><span>${inr(r.tax)}</span></div>` : '') +
                    `<div class="d-flex justify-content-between fw-bold border-top pt-1 mt-1"><span>Electricity bill</span><span>${inr(r.total)}</span></div>`;
            } catch (e) {
                if (my !== seq) return;
                lastCalc = null; $('elecResult').innerHTML = `<span class="text-danger">${E(e.message || 'Could not calculate')}</span>`;
            }
        }, 300);
    }

    window.LKElec = {
        payload() {
            if (mode() !== 'auto') return {};
            if (!lastCalc) throw new Error('Enter valid previous and current meter readings, or switch to “Enter amount”.');
            return { previous_reading: $('elecPrev').value, current_reading: $('elecCurr').value };
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!$('elecBox')) return;
        document.querySelectorAll('input[name="elecMode"]').forEach(r => r.addEventListener('change', applyMode));
        ['elecPrev', 'elecCurr'].forEach(id => $(id).addEventListener('input', recalc));
        ['billCreatePg', 'billCreateRoom'].forEach(id => $(id) && $(id).addEventListener('change', onSelectionChange));
        const modal = $('createBillModal') || document.querySelector('[id*="reateBill"][class*="modal"]');
        if (modal) modal.addEventListener('shown.bs.modal', onSelectionChange);
        applyMode();
    });
})();
