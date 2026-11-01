/* Tiny dependency-free chart helpers shared by Dashboard and Expenses (LKCharts). */
(function () {
    'use strict';
    const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    const compact = (n) => { n = Number(n || 0); const a = Math.abs(n); const s = n < 0 ? '-' : ''; if (a >= 1e7) return s + '₹' + (a / 1e7).toFixed(1) + 'Cr'; if (a >= 1e5) return s + '₹' + (a / 1e5).toFixed(1) + 'L'; if (a >= 1e3) return s + '₹' + (a / 1e3).toFixed(1) + 'k'; return s + '₹' + Math.round(a); };
    const PALETTE = ['#7FAE38', '#E0864A', '#4A8FE0', '#B06AD6', '#E0B84A', '#3FB6A8', '#D6546A', '#8A94A6', '#5C7A29', '#C77D3B'];

    /** Grouped bars. series = [{ name, color, values:[] }], labels = [] */
    function groupedBars(labels, series, { height = 190 } = {}) {
        const max = Math.max(1, ...series.flatMap(s => s.values));
        const cols = labels.map((l, i) => {
            const bars = series.map(s => {
                const v = s.values[i] || 0;
                const h = Math.max(v > 0 ? 3 : 0, Math.round((v / max) * (height - 34)));
                return `<div class="lkc-bar" style="height:${h}px;background:${s.color}" title="${esc(s.name)}: ${esc(inr(v))}"></div>`;
            }).join('');
            return `<div class="lkc-col"><div class="lkc-bars">${bars}</div><span class="lkc-lbl">${esc(l)}</span></div>`;
        }).join('');
        return `<div class="lkc-grouped" style="height:${height}px">${cols}</div>`;
    }

    /** Donut with legend. items = [{ label, value }] */
    function donut(items, { centerLabel = 'Total', format = inr } = {}) {
        const total = items.reduce((a, x) => a + x.value, 0);
        if (!total) return '<div class="empty-state py-4"><i class="bi bi-pie-chart"></i><p class="fw-semibold mb-0">No data for this selection</p></div>';
        let acc = 0;
        const stops = items.map((x, i) => { const from = acc / total * 100; acc += x.value; return `${PALETTE[i % PALETTE.length]} ${from}% ${acc / total * 100}%`; }).join(',');
        const legend = items.map((x, i) => `<li><span class="lkc-dot" style="background:${PALETTE[i % PALETTE.length]}"></span><span class="lkc-l">${esc(x.label)}</span><span class="lkc-v">${esc(format(x.value))}</span><span class="lkc-p">${(x.value / total * 100).toFixed(0)}%</span></li>`).join('');
        return `<div class="lkc-donut-wrap"><div class="lkc-donut" style="background:conic-gradient(${stops})"><div class="lkc-donut-hole"><b>${esc(compact(total))}</b><small>${esc(centerLabel)}</small></div></div><ul class="lkc-legend">${legend}</ul></div>`;
    }

    /** Horizontal bars. rows = [{ label, value, sub }] */
    function hbars(rows, { format = inr, color = 'var(--lk-green)' } = {}) {
        if (!rows.length) return '<div class="empty-state py-4"><i class="bi bi-bar-chart"></i><p class="fw-semibold mb-0">Nothing to show yet</p></div>';
        const max = Math.max(1, ...rows.map(r => r.value));
        return `<div class="lkc-hbars">${rows.map(r => `<div class="lkc-hrow"><div class="lkc-hhead"><span>${esc(r.label)}</span><b>${esc(format(r.value))}</b></div><div class="lkc-htrack"><div style="width:${Math.max(r.value > 0 ? 2 : 0, r.value / max * 100)}%;background:${r.color || color}"></div></div>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</div>`).join('')}</div>`;
    }

    window.LKCharts = { groupedBars, donut, hbars, inr, compact, PALETTE };
})();
