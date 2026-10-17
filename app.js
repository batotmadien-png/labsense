const $ = s => document.querySelector(s);
const sel = $('#lang'), fileIn = $('#file'), go = $('#go'), prev = $('#preview'), statusEl = $('#status');
let cur = { code: 'en', name: 'English', rtl: false, dict: STRINGS.en };
let imageData = null;

function t(k) { return cur.dict[k] || STRINGS.en[k] || k; }

function fillSelect() {
  sel.innerHTML = '';
  for (const [c, [n]] of Object.entries(LANGS)) sel.add(new Option(n, c));
  Object.keys(localStorage).filter(k => k.startsWith('ui_x:')).forEach(k => {
    const c = k.slice(3); sel.add(new Option(c.slice(2), c));
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
  if (!r.ok) throw new Error(j.error || 'error');
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
    try { dict = JSON.parse(localStorage.getItem('ui_' + code) || 'null'); } catch (e) {}
  }
  if (!dict) {
    statusEl.innerHTML = '<div class="loading"></div>';
    statusEl.firstChild.textContent = t('translating');
    try {
      dict = await api({ action: 'translate', langName: name, strings: STRINGS.en });
      try { localStorage.setItem('ui_' + code, JSON.stringify(dict)); } catch (e) {}
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
    imageData = url.split(',')[1];
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
  $('#out').hidden = false;
  $('#out').scrollIntoView({ behavior: 'smooth' });
}

go.addEventListener('click', async () => {
  if (!imageData) return;
  go.disabled = true; $('#out').hidden = true;
  statusEl.innerHTML = '<div class="loading"></div>';
  statusEl.firstChild.textContent = t('analyzing');
  try {
    const d = await api({ action: 'analyze', image: imageData, mediaType: 'image/jpeg', langName: cur.name });
    statusEl.textContent = '';
    if (d.not_lab) { statusEl.append(el('p', 'error', t('notlab'))); }
    else render(d);
  } catch (e) {
    statusEl.textContent = '';
    statusEl.append(el('p', 'error', t('error')));
  }
  go.disabled = false;
});

$('#again').addEventListener('click', () => {
  imageData = null; prev.hidden = true; fileIn.value = ''; go.disabled = true;
  $('#out').hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' });
});
sel.addEventListener('change', () => setLang(sel.value));

// ---- start ----
fillSelect();
let saved = null; try { saved = localStorage.getItem('lang'); } catch (e) {}
const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
const start = saved && [...sel.options].some(o => o.value === saved) ? saved : (LANGS[browser] ? browser : 'en');
setLang(start);
