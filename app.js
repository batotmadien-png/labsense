const $ = s => document.querySelector(s);
const sel = $('#lang'), fileIn = $('#file'), go = $('#go'), prev = $('#preview'), statusEl = $('#status');
let cur = { code: 'en', name: 'English', rtl: false, dict: STRINGS.en };
let imageData = null;
let lastData = null;
let speaking = false;
let reportId = null;
const simpleBox = $('#simple');
try { simpleBox.checked = localStorage.getItem('simple') === '1'; } catch (e) {}
simpleBox.addEventListener('change', () => { try { localStorage.setItem('simple', simpleBox.checked ? '1' : '0'); } catch (e) {} });

function t(k) { return cur.dict[k] || STRINGS.en[k] || k; }

function fillSelect() {
  sel.innerHTML = '';
  for (const [c, [n]] of Object.entries(LANGS)) sel.add(new Option(n, c));
  Object.keys(localStorage).filter(k => k.startsWith('ui2_x:')).forEach(k => {
    const c = k.slice(4); sel.add(new Option(c.slice(2), c));
  });
  sel.add(new Option('🌍 …', 'other'));
}

function applyDict() {
  document.documentElement.lang = cur.code.replace('x:', '');
  document.documentElement.dir = cur.rtl ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  sel.value = cur.code;
}

async function api(body) {
  const r = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.detail || j.error || 'error');
  return j;
}

async function setLang(code) {
  let name, rtl = false;
  if (code === 'other') {
    const typed = (prompt('Language? / اللغة؟') || '').trim();
    if (!typed) { sel.value = cur.code; return; }
    code = 'x:' + typed; name = typed;
    if (![...sel.options].some(o => o.value === code)) sel.add(new Option(typed, code), sel.options.length - 1);
  } else if (LANGS[code]) { name = LANGS[code][0]; rtl = !!LANGS[code][1]; }
  else name = code.slice(2);

  let dict = STRINGS[code];
  if (!dict) {
    try { dict = JSON.parse(localStorage.getItem('ui2_' + code) || 'null'); } catch (e) {}
  }
  if (!dict) {
    statusEl.innerHTML = '<div class="loading"></div>';
    statusEl.firstChild.textContent = t('translating');
    try {
      dict = await api({ action: 'translate', langName: name, strings: STRINGS.en });
      try { localStorage.setItem('ui2_' + code, JSON.stringify(dict)); } catch (e) {}
    } catch (e) { dict = STRINGS.en; }
    statusEl.textContent = '';
  }
  cur = { code, name, rtl, dict };
  try { localStorage.setItem('lang', code); } catch (e) {}
  applyDict();
}

