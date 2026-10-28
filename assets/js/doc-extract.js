/* ==========================================================================
   Livinkey Admin — document reader (LKDocExtract)

   Reads a tenant's document IN THE BROWSER (nothing is uploaded anywhere) and
   returns the details it can find, ready to fill the registration form.

   Supported:  Form 'C' (Arrival Report of Foreigner in Guest House)
               Aadhaar card
               Any PDF with a text layer, JPG / PNG / WEBP photos and scans

   Pipeline:   PDF.js renders pages  ->  image clean-up (shadow removal, binarise,
               table-line removal)  ->  Tesseract OCR (several passes, stops as
               soon as every key field is found)  ->  label-based parsing with
               validation and cross-pass voting.

   Libraries load on demand from jsDelivr, so pages that never use auto-fill
   pay nothing.
   ========================================================================== */
(function () {
    'use strict';

    const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/';
    const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    const LANG = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int';
    const MAX_PAGES = 4;
    const TARGET_WIDTH = 2000;

    // ------------------------------------------------------------ loaders
    const _scripts = {};
    function loadScript(src) {
        if (_scripts[src]) return _scripts[src];
        _scripts[src] = new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = src; s.async = true;
            s.onload = res; s.onerror = () => { delete _scripts[src]; rej(new Error('Could not load the document reader. Check your internet connection.')); };
            document.head.appendChild(s);
        });
        return _scripts[src];
    }
    async function getPdfjs() {
        await loadScript(PDFJS + 'pdf.min.js');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
        return window.pdfjsLib;
    }
    let _worker = null, _workerBusy = null;
    async function getWorker(onProgress) {
        await loadScript(TESS);
        if (!_worker) {
            _worker = await window.Tesseract.createWorker('eng', 1, {
                langPath: LANG,
                logger: (m) => { if (m.status === 'recognizing text' && _workerBusy) _workerBusy(m.progress); }
            });
        }
        _workerBusy = onProgress || null;
        return _worker;
    }

    // ------------------------------------------------------------ image helpers
    function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

    async function fileToCanvases(file, status) {
        const name = (file.name || '').toLowerCase();
        const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
        const pages = [];
        if (isPdf) {
            status('Opening PDF…');
            const pdfjs = await getPdfjs();
            const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
            const n = Math.min(pdf.numPages, MAX_PAGES);
            for (let i = 1; i <= n; i++) {
                const page = await pdf.getPage(i);
                let text = '';
                try { const tc = await page.getTextContent(); text = rebuildLines(tc.items); } catch (_) {}
                const base = page.getViewport({ scale: 1 });
                const scale = Math.min(4, Math.max(1, TARGET_WIDTH / base.width));
                const vp = page.getViewport({ scale });
                const canvas = newCanvas(Math.round(vp.width), Math.round(vp.height));
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                await page.render({ canvasContext: ctx, viewport: vp }).promise;
                pages.push({ canvas, text: text.length > 200 ? text : '' });
            }
            return { pages, total: pdf.numPages };
        }
        if (!/^image\//.test(file.type)) throw new Error('Please upload a PDF or an image (JPG, PNG, WEBP).');
        status('Reading image…');
        let bmp;
        try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
        catch (_) { bmp = await createImageBitmap(file); }
        const scale = Math.min(2.5, Math.max(0.5, TARGET_WIDTH / bmp.width));
        const canvas = newCanvas(Math.round(bmp.width * scale), Math.round(bmp.height * scale));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        pages.push({ canvas, text: '' });
        return { pages, total: 1 };
    }

    // Join pdf.js text items into lines using their vertical position
    function rebuildLines(items) {
        const rows = [];
        items.forEach(it => {
            if (!it.str || !it.str.trim()) return;
            const y = Math.round(it.transform[5] / 3), x = it.transform[4];
            let row = rows.find(r => Math.abs(r.y - y) <= 1);
            if (!row) { row = { y, cells: [] }; rows.push(row); }
            row.cells.push({ x, s: it.str });
        });
        return rows.sort((a, b) => b.y - a.y).map(r => r.cells.sort((a, b) => a.x - b.x).map(c => c.s).join('  ')).join('\n');
    }

    /** Shadow-removed grayscale ("norm") and binarised, line-free ("clean") versions. */
    function preprocess(src) {
        const w = src.width, h = src.height;
        const sctx = src.getContext('2d', { willReadFrequently: true });
        const rgba = sctx.getImageData(0, 0, w, h).data;
        const n = w * h, g = new Uint8ClampedArray(n);
        for (let i = 0, j = 0; i < n; i++, j += 4) g[i] = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000;

        // background estimate: max-pool (removes dark text) -> blur -> bilinear upsample
        const f = 8, sw = Math.ceil(w / f), sh = Math.ceil(h / f);
        let small = new Float32Array(sw * sh);
        for (let by = 0; by < sh; by++) for (let bx = 0; bx < sw; bx++) {
            let m = 0; const y1 = Math.min(h, (by + 1) * f), x1 = Math.min(w, (bx + 1) * f);
            for (let y = by * f; y < y1; y++) { const row = y * w; for (let x = bx * f; x < x1; x++) { const v = g[row + x]; if (v > m) m = v; } }
            small[by * sw + bx] = m;
        }
        for (let pass = 0; pass < 2; pass++) {
            const out = new Float32Array(sw * sh);
            for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
                let s = 0, c = 0;
                for (let dy = -2; dy <= 2; dy++) { const yy = y + dy; if (yy < 0 || yy >= sh) continue; for (let dx = -2; dx <= 2; dx++) { const xx = x + dx; if (xx < 0 || xx >= sw) continue; s += small[yy * sw + xx]; c++; } }
                out[y * sw + x] = s / c;
            }
            small = out;
        }
        const norm = new Uint8ClampedArray(n);
        for (let y = 0; y < h; y++) {
            const fy = Math.min(sh - 1, y / f), y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), ty = fy - y0;
            for (let x = 0; x < w; x++) {
                const fx = Math.min(sw - 1, x / f), x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), tx = fx - x0;
                const bg = (small[y0 * sw + x0] * (1 - tx) + small[y0 * sw + x1] * tx) * (1 - ty) + (small[y1 * sw + x0] * (1 - tx) + small[y1 * sw + x1] * tx) * ty;
                const v = g[y * w + x] / Math.max(bg, 1) * 255;
                norm[y * w + x] = v > 255 ? 255 : v;
            }
        }

        // local-mean threshold through an integral image
        const iw = w + 1, integral = new Float64Array(iw * (h + 1));
        for (let y = 1; y <= h; y++) { let rs = 0; for (let x = 1; x <= w; x++) { rs += norm[(y - 1) * w + (x - 1)]; integral[y * iw + x] = integral[(y - 1) * iw + x] + rs; } }
        const r = 20, black = new Uint8Array(n);
        for (let y = 0; y < h; y++) {
            const ya = Math.max(0, y - r), yb = Math.min(h - 1, y + r);
            for (let x = 0; x < w; x++) {
                const xa = Math.max(0, x - r), xb = Math.min(w - 1, x + r);
                const area = (xb - xa + 1) * (yb - ya + 1);
                const sum = integral[(yb + 1) * iw + xb + 1] - integral[ya * iw + xb + 1] - integral[(yb + 1) * iw + xa] + integral[ya * iw + xa];
                if (norm[y * w + x] < sum / area - 15) black[y * w + x] = 1;
            }
        }
        // remove long thin horizontal / vertical runs (table borders)
        const kill = new Uint8Array(n), MINH = 80, MINV = 60;
        for (let y = 0; y < h; y++) { let s = -1; for (let x = 0; x <= w; x++) { const b = x < w && black[y * w + x]; if (b && s < 0) s = x; if (!b && s >= 0) { if (x - s >= MINH) for (let k = s; k < x; k++) kill[y * w + k] = 1; s = -1; } } }
        for (let x = 0; x < w; x++) { let s = -1; for (let y = 0; y <= h; y++) { const b = y < h && black[y * w + x]; if (b && s < 0) s = y; if (!b && s >= 0) { if (y - s >= MINV) for (let k = s; k < y; k++) kill[k * w + x] = 1; s = -1; } } }

        const outNorm = newCanvas(w, h), outClean = newCanvas(w, h);
        const a = new ImageData(w, h), b = new ImageData(w, h);
        for (let i = 0, j = 0; i < n; i++, j += 4) {
            const nv = norm[i]; a.data[j] = a.data[j + 1] = a.data[j + 2] = nv; a.data[j + 3] = 255;
            let cv = 255;
            if (black[i]) {
                // keep a pixel only if it is not part of a ruled line (or touches the line's neighbours as text strokes)
                cv = kill[i] ? 255 : 0;
            }
            b.data[j] = b.data[j + 1] = b.data[j + 2] = cv; b.data[j + 3] = 255;
        }
        outNorm.getContext('2d').putImageData(a, 0, 0);
        outClean.getContext('2d').putImageData(b, 0, 0);
        return { norm: outNorm, clean: outClean };
    }

    // ------------------------------------------------------------ parsing
    const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const clean = (t) => String(t || '').replace(/[|_\[\]{}~]/g, ' ').replace(/[ \t]+/g, ' ');
    const linesOf = (t) => clean(t).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const DATE_RE = /\b([0-3]\d)[\/.\-]([01]\d)[\/.\-]((?:19|20)\d\d)\b/;
    const iso = (d, m, y) => { d = +d; m = +m; y = +y; const dt = new Date(y, m - 1, d); return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null; };
    const dateIn = (s) => { const m = DATE_RE.exec(s || ''); return m ? iso(m[1], m[2], m[3]) : null; };
    const title = (s) => s.toLowerCase().replace(/(^|[\s'-])([a-z])/g, (_, p, c) => p + c.toUpperCase());

    // Consecutive ALL-CAPS words (names on these forms are upper case); drops OCR debris like "é" or "—".
    function capsWords(s) {
        const out = [];
        for (const w of s.split(/\s+/)) {
            const t = w.replace(/^[^A-Za-z]+|[^A-Za-z.'-]+$/g, '');
            if (t.length >= 2 && t === t.toUpperCase() && /^[A-Z][A-Z.'-]+$/.test(t)) out.push(t); else if (out.length) break;
        }
        return out.join(' ');
    }
    // text after a label on the same line
    function afterLabel(line, re) { const m = re.exec(line); return m ? line.slice(m.index + m[0].length) : null; }

    let KNOWN_CODES = null;
    let COUNTRY_NAMES = [];

    /** Every parser returns { field: value } using ONE OCR text. Voting happens across texts. */
    function parseCForm(text) {
        const L = linesOf(text), full = clean(text), r = {};
        // Applicant ID (also used as the C-form reference)
        let m = /Applicant\s*ID\s*[:;.\-]?\s*([A-Z0-9]{10,14})/i.exec(full);
        if (m && /\d/.test(m[1])) r.applicant_id = m[1].toUpperCase();
        else { m = /\b(\d{6,8}[A-Z][A-Z0-9]{3,6})\b/.exec(full); if (m && m[1].length >= 10) r.applicant_id = m[1]; }

        for (let i = 0; i < L.length; i++) {
            const line = L[i];
            let rest;
            if ((rest = afterLabel(line, /\bS[uo][rmn]\s?[nm]?a[mn]?e\b/i)) !== null && !r.surname) { const v = capsWords(rest); if (v) r.surname = v; }
            if ((rest = afterLabel(line, /\bGiven\s?name\b/i)) !== null && !r.given_name) { const v = capsWords(rest); if (v) r.given_name = v; }
            if (/\bSex\b/i.test(line) && !r.gender) { const g = /\b(Male|Female|Transgender|Other)\b/i.exec(afterLabel(line, /\bSex\b/i) || ''); if (g) r.gender = g[1].toLowerCase(); }
            if (/Date\s?of\s?birth/i.test(line) && !r.dob) { const d = dateIn(afterLabel(line, /Date\s?of\s?birth/i)); if (d) r.dob = d; }
            if (/Nationality/i.test(line) && !r.nationality_raw) { const v = capsWords(afterLabel(line, /Nationality/i) || ''); if (v && v.replace(/[^A-Z]/g, '').length >= 4) r.nationality_raw = v; }
            if (/Passport\s?No/i.test(line) && !r.passport_no) { const p = /\b([A-Z]{1,2}\s?\d{6,8})\b/.exec(afterLabel(line, /Passport\s?No\.?/i) || ''); if (p) r.passport_no = p[1].replace(/\s/g, ''); }
            if (/Valid\s?Till/i.test(line) && !r.visa_valid_till) { const d = dateIn(afterLabel(line, /Valid\s?Till/i)); if (d) r.visa_valid_till = d; }
            if (/Date\s?of\s?arrival\s?in\s?India/i.test(line) && !r.india_arrival) { const d = dateIn(line + ' ' + (L[i + 1] || '')); if (d) r.india_arrival = d; }
            if (/Arrival\s?in\s?Guest/i.test(line) && !/Time\s?of\s?Arrival/i.test(line) && !r.guesthouse_arrival) { const d = dateIn(line) || dateIn(L[i + 1] || ''); if (d) r.guesthouse_arrival = d; }
            if (/Duration\s?of\s?Stay/i.test(line) && !r.stay_days) { const d = /Duration\s?of\s?Stay\s?(?:in)?\s*[:.\-]?\s*(\d{1,3})\b/i.exec(line); if (d) r.stay_days = +d[1]; }
            if (/Mobile\s?No.{0,6}in\s?India/i.test(line) && !r.india_mobile) { const p = /(?:^|\D)(\d{10})(?!\d)/.exec(afterLabel(line, /in\s?India\)?/i) || ''); if (p) r.india_mobile = p[1]; }
            if (/Permanently\s?residing/i.test(line) && !r.home_mobile) {
                for (let k = i; k <= Math.min(i + 2, L.length - 1); k++) {
                    const p = /\+?\b(\d{1,3})[\s-]+(\d{7,12})\b/.exec(L[k].replace(/^.*?country\)?/i, '') || '') || /\+?\b(\d{1,3})[\s-]+(\d{7,12})\b/.exec(L[k]);
                    if (p && (!KNOWN_CODES || KNOWN_CODES.has(p[1]))) { r.home_mobile = { code: p[1], number: p[2] }; break; }
                }
            }
        }
        if (COUNTRY_NAMES.length) {   // the home country is repeated on the form (nationality, permanent address, next destination)
            const up = full.toUpperCase(); let best = null, bn = 0;
            COUNTRY_NAMES.forEach(cn => { if (cn.length < 4 || /^india$/i.test(cn)) return; const n = (up.match(new RegExp('\\b' + cn.toUpperCase().replace(/[^A-Z ]/g, '') + '\\b', 'g')) || []).length; if (n > bn) { bn = n; best = cn; } });
            if (best && bn >= 1) r.country_hint = best.toUpperCase();
        }
        if (!r.surname) {
            const gi = L.findIndex(l => /\bGiven\s?name\b/i.test(l));
            if (gi > 0 && !/Details|Address/i.test(L[gi - 1])) { const v = capsWords(L[gi - 1].replace(/^\W*[A-Za-z()]{2,12}\s+/, '')); if (v) r.surname = v; }
        }
        // layout fallbacks for cells the OCR split onto the next line
        if (!r.stay_days) { const d = /Duration\s?of\s?Stay\s?in[\s\S]{0,40}?\b(\d{2,3})\b(?!\/)/i.exec(full); if (d && !/:/.test(d[0])) r.stay_days = +d[1]; }
        if (!r.gender) { const g = /\bSex\b[\s\S]{0,40}?\b(Male|Female)\b/i.exec(full); if (g) r.gender = g[1].toLowerCase(); }
        if (!r.dob) { const d = /Date\s?of\s?birth[^0-9]{0,15}([0-3]\d[\/.\-][01]\d[\/.\-](?:19|20)\d\d)/i.exec(full); if (d) r.dob = dateIn(d[1]); }
        return r;
    }

    function parseAadhaar(text) {
        const L = linesOf(text), full = clean(text), r = {};
        const dobIdx = L.findIndex(l => /(Date\s?of\s?Birth|DOB)/i.test(l));
        if (dobIdx >= 0) {
            const d = dateIn(L[dobIdx]); if (d) r.dob = d;
            for (let k = dobIdx; k >= Math.max(0, dobIdx - 3); k--) {   // name sits just above the DOB line
                const v = capsWords(L[k].replace(/(Date\s?of\s?Birth|DOB).*/i, '').replace(/^.*(Government\s+of\s+India|Govemment[^\s]*)/i, ''));
                if (v) { const w = v.split(' '); if (w.length > 2 && w[w.length - 1].length <= 2) w.pop(); r._n = w.join(' '); }
                const v2 = r._n; delete r._n;
                if (v2 && v2.split(' ').length >= 2 && !/GOVERNMENT|INDIA|AADHAAR|UNIQUE|AUTHORITY/.test(v)) { r.name = v2; break; }
            }
        }
        const g = /\b(MALE|FEMALE|TRANSGENDER)\b/i.exec(full); if (g) r.gender = g[1].toLowerCase();
        // 12-digit Aadhaar (not the 16-digit VID)
        const cands = [];
        const spaced = /(?<![\d])(\d{4})\s(\d{4})\s(\d{4})(?![\d]|\s\d{4})/g; let m;
        while ((m = spaced.exec(full))) { const before = full.slice(Math.max(0, m.index - 6), m.index); if (!/VID/i.test(before)) cands.push(m[1] + m[2] + m[3]); }
        if (!cands.length) { const solid = /(?<![\d])(\d{12})(?![\d])/g; while ((m = solid.exec(full))) cands.push(m[1]); }
        if (cands.length) r.aadhaar = cands[0];
        return r;
    }

    function classify(text) {
        const t = clean(text);
        if (/Form\s*'?C'?|Arrival\s*Report|Applicant\s*ID|Guest\s*House/i.test(t) && /(Passport|Visa|Nationality|Applicant)/i.test(t)) return 'cform';
        if (/Aadhaar|AADHAAR|Government\s*of\s*India|Unique\s*Identification|\bVID\b/i.test(t) || /\b\d{4}\s\d{4}\s\d{4}\b/.test(t) && /(DOB|Date\s?of\s?Birth)/i.test(t)) return 'aadhaar';
        return 'other';
    }

    function parseGeneric(text) {  // best effort for passports and other labelled IDs
        const L = linesOf(text), r = {};
        for (const line of L) {
            let rest;
            if ((rest = afterLabel(line, /\bS[uo][rmn]\s?[nm]?a[mn]?e\b/i)) !== null && !r.surname) { const v = capsWords(rest); if (v) r.surname = v; }
            if ((rest = afterLabel(line, /\bGiven\s?names?\b/i)) !== null && !r.given_name) { const v = capsWords(rest); if (v) r.given_name = v; }
            if (/\bSex\b/i.test(line) && !r.gender) { const g = /\b(M|F|Male|Female)\b/.exec(afterLabel(line, /\bSex\b/i) || ''); if (g) r.gender = g[1][0] === 'M' ? 'male' : 'female'; }
            if (/Nationality/i.test(line) && !r.nationality_raw) { const v = capsWords(afterLabel(line, /Nationality/i) || ''); if (v) r.nationality_raw = v; }
        }
        return r;
    }

    // ------------------------------------------------------------ normalisation
    const COUNTRY_TO_DEMONYM = { 'UNITED KINGDOM': 'British', UK: 'British', 'GREAT BRITAIN': 'British', ENGLAND: 'English', GERMANY: 'German', FRANCE: 'French', NETHERLANDS: 'Dutch', HOLLAND: 'Dutch', 'UNITED ARAB EMIRATES': 'Emirati', UAE: 'Emirati', 'UNITED STATES': 'American', USA: 'American', 'UNITED STATES OF AMERICA': 'American', AMERICA: 'American', 'SOUTH KOREA': 'Korean', KOREA: 'Korean', 'SRI LANKA': 'Sri Lankan', 'NEW ZEALAND': 'New Zealander', PHILIPPINES: 'Filipino', SPAIN: 'Spanish', GREECE: 'Greek', SWEDEN: 'Swedish', DENMARK: 'Danish', FINLAND: 'Finnish', POLAND: 'Polish', TURKEY: 'Turkish', IRELAND: 'Irish', SWITZERLAND: 'Swiss', CHINA: 'Chinese', JAPAN: 'Japanese', 'SOUTH AFRICA': 'South African', 'SAUDI ARABIA': 'Saudi', 'CZECH REPUBLIC': 'Czech', MYANMAR: 'Burmese', 'IVORY COAST': 'Ivorian' };

    function lev(a, b) {
        const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
        let prev = Array.from({ length: n + 1 }, (_, j) => j);
        for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
        return prev[n];
    }
    /** "TANZANIA" / "TANZANIAN" / "FFANZANIA" -> "Tanzanian" (value that exists in the form's dropdown) */
    function toNationality(raw, list) {
        if (!raw) return null;
        let up = raw.toUpperCase().trim();
        if (!COUNTRY_TO_DEMONYM[up] && !list.some(x => x.toUpperCase() === up) && COUNTRY_NAMES.length) {
            // repair OCR slips (FFANZANIA -> TANZANIA) by snapping to the closest known country name
            let bc = null, bs = 99;
            COUNTRY_NAMES.forEach(cn => { const d = lev(up.toLowerCase(), cn.toLowerCase()); if (d < bs) { bs = d; bc = cn; } });
            if (bc && bs <= (up.length >= 8 ? 2 : 1)) up = bc.toUpperCase();
        }
        if (COUNTRY_TO_DEMONYM[up]) { const d = COUNTRY_TO_DEMONYM[up]; const hit = list.find(x => x.toLowerCase() === d.toLowerCase()); return hit || d; }
        const exact = list.find(x => x.toUpperCase() === up); if (exact) return exact;
        const low = up.toLowerCase();
        let best = null, bestScore = 99;
        for (const dem of list) {
            const d = dem.toLowerCase();
            const stem = d.replace(/(ian|ean|an|ese|ish|i|ic|ch|sh)$/, '');
            const cand = [lev(low, d), lev(low.slice(0, Math.max(stem.length, 4)), stem) + 0.5];
            const score = Math.min(...cand);
            if (score < bestScore) { bestScore = score; best = dem; }
        }
        return bestScore <= (up.length >= 8 ? 2.5 : up.length >= 6 ? 1.5 : 0.5) ? best : null;
    }

    function vote(values) {      // most common non-empty value; ties -> earliest
        const c = new Map(); values.filter(v => v !== undefined && v !== null && v !== '').forEach(v => { const k = typeof v === 'object' ? JSON.stringify(v) : String(v); const e = c.get(k) || { v, n: 0 }; e.n++; c.set(k, e); });
        let best = null; c.forEach(e => { if (!best || e.n > best.n) best = e; });
        return best ? { value: best.v, votes: best.n } : null;
    }

    // ------------------------------------------------------------ orchestration
    const PASSES = [['clean', '6'], ['clean', '4'], ['norm', '6'], ['norm', '4']];
    const CORE = (f) => f.surname && f.given_name && f.gender && (f.nationality_raw || f.country_hint) && f.applicant_id && f.guesthouse_arrival && f.stay_days && f.india_mobile;

    function mergeParsed(list) {
        const keys = new Set(); list.forEach(p => Object.keys(p).forEach(k => keys.add(k)));
        const out = {}, votes = {};
        keys.forEach(k => { const v = vote(list.map(p => p[k])); if (v) { out[k] = v.value; votes[k] = v.votes; } });
        return { out, votes };
    }

    async function run(file, opts = {}) {
        const status = opts.onStatus || (() => {});
        const nationalities = opts.nationalities || [];
        const codes = new Set((opts.countryCodes || []).map(c => String(c).replace('+', '')));
        KNOWN_CODES = codes.size ? codes : null;
        COUNTRY_NAMES = opts.countryNames || [];
        const { pages, total } = await fileToCanvases(file, status);

        const cformTexts = [], aadhaarParsed = [], genericParsed = [];
        let passesRun = 0;

        for (let pi = 0; pi < pages.length; pi++) {
            const label = pages.length > 1 ? `page ${pi + 1} of ${pages.length}` : 'document';
            const pg = pages[pi];
            let texts = [];
            if (pg.text) texts.push(pg.text);
            let kind = pg.text ? classify(pg.text) : null;
            if (!pg.text) {
                status(`Cleaning up ${label}…`); await new Promise(r => setTimeout(r, 30));
                const pre = preprocess(pg.canvas);
                for (let p = 0; p < PASSES.length; p++) {
                    const [variant, psm] = PASSES[p];
                    status(`Reading ${label} · pass ${p + 1} of ${PASSES.length}`, pi, pages.length);
                    const worker = await getWorker((prog) => status(`Reading ${label} · pass ${p + 1} of ${PASSES.length} · ${Math.round(prog * 100)}%`, pi, pages.length));
                    await worker.setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: '1', user_defined_dpi: '300' });
                    const { data } = await worker.recognize(pre[variant]);
                    texts.push(data.text); passesRun++;
                    kind = kind && kind !== 'other' ? kind : classify(texts.join('\n'));
                    if (kind === 'cform' && CORE(mergeParsed(texts.map(parseCForm)).out)) break;
                    if (kind === 'aadhaar') { const a = mergeParsed(texts.map(parseAadhaar)).out; if (a.name && a.aadhaar && a.dob && p >= 1) break; }
                    if (kind === 'other' && p >= 1) break;
                }
            }
            if (kind === 'cform') cformTexts.push(...texts);
            else if (kind === 'aadhaar') aadhaarParsed.push(...texts.map(parseAadhaar));
            else genericParsed.push(...texts.map(parseGeneric));
        }

        // ---- merge + validate
        const result = { kinds: [], fields: {}, confidence: {}, extra: {}, notes: [], pages: total, passes: passesRun };
        const f = result.fields, c = result.confidence;
        const set = (k, v, votes, sure) => { if (v === undefined || v === null || v === '') return; f[k] = v; c[k] = (sure || votes >= 2) ? 'high' : 'check'; };

        if (cformTexts.length) {
            result.kinds.push('Form C');
            const { out, votes } = mergeParsed(cformTexts.map(parseCForm));
            const fullName = [out.given_name, out.surname].filter(Boolean).join(' ');
            if (fullName) set('full_name', title(fullName), Math.min(votes.given_name || 1, votes.surname || 1));
            if (out.gender) set('gender', out.gender, votes.gender);
            result.debug = { nationality_raw: out.nationality_raw, country_hint: out.country_hint, votes };
            const nat = toNationality(out.nationality_raw, nationalities) || toNationality(out.country_hint, nationalities);
            if (nat) set('nationality', nat, Math.max(votes.nationality_raw || 0, votes.country_hint || 0), !!out.country_hint);
            set('residency', 'international', 3, true);
            if (out.applicant_id) set('cform', out.applicant_id, votes.applicant_id);
            if (out.guesthouse_arrival) set('arrival_date', out.guesthouse_arrival, 2, true);
            else if (out.india_arrival) { set('arrival_date', out.india_arrival, 1); result.notes.push('Guest-house arrival date was unreadable, so the date of arrival in India was used.'); }
            if (out.stay_days) { const months = Math.min(12, Math.max(1, Math.round(out.stay_days / 30.4))); set('period_of_stay', String(months), 2, true); result.extra.stay_days = out.stay_days; }
            if (out.india_mobile && /^[6-9]\d{9}$/.test(out.india_mobile)) { set('phone', out.india_mobile, 2, true); set('phone_code', '+91', 3, true); }
            if (out.home_mobile && codes.has(String(out.home_mobile.code)) && /^\d{7,11}$/.test(out.home_mobile.number)) set('international_phone', `+${out.home_mobile.code} ${out.home_mobile.number}`, 2, true);
            if (out.passport_no) result.extra.passport_no = out.passport_no;
            if (out.visa_valid_till) result.extra.visa_valid_till = out.visa_valid_till;
            if (out.dob) result.extra.dob = out.dob;
            if (!fullName) result.notes.push('The name could not be read. Please type it in.');
        }
        if (aadhaarParsed.length) {
            result.kinds.push('Aadhaar');
            const { out, votes } = mergeParsed(aadhaarParsed);
            if (cformTexts.length) {
                result.extra.local_contact = { name: out.name ? title(out.name) : null, aadhaar: out.aadhaar || null };
                result.notes.push(`Aadhaar card found${out.name ? ' for ' + title(out.name) : ''}. It belongs to the local contact on the Form C, so it was not applied to the tenant.`);
            } else {
                if (out.name) set('full_name', title(out.name), votes.name);
                if (out.gender) set('gender', out.gender, votes.gender);
                if (out.aadhaar) set('aadhaar', out.aadhaar, votes.aadhaar);
                set('residency', 'national', 3, true);
                set('nationality', 'Indian', 3, true);
                if (out.dob) result.extra.dob = out.dob;
            }
        }
        if (genericParsed.length && !cformTexts.length && !aadhaarParsed.length) {
            result.kinds.push('ID document');
            const { out, votes } = mergeParsed(genericParsed);
            const fullName = [out.given_name, out.surname].filter(Boolean).join(' ');
            if (fullName) set('full_name', title(fullName), votes.surname || 1);
            if (out.gender) set('gender', out.gender, 2, true);
            if (out.nationality_raw) { const nat = toNationality(out.nationality_raw, nationalities); if (nat) set('nationality', nat, 1); }
        }
        if (!Object.keys(f).length) result.notes.push('No details could be read from this file. Try a sharper, well-lit scan, or fill the form manually.');
        window.__dbg = result.debug; return result;
    }

    async function dispose() { if (_worker) { try { await _worker.terminate(); } catch (_) {} _worker = null; } }

    window.LKDocExtract = { run, dispose, _test: { parseCForm, parseAadhaar, classify, toNationality, mergeParsed, preprocess } };
})();