// ---- image handling (resize to keep the upload small) ----
function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const img = new Image();
  img.onload = () => {
    const max = 1600, s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', 0.85);
    imageData = url.split(',')[1]; reportId = null;
    prev.src = url; prev.hidden = false; go.disabled = false;
  };
  img.src = URL.createObjectURL(file);
}
fileIn.addEventListener('change', e => loadFile(e.target.files[0]));
const drop = $('#drop');
['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

// ---- analyze ----
function li(cls, ...kids) { const e = document.createElement('li'); if (cls) e.className = cls; kids.forEach(k => e.append(k)); return e; }
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

function render(d) {
  lastData = d; stopSpeech();
  $('#summary').textContent = d.summary || '';
  const u = $('#urgent');
  u.hidden = !d.urgent;
  if (d.urgent) u.textContent = '⚠️ ' + t('urgent') + (d.urgent_note ? ' — ' + d.urgent_note : '');
  const ul = $('#tests'); ul.innerHTML = '';
  (d.tests || []).forEach(x => {
    const st = ['normal', 'high', 'low'].includes(x.status) ? x.status : 'unknown';
    const top = el('div', 'row');
    top.append(el('span', 'tname', x.name), el('span', 'val', [x.value, x.unit].filter(Boolean).join(' ')));
    const meta = el('div', 'meta');
    meta.append(el('span', 'pill', t(st)));
    if (x.range) meta.append(' ' + t('range') + ': ' + x.range);
    const item = li(st, top, meta);
    if (x.explanation) item.append(el('p', '', x.explanation));
    ul.append(item);
  });
  const q = $('#qs'); q.innerHTML = '';
  (d.questions || []).forEach(s => q.append(li('', s)));
  $('#simpler').hidden = simpleBox.checked;
  $('#savedNote').hidden = !saveReport(d);
  $('#out').hidden = false;
  $('#out').scrollIntoView({ behavior: 'smooth' });
}

async function runAnalyze() {
  if (!imageData) return;
  go.disabled = true; $('#out').hidden = true;
  statusEl.innerHTML = '<div class="loading"></div>';
  statusEl.firstChild.textContent = t('analyzing');
  try {
    const d = await api({ action: 'analyze', image: imageData, mediaType: 'image/jpeg', langName: cur.name, simple: simpleBox.checked });
    statusEl.textContent = '';
    if (d.not_lab) { statusEl.append(el('p', 'error', t('notlab'))); }
    else render(d);
  } catch (e) {
    statusEl.textContent = '';
    statusEl.append(el('p', 'error', t('error')));
    const d = el('p', 'meta', String(e.message || '')); d.dir = 'ltr'; statusEl.append(d);
  }
  go.disabled = false;
}
go.addEventListener('click', runAnalyze);
$('#simpler').addEventListener('click', () => {
  simpleBox.checked = true; simpleBox.dispatchEvent(new Event('change'));
  stopSpeech(); runAnalyze();
});

$('#again').addEventListener('click', () => {
  stopSpeech();
  imageData = null; reportId = null; prev.hidden = true; fileIn.value = ''; go.disabled = true;
  $('#out').hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' });
});
sel.addEventListener('change', () => setLang(sel.value));


// ---- read aloud (browser speech, free) ----
const REGION = { ar:'ar-SA', en:'en-US', fr:'fr-FR', es:'es-ES', de:'de-DE', it:'it-IT', pt:'pt-BR', tr:'tr-TR', ru:'ru-RU',
  fa:'fa-IR', ur:'ur-PK', he:'he-IL', hi:'hi-IN', bn:'bn-BD', id:'id-ID', zh:'zh-CN', ja:'ja-JP', ko:'ko-KR', nl:'nl-NL', sw:'sw-KE' };
function speechText() {
  if (!lastData) return '';
  const parts = [lastData.summary];
  (lastData.tests || []).forEach(x => parts.push([x.name, x.value, x.unit, x.explanation].filter(Boolean).join(', ') + '.'));
  return parts.filter(Boolean).join(' ');
}
function stopSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  speaking = false;
  const b = $('#listen'); if (b) b.textContent = t('listen');
}
function pickVoice(lang) {
  const voices = speechSynthesis.getVoices() || [];
  const base = lang.slice(0, 2).toLowerCase();
  const norm = v => v.lang.replace('_', '-').toLowerCase();
  return voices.find(v => norm(v) === lang.toLowerCase()) || voices.find(v => norm(v).startsWith(base)) || null;
}
function noVoice() { const n = $('#voiceNote'); n.textContent = t('novoice'); n.hidden = false; stopSpeech(); }
function startSpeech() {
  $('#voiceNote').hidden = true;
  if (!('speechSynthesis' in window)) return noVoice();
  const base = cur.code.startsWith('x:') ? '' : cur.code;
  const lang = base ? (REGION[base] || base) : '';
  const voice = lang ? pickVoice(lang) : null;
  const chunks = speechText().split(/(?<=[.!?\u061F\u3002])\s+/).filter(Boolean);
  chunks.forEach((c, n) => {
    const u = new SpeechSynthesisUtterance(c);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else if (lang) u.lang = lang;
    u.onerror = ev => { if (ev.error !== 'interrupted' && ev.error !== 'canceled') noVoice(); };
    if (n === chunks.length - 1) u.onend = () => stopSpeech();
    speechSynthesis.speak(u);
  });
  speaking = true; $('#listen').textContent = t('stop');
}
$('#listen').addEventListener('click', () => speaking ? stopSpeech() : startSpeech());
if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }


// ---- history + trend chart (saved only in this browser) ----
const HKEY = 'labsense_history';
function loadHist() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } }
function saveHist(list) { try { localStorage.setItem(HKEY, JSON.stringify(list.slice(-30))); return true; } catch (e) { return false; } }
function numOf(v) { const m = String(v == null ? '' : v).replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; }
function fin(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
function normKey(x) { return String(x.key || x.name || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ').trim(); }

function saveReport(d) {
  const tests = (d.tests || []).map(x => ({
    key: normKey(x), name: x.name || '', value: x.value || '', num: numOf(x.value), unit: x.unit || '',
    status: ['normal', 'high', 'low'].includes(x.status) ? x.status : 'unknown', low: fin(x.ref_low), high: fin(x.ref_high)
  })).filter(x => x.key);
  if (!tests.length) return false;
  const list = loadHist();
  const i = reportId ? list.findIndex(r => r.id === reportId) : -1;
  if (i >= 0) list[i].tests = tests;
  else { reportId = String(Date.now()); list.push({ id: reportId, t: Date.now(), tests }); }
  return saveHist(list);
}

function fmtDate(ts) {
  try { return new Date(ts).toLocaleDateString(cur.code.startsWith('x:') ? undefined : cur.code, { day: 'numeric', month: 'short' }); }
  catch (e) { return new Date(ts).toLocaleDateString(); }
}
const SCOL = { normal: 'var(--ok)', high: 'var(--hi)', low: 'var(--lo)', unknown: 'var(--muted)' };

function drawChart(pts, band) {
  const W = 640, H = 270, L = 46, R = 16, T = 20, B = 46, iw = W - L - R, ih = H - T - B;
  let lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v));
  if (band.low != null) lo = Math.min(lo, band.low);
  if (band.high != null) hi = Math.max(hi, band.high);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
  const x = i => pts.length === 1 ? L + iw / 2 : L + i * iw / (pts.length - 1);
  const y = v => T + (hi - v) * ih / (hi - lo);
  const f = v => String(Math.round(v * 10) / 10);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="trend chart">`;
  if (band.low != null || band.high != null) {
    const yt = band.high != null ? y(band.high) : T, yb = band.low != null ? y(band.low) : H - B;
    s += `<rect x="${L}" y="${yt}" width="${iw}" height="${Math.max(0, yb - yt)}" style="fill:var(--ok)" opacity=".15"/>`;
  }
  for (let k = 0; k <= 3; k++) {
    const v = lo + (hi - lo) * k / 3, yy = y(v);
    s += `<line x1="${L}" y1="${yy}" x2="${W - R}" y2="${yy}" style="stroke:var(--line)"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end">${f(v)}</text>`;
  }
  s += `<polyline fill="none" style="stroke:var(--brand)" stroke-width="2.5" points="${pts.map((p, i) => x(i) + ',' + y(p.v)).join(' ')}"/>`;
  pts.forEach((p, i) => {
    s += `<circle cx="${x(i)}" cy="${y(p.v)}" r="6" style="fill:${SCOL[p.status] || SCOL.unknown}" stroke="#fff" stroke-width="2"/>`;
    s += `<text x="${x(i)}" y="${y(p.v) - 11}" text-anchor="middle" style="font-weight:700">${f(p.v)}</text>`;
    if (pts.length <= 8 || i % 2 === 0) s += `<text x="${x(i)}" y="${H - 18}" text-anchor="middle">${fmtDate(p.t)}</text>`;
  });
  return s + '</svg>';
}

function renderHistory() {
  const list = loadHist();
  $('#histEmpty').hidden = list.length > 0;
  $('#histBody').hidden = list.length === 0;
  if (!list.length) return;
  const groups = {};
  list.forEach(r => r.tests.forEach(x => {
    if (x.num == null) return;
    (groups[x.key] = groups[x.key] || { name: x.name, unit: x.unit, pts: [] });
    const g = groups[x.key]; g.name = x.name || g.name; g.unit = x.unit || g.unit;
    g.pts.push({ t: r.t, v: x.num, status: x.status, low: x.low, high: x.high });
  }));
  const keys = Object.keys(groups).sort((p, q) => groups[q].pts.length - groups[p].pts.length);
  const hs = $('#histTest'), prevKey = hs.value;
  hs.innerHTML = '';
  keys.forEach(k => hs.add(new Option(groups[k].name + (groups[k].unit ? ' (' + groups[k].unit + ')' : ''), k)));
  if (keys.includes(prevKey)) hs.value = prevKey;
  const draw = () => {
    const g = groups[hs.value];
    if (!g) { $('#chart').innerHTML = ''; $('#histNote').textContent = ''; return; }
    const latest = [...g.pts].reverse().find(p => p.low != null || p.high != null) || {};
    $('#chart').innerHTML = drawChart(g.pts, { low: latest.low == null ? null : latest.low, high: latest.high == null ? null : latest.high });
    $('#histNote').textContent = g.pts.length < 2 ? t('needMore') : '';
  };
  hs.onchange = draw; draw();
  const box = $('#reports'); box.innerHTML = '';
  [...list].reverse().forEach(r => {
    const row = el('div', 'rep');
    row.append(el('span', '', fmtDate(r.t) + ' - ' + r.tests.length + ' ' + t('tests_n')));
    const del = el('button', '', t('delete'));
    del.addEventListener('click', () => { saveHist(loadHist().filter(z => z.id !== r.id)); renderHistory(); });
    row.append(del); box.append(row);
  });
}
$('#histBtn').addEventListener('click', () => {
  const h = $('#history'); h.hidden = !h.hidden;
  if (!h.hidden) { renderHistory(); h.scrollIntoView({ behavior: 'smooth' }); }
});
$('#histClose').addEventListener('click', () => { $('#history').hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' }); });
$('#clearAll').addEventListener('click', () => {
  if (confirm(t('confirmClear'))) { try { localStorage.removeItem(HKEY); } catch (e) {} renderHistory(); }
});

// ---- start ----
fillSelect();
let saved = null; try { saved = localStorage.getItem('lang'); } catch (e) {}
const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
const start = saved && [...sel.options].some(o => o.value === saved) ? saved : (LANGS[browser] ? browser : 'en');
setLang(start);
