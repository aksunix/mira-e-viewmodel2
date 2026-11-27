const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const pick = document.getElementById('pick');
const progress = document.getElementById('progress');
const progressTitle = document.getElementById('progressTitle');
const progressSub = document.getElementById('progressSub');
const linear = document.getElementById('linear');
const bar = document.getElementById('bar');
const errorBox = document.getElementById('error');
const errorText = document.getElementById('errorText');
const results = document.getElementById('results');
const resultCount = document.getElementById('resultCount');
const cards = document.getElementById('cards');
const snackbar = document.getElementById('snackbar');
let snackTimer;
let busy = false;
let worker = null;

const ICONS = {
  search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  bars: 'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
  sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  staro: 'M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  ext: 'M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
  menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
  sun: 'M12 7a5 5 0 100 10 5 5 0 000-10zM2 13h2v-2H2v2zm18 0h2v-2h-2v2zM11 2v2h2V2h-2zm0 18v2h2v-2h-2zM5.99 4.58L4.58 5.99l1.41 1.41 1.42-1.41-1.42-1.42zm12.02 12.02l-1.41 1.41 1.41 1.42 1.42-1.42-1.42-1.41zM4.58 18.01l1.41 1.41 1.42-1.41-1.42-1.42-1.41 1.42zM18.01 5.99l1.42-1.41-1.42-1.42-1.41 1.42 1.41 1.41z',
  moon: 'M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  history: 'M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  school: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z',
  info: 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  shield: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
  bolt: 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51C12.96 17.55 11 21 11 21z',
  file: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z',
  copy: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  aim: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  speed: 'M20.38 8.57l-1.23 1.85a8 8 0 01-.22 7.58H5.07A8 8 0 0115.58 6.85l1.85-1.23A10 10 0 003.35 19a2 2 0 001.72 1h13.85a2 2 0 001.74-1 10 10 0 00-.27-10.44zm-9.79 6.84a2 2 0 002.83 0l5.66-8.49-8.49 5.66a2 2 0 000 2.83z',
  pulse: 'M3 12h4l2.5-7 5 14 2.5-7h4',
  monitor: 'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z',
  mouse: 'M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z',
  keyboard: 'M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zM4 7h16v10H4V7zm2 2h2v2H6V9zm3 0h2v2H9V9zm3 0h2v2h-2V9zm3 0h2v2h-2V9zm3 0h2v2h-2V9zM7 12h2v2H7v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm-7 3h6v1H9v-1z',
  zap: 'M13 2 3 14h7l-1 8 12-14h-7l1-6z',
  download: 'M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  flipback: 'M9 7H7v2h2V7zm0 4H7v2h2v-2zm0-8c-1.11 0-2 .9-2 2h2V3zm4 12h-2v2h2v-2zm6-12v2h2c0-1.1-.9-2-2-2zm-6 0h-2v2h2V3zM9 17v-2H7c0 1.1.89 2 2 2zm10-4h2v-2h-2v2zm0-4h2V7h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zM5 7H3v12c0 1.1.9 2 2 2h12v-2H5V7zm10-2h2V3h-2v2zm0 12h2v-2h-2v2z',
  flipfront: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm2 4v-2H3c0 1.1.89 2 2 2zM3 9h2V7H3v2zm12 12h2v-2h-2v2zm4-18H9c-1.11 0-2 .9-2 2v10c0 1.1.89 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H9V5h10v10zm-8 6h2v-2h-2v2zm-4 0h2v-2H7v2z',
  del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
};
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'i'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<path d="' + ICONS[name] + '"' + (name === 'pulse' ? ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' : '') + '/>';
  return s;
}
document.querySelectorAll('[data-i]').forEach(s => { s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = '<path d="' + ICONS[s.dataset.i] + '"/>'; });

const LS = {
  get(k, d) { try { const v = localStorage.getItem('cs2x:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('cs2x:' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
let currentFile = '';
const settings = { mode: 'all', autocopy: false, notify: true };

// Tema claro/escuro
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
}
document.querySelectorAll('[data-theme-set]').forEach(b => b.onclick = () => {
  try { localStorage.setItem('cs2x:theme', b.dataset.themeSet); } catch (e) {}
  applyTheme(b.dataset.themeSet);
});
applyTheme(document.documentElement.dataset.theme);

// Páginas (menu lateral) e menu no celular
const side = document.getElementById('side'), scrim = document.getElementById('scrim'), menuBtn = document.getElementById('menuBtn'), shell = document.querySelector('.shell');
const narrow = matchMedia('(max-width: 860px)');
// Telas grandes: o menu começa aberto e o botão recolhe/mostra. Telas pequenas: abre por cima do conteúdo.
function toggleMenu(open) {
  if (narrow.matches) { side.classList.toggle('open', open); scrim.classList.toggle('on', open); }
  else shell.classList.toggle('closed', !open);
  menuBtn.setAttribute('aria-expanded', String(open));
}
menuBtn.onclick = () => toggleMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
scrim.onclick = () => toggleMenu(false);
narrow.addEventListener('change', () => { side.classList.remove('open'); scrim.classList.remove('on'); shell.classList.remove('closed'); menuBtn.setAttribute('aria-expanded', String(!narrow.matches)); });
menuBtn.setAttribute('aria-expanded', String(!narrow.matches));
function route() {
  const p = location.hash.slice(2), v = ['inicio', 'demo'].includes(p) ? p : 'inicio';
  document.querySelectorAll('[data-view]').forEach(s => { s.hidden = s.dataset.view !== v; });
  document.querySelectorAll('.side a').forEach(a => a.dataset.page === v ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  if (narrow.matches) toggleMenu(false);
  if (v === 'demo') renderHistory();
  window.scrollTo({ top: 0 });
}
addEventListener('hashchange', route);
function setUpload(show) { document.getElementById('intro').hidden = !show; }

const bd = window.SD_BUILD_DATE || '';
const updEl = document.getElementById('upd'); if (updEl) updEl.textContent = /^\d/.test(bd) ? bd : new Date(document.lastModified).toLocaleDateString('pt-BR');

// Histórico (salvo só neste navegador)
function histAdd(name, players) {
  let h = LS.get('history', []);
  h.unshift({ id: Date.now(), name: name, date: new Date().toISOString(), players: players });
  h = h.slice(0, 20);
  while (h.length && !LS.set('history', h)) h.pop();
}
function renderHistory() {
  const list = document.getElementById('histList'), h = LS.get('history', []);
  list.innerHTML = '';
  document.getElementById('histClear').hidden = !h.length;
  if (!h.length) { list.appendChild(el('li', '', 'Nenhuma análise ainda. Envie um demo na aba Demo e ele aparece aqui.')).style.padding = '16px'; return; }
  h.forEach(it => {
    const li = el('li');
    const open = el('button', 'open'); open.type = 'button';
    const txt = el('span'); txt.append(el('b', '', it.name), el('small', '', new Date(it.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + ' · ' + it.players.length + ' jogadores'));
    open.append(icon('file'), txt);
    open.onclick = () => { location.hash = '#/demo'; demoTab('demo'); showResults(it.players, { title: it.name }); };
    const del = el('button', 'icon-btn'); del.type = 'button'; del.setAttribute('aria-label', 'Excluir ' + it.name); del.appendChild(icon('del'));
    del.onclick = () => { LS.set('history', LS.get('history', []).filter(x => x.id !== it.id)); renderHistory(); };
    li.append(open, del); list.appendChild(li);
  });
}
document.getElementById('histClear').onclick = () => { LS.set('history', []); renderHistory(); };


// Análise em andamento: cronômetro e demos recentes
const timerEl = document.getElementById('timer'), badge = document.getElementById('badge');
let timerId = null;
function startTimer() {
  const t0 = Date.now();
  clearInterval(timerId);
  const tick = () => {
    if (!busy) { clearInterval(timerId); return; }
    const s = Math.floor((Date.now() - t0) / 1000), f = n => String(n).padStart(2, '0');
    timerEl.textContent = f(Math.floor(s / 3600)) + ':' + f(Math.floor(s / 60) % 60) + ':' + f(s % 60);
  };
  timerEl.textContent = '00:00:00';
  timerId = setInterval(tick, 1000);
}
function renderRecent(current) {
  const list = document.getElementById('recentList');
  list.innerHTML = '';
  const row = (name, iso, done, n) => {
    const li = el('li'), txt = el('span');
    txt.append(el('b', '', name), el('small', '', new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })));
    li.append(icon('file'), txt, el('span', 'badge' + (done ? ' done' : ''), done ? 'Concluído' : 'Analisando'), el('span', 'n', n == null ? '—' : n + ' jogadores'));
    list.appendChild(li);
  };
  row(current, new Date().toISOString(), false, null);
  LS.get('history', []).slice(0, 3).forEach(it => row(it.name, it.date, true, it.players.length));
}

function saveText(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function setIndeterminate(title, sub) {
  progressTitle.textContent = title;
  progressSub.textContent = sub || '';
  linear.classList.add('indeterminate');
  linear.removeAttribute('aria-valuenow');
  bar.style.width = '';
}

function setProgress(pct) {
  linear.classList.remove('indeterminate');
  linear.setAttribute('aria-valuenow', pct);
  bar.style.width = pct + '%';
  progressSub.textContent = pct + '% do demo lido';
}

function failLoading(msg) {
  busy = false;
  progress.classList.remove('on');
  dropzone.disabled = true;
  pick.textContent = 'Indisponível';
  showError(msg);
}

function setLoading(on) {
  dropzone.disabled = on;
  if (on) {
    progress.classList.remove('analyzing');
    badge.textContent = 'Preparando';
    pick.textContent = 'Preparando o analisador…';
    setIndeterminate('Preparando o analisador', 'Só na primeira vez; o arquivo tem alguns MB.');
    progress.classList.add('on');
  } else {
    pick.textContent = 'Selecionar arquivo';
    progress.classList.remove('on');
  }
}

function startWorker() {
  setLoading(true);
  try {
    worker = new Worker('worker.js?v=20261117-rc2');
  } catch (e) {
    failLoading('Seu navegador não conseguiu iniciar o analisador. Tente o Chrome, Edge ou Firefox atualizados.');
    return;
  }
  worker.onmessage = e => {
    const m = e.data;
    if (m.type === 'ready') {
      setLoading(false);
    } else if (m.type === 'progress') {
      setProgress(m.value);
    } else if (m.type === 'result') {
      busy = false;
      progress.classList.remove('on');
      showResults(JSON.parse(m.json), { title: currentFile, save: true });
    } else if (m.type === 'error') {
      if (m.fatal) { failLoading(m.message); return; }
      busy = false;
      setLoading(false);
      showError(m.message);
    }
  };
  worker.onerror = () => {
    failLoading('O analisador parou de responder. Isso pode acontecer com demos muito grandes em aparelhos com pouca memória. Recarregue a página e tente de novo.');
  };
}

// Evita que o navegador abra o .dem se for solto fora da caixa (ou durante o carregamento)
['dragover', 'drop'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));

dropzone.onclick = () => { if (!dropzone.disabled) fileInput.click(); };
dropzone.ondragover = e => { e.preventDefault(); if (!dropzone.disabled) dropzone.classList.add('hover'); };
dropzone.ondragleave = () => dropzone.classList.remove('hover');
dropzone.ondrop = e => {
  e.preventDefault();
  dropzone.classList.remove('hover');
  if (!dropzone.disabled && e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
};
fileInput.onchange = () => {
  if (fileInput.files.length) processFile(fileInput.files[0]);
  fileInput.value = '';
};
document.getElementById('again').onclick = () => {
  results.classList.remove('on');
  setUpload(true);
  window.scrollTo({ top: 0 });
};

function processFile(file) {
  if (busy) return;
  if (!/\.dem$/i.test(file.name)) {
    showError('O arquivo precisa ter a extensão .dem. Se estiver compactado (.zip, .bz2), extraia antes.');
    return;
  }
  busy = true;
  currentFile = file.name;
  errorBox.classList.remove('on');
  results.classList.remove('on');
  cards.innerHTML = '';
  setUpload(false);
  progressTitle.textContent = file.name;
  progress.classList.add('analyzing');
  badge.textContent = 'Analisando';
  renderRecent(file.name);
  startTimer();
  setProgress(0);
  progress.classList.add('on');
  worker.postMessage({ file: file });
}

function showSnack(msg, force) {
  if (!force && !settings.notify) return;
  snackbar.textContent = msg;
  snackbar.classList.add('on');
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => snackbar.classList.remove('on'), 3000);
}

function copyValue(text, btn) {
  const label = btn.dataset.label;
  navigator.clipboard.writeText(text).then(() => {
    const t = btn.querySelector('.t') || btn;
    t.textContent = 'Copiado'; btn.classList.add('done');
    showSnack('Copiado para a área de transferência');
    setTimeout(() => { t.textContent = label; btn.classList.remove('done'); }, 2000);
  }).catch(() => showSnack('Não foi possível copiar. Selecione o texto e copie manualmente.'));
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function rgba(c, mult) {
  return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + ((c[3] / 255) * (mult || 1)).toFixed(3) + ')';
}

function paintCrosshair(canvas, xh, size, zoom) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);
  const sh = crosshairShapes(xh);
  // Pequeno zoom para deixar a mira mais visível no card.
  const k = zoom || 1.2;
  ctx.translate(size / 2, size / 2);
  ctx.scale(k, k);
  const fill = rgba(xh.color), line = rgba(xh.outlineColor);
  if (sh.ring) {
    if (sh.outline) { ctx.strokeStyle = line; ctx.lineWidth = sh.ring.w + 2; ctx.beginPath(); ctx.arc(0, 0, sh.ring.r, 0, 6.2832); ctx.stroke(); }
    ctx.strokeStyle = fill; ctx.lineWidth = sh.ring.w; ctx.beginPath(); ctx.arc(0, 0, sh.ring.r, 0, 6.2832); ctx.stroke();
  }
  if (sh.outline) {
    ctx.fillStyle = line;
    sh.rects.forEach(r => ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2));
  }
  ctx.fillStyle = fill;
  sh.rects.forEach(r => ctx.fillRect(r.x, r.y, r.w, r.h));
}

let proSettings = {};
let proNames = {};
const proSettingsReady = fetch('pro-settings.json', { cache: 'no-cache' })
  .then(r => (r.ok ? r.json() : { players: {} }))
  .then(j => { proSettings = (j && j.players) || {}; proNames = (j && j.names) || {}; })
  .catch(() => {});

const MOUSE_FIELDS = [
  ['sensitivity', 'Sensitivity'],
  ['dpi', 'DPI'],
  ['edpi', 'eDPI'],
  ['zoom_sensitivity', 'Zoom Sensitivity'],
  ['hz', 'Hz'],
];

const VIDEO_FIELDS = [['resolution', 'Resolução'], ['screen_height', 'cl_crosshair_screen_height']];
const DEMO_RESOLUTIONS = {
  600: '800x600',
  720: '1280x720',
  768: '1024x768',
  800: '1280x800',
  864: '1152x864',
  900: '1600x900',
  960: '1280x960',
  1024: '1280x1024',
  1050: '1680x1050',
  1080: '1920x1080',
  1200: '1600x1200',
  1440: '2560x1440',
  2160: '3840x2160',
};

const PRO_LABELS = { zoom_sensitivity: 'Zoom' };
const KEYBOARD_FIELDS = [
  ['actuation', 'Actuation Point'],
  ['rapid_trigger', 'Rapid Trigger'],
  ['actuation_scope', 'Actuation em'],
  ['rapid_trigger_scope', 'Rapid Trigger em'],
  ['rapid_trigger_activate', 'RT ativação'],
  ['rapid_trigger_deactivate', 'RT desativação'],
];
const STAT_ICONS = { sensitivity: 'aim', dpi: 'speed', edpi: 'tune', zoom_sensitivity: 'search', hz: 'pulse', resolution: 'monitor', actuation: 'keyboard', rapid_trigger: 'zap', rapid_trigger_activate: 'zap', rapid_trigger_deactivate: 'zap' };

// Grade de informações (mouse / vídeo) com ícone ao lado do rótulo
function statTiles(info, fields, cls) {
  const dl = el('dl', 'pro-tiles' + (cls ? ' ' + cls : ''));
  fields.forEach(([key, label]) => {
    if (!info[key]) return;
    const it = el('div');
    const dt = el('dt');
    dt.append(icon(STAT_ICONS[key] || 'tune'), el('span', '', PRO_LABELS[key] || label));
    it.append(dt, el('dd', '', info[key]));
    dl.appendChild(it);
  });
  return dl;
}

function sectionTitle(iconName, text) {
  const h = el('h3');
  h.append(icon(iconName), document.createTextNode(text));
  return h;
}

let cardSeq = 0;
function safeEvidenceUrl(url) {
  try {
    const x = new URL(url);
    const hosts = ['twitch.tv', 'clips.twitch.tv', 'youtube.com', 'youtu.be', 'streamable.com', 'twitter.com', 'x.com', 'imgur.com', 'gyazo.com', 't.me', 'telegram.me', 'telegram.org', 'hltv.org', 'cybershoke.net', 'steamcommunity.com'];
    return x.protocol === 'https:' && hosts.some(h => x.hostname === h || x.hostname.endsWith('.' + h)) ? x.href : null;
  } catch (e) { return null; }
}

function renderPlayer(p) {
  const uid = ++cardSeq;
  const xh = p.crosshair_code ? decodeCrosshair(p.crosshair_code) : null;
  const screenHeight = xh && Number.isInteger(xh.screenHeight) && xh.screenHeight > 0 ? xh.screenHeight : null;
  const playerName = (p.name || 'jogador').trim();
  const proInfo = proSettings[String(p.steamid)] || proNames[normName(p.name)] || {};
  const mouse = proInfo;
  const keyboard = proInfo.keyboard || null;
  const keyboardCurrent = keyboard && keyboard.current;
  const hasKeyboard = !!(keyboardCurrent && (keyboardCurrent.actuation || keyboardCurrent.rapid_trigger || keyboardCurrent.rapid_trigger_disabled || (keyboardCurrent.groups && keyboardCurrent.groups.length)));
  // A resolução vem do cl_crosshair_screen_height (não é exibido): 960 -> 1280x960, 1080 -> 1920x1080...
  const videoInfo = screenHeight !== null
    ? { resolution: DEMO_RESOLUTIONS[screenHeight] || (mouse && mouse.resolution) || (screenHeight + 'p'), screen_height: String(screenHeight) }
    : (mouse && mouse.resolution ? { resolution: mouse.resolution } : null);
  const hasMouse = !!(mouse && MOUSE_FIELDS.some(([k]) => mouse[k]));
  const hasVideo = !!videoInfo;
  const hasCfg = !!p.steamid;
  const canFlip = hasMouse || hasVideo || hasKeyboard;

  const flip = el('article', 'flip');
  const inner = el('div', 'flip-inner');
  flip.appendChild(inner);

  const mkHead = (btn) => {
    const head = el('div', 'card-head');
    head.append(el('div', 'card-av', (p.name || '?').trim().charAt(0) || '?'), el('h3', 'card-title', p.name || 'Sem nome'));
    if (btn) head.appendChild(btn);
    return head;
  };

  // ---------- Frente: mira e viewmodel ----------
  const front = el('div', 'card face front');
  front.appendChild(mkHead());

  const defs = [['Mira', p.crosshair_code], ['Viewmodel', p.viewmodel_cmd]];
  const tabs = el('div', 'tabs');
  tabs.setAttribute('role', 'tablist');
  const panes = defs.map(([label, val], i) => {
    const pn = el('div', 'pane');
    pn.setAttribute('role', 'tabpanel');
    pn.id = 'pane-' + uid + '-' + i;
    pn.setAttribute('aria-labelledby', 'tab-' + uid + '-' + i);
    if (i === 0 && xh) {
      const m = el('div', 'card-media checker');
      const c = document.createElement('canvas');
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', 'Prévia da mira de ' + (p.name || 'jogador'));
      paintCrosshair(c, xh, 140);
      m.appendChild(c); pn.appendChild(m);
    }
    if (val) {
      const box = el('div', 'codebox');
      box.append(el('span', 'codelabel', i === 0 ? 'Código da mira' : 'Comandos do viewmodel'), el('pre', '', val));
      pn.appendChild(box);
      const pair = el('div', 'pair');
      const cb = el('button', 'btn');
      cb.append(icon('copy'), el('span', 't', 'Copiar'));
      cb.type = 'button'; cb.dataset.label = 'Copiar';
      cb.onclick = () => copyValue(val, cb);
      pair.append(cb); pn.appendChild(pair);
    } else {
      pn.appendChild(el('p', 'empty', 'Este jogador não tem ' + label.toLowerCase() + ' neste demo.'));
    }
    return pn;
  });
  const btns = defs.map(([label], i) => {
    const b = el('button', '', label);
    b.type = 'button'; b.setAttribute('role', 'tab');
    b.id = 'tab-' + uid + '-' + i;
    b.setAttribute('aria-controls', 'pane-' + uid + '-' + i);
    b.onclick = () => select(i);
    b.onkeydown = e => {
      const k = { ArrowRight: (i + 1) % btns.length, ArrowLeft: (i + btns.length - 1) % btns.length, Home: 0, End: btns.length - 1 }[e.key];
      if (k === undefined) return;
      e.preventDefault(); select(k); btns[k].focus();
    };
    tabs.appendChild(b);
    return b;
  });
  function select(k) { btns.forEach((b, i) => { b.setAttribute('aria-selected', String(i === k)); b.tabIndex = i === k ? 0 : -1; panes[i].hidden = i !== k; }); }
  select(p.crosshair_code ? 0 : 1);
  front.append(tabs, ...panes);

  // Rodapé: Mouse e Vídeo viram o card; CFG abre direto
  const actions = el('div', 'card-actions');
  const mkAct = (tag, ic, label) => {
    const a = el(tag, 'card-act');
    a.append(icon(ic), el('span', '', label));
    if (tag === 'button') a.type = 'button';
    actions.appendChild(a);
    return a;
  };
  const mouseAct = hasMouse ? mkAct('button', 'mouse', 'Mouse') : null;
  const videoAct = hasVideo ? mkAct('button', 'monitor', 'Vídeo') : null;
  const keyboardAct = hasKeyboard ? mkAct('button', 'keyboard', 'Teclado') : null;
  if (hasCfg) {
    const cfgLink = mkAct('a', 'download', 'CFG');
    cfgLink.href = 'https://cybershoke.net/api/api/v1/user/download/cfg/' + encodeURIComponent(String(p.steamid).trim());
    cfgLink.target = '_blank';
    cfgLink.rel = 'noopener noreferrer';
    cfgLink.setAttribute('aria-label', 'CFG de ' + playerName + ' do CyberShoke');
    cfgLink.title = 'Abre a CFG deste jogador no CyberShoke (envia o SteamID para o CyberShoke)';
  }
  if (actions.children.length) front.appendChild(actions);
  inner.appendChild(front);
  if (!canFlip) return flip;

  // ---------- Verso: mouse ou vídeo ----------
  const back = el('div', 'card face back');
  const toFrontBtn = el('button', 'flip-btn');
  toFrontBtn.type = 'button'; toFrontBtn.title = 'Voltar para a mira'; toFrontBtn.setAttribute('aria-label', 'Voltar para a mira');
  toFrontBtn.appendChild(icon('back'));
  back.appendChild(mkHead(toFrontBtn));
  const body = el('div', 'back-body');
  const secs = {};
  if (hasMouse) {
    secs.mouse = el('section', 'back-sec');
    secs.mouse.append(sectionTitle('mouse', 'Mouse'), statTiles(mouse, MOUSE_FIELDS, 'compact'));
    body.appendChild(secs.mouse);
  }
  if (hasVideo) {
    secs.video = el('section', 'back-sec');
    secs.video.append(
      sectionTitle('monitor', 'Vídeo'),
      statTiles(videoInfo, VIDEO_FIELDS, 'compact')
    );
    body.appendChild(secs.video);
  }
  if (hasKeyboard) {
    secs.keyboard = el('section', 'back-sec');
    const current = keyboardCurrent;
    const keyboardInfo = {
      actuation: current.actuation ? current.actuation + ' mm' : '',
      rapid_trigger: current.rapid_trigger ? current.rapid_trigger + ' mm' : (current.rapid_trigger_disabled ? 'Desativado' : ''),
      actuation_scope: current.actuation_scope || 'Não informado',
      rapid_trigger_scope: current.rapid_trigger_scope || 'Não informado',
      rapid_trigger_activate: current.rapid_trigger_activate ? current.rapid_trigger_activate + ' mm' : '',
      rapid_trigger_deactivate: current.rapid_trigger_deactivate ? current.rapid_trigger_deactivate + ' mm' : ''
    };
    secs.keyboard.append(sectionTitle('keyboard', 'Teclado'), statTiles(keyboardInfo, KEYBOARD_FIELDS, 'compact'));
    if (Array.isArray(current.groups) && current.groups.length > 1) {
      const groupText = current.groups.map(group => {
        const parts = [];
        if (group.actuation) parts.push('AP ' + group.actuation + ' mm');
        if (group.rapid_trigger) parts.push('RT ' + group.rapid_trigger + ' mm');
        else if (group.rapid_trigger_disabled) parts.push('RT desativado');
        return (group.label || 'Grupo') + ': ' + parts.join(' · ');
      }).join(' | ');
      if (groupText) secs.keyboard.appendChild(el('p', 'keyboard-note', groupText));
    }
    const sourceUrl = safeUrl(current.source_url, 'prosettings.net');
    if (sourceUrl) {
      const sourceLink = el('a', 'keyboard-source', 'Ver discussão no ProSettings');
      sourceLink.href = sourceUrl;
      sourceLink.target = '_blank';
      sourceLink.rel = 'noopener noreferrer';
      secs.keyboard.appendChild(sourceLink);
    }
    const evidenceUrl = safeEvidenceUrl(current.evidence_url || (current.evidence_urls || [])[0]);
    if (evidenceUrl) {
      const evidenceLink = el('a', 'keyboard-source', 'Abrir prova / referência');
      evidenceLink.href = evidenceUrl;
      evidenceLink.target = '_blank';
      evidenceLink.rel = 'noopener noreferrer';
      secs.keyboard.appendChild(evidenceLink);
    }
    if (keyboard.alternatives && keyboard.alternatives.length) {
      const altText = keyboard.alternatives.slice(0, 2).map(item => {
        const bits = [];
        if (item.actuation) bits.push('AP ' + item.actuation + ' mm' + (item.actuation_scope && item.actuation_scope !== 'Não informado' ? ' (' + item.actuation_scope + ')' : ''));
        if (item.rapid_trigger) bits.push('RT ' + item.rapid_trigger + ' mm' + (item.rapid_trigger_scope && item.rapid_trigger_scope !== 'Não informado' ? ' (' + item.rapid_trigger_scope + ')' : ''));
        else if (item.rapid_trigger_disabled) bits.push('RT desativado');
        if (item.rapid_trigger_activate || item.rapid_trigger_deactivate) bits.push('RT ativa ' + (item.rapid_trigger_activate || '—') + ' / desativa ' + (item.rapid_trigger_deactivate || '—') + ' mm');
        if (item.groups && item.groups.length > 1) bits.push('ajustes por grupos de teclas');
        if (item.date) bits.push(item.date);
        return bits.join(' · ');
      }).join(' | ');
      if (altText) secs.keyboard.appendChild(el('p', 'keyboard-note', 'Outros relatos: ' + altText));
    }
    body.appendChild(secs.keyboard);
  }
  back.appendChild(body);
  inner.appendChild(back);

  // O lado oculto não recebe foco nem aparece para leitores de tela
  function setFlipped(v) {
    flip.classList.toggle('flipped', v);
    front.inert = v; back.inert = !v;
    front.setAttribute('aria-hidden', String(v));
    back.setAttribute('aria-hidden', String(!v));
  }
  setFlipped(false);
  const open = (which, from) => () => {
    Object.keys(secs).forEach(k => { secs[k].hidden = k !== which; });
    setFlipped(true);
    toFrontBtn.focus({ preventScroll: true });
    toFrontBtn._from = from;
  };
  if (mouseAct) mouseAct.onclick = open('mouse', mouseAct);
  if (videoAct) videoAct.onclick = open('video', videoAct);
  if (keyboardAct) keyboardAct.onclick = open('keyboard', keyboardAct);
  toFrontBtn.onclick = () => { setFlipped(false); if (toFrontBtn._from) toFrontBtn._from.focus({ preventScroll: true }); };
  return flip;
}

async function showResults(data, o) {
  o = o || {};
  await proSettingsReady;
  if (!data.length) {
    showError('Nenhum jogador foi encontrado. Confirme que é um demo de CS2 (não de CS:GO).');
    return;
  }
  if (o.save) histAdd(o.title || 'demo.dem', data);
  const list = data;
  if (!list.length) {
    showError('Nenhum jogador tem dados neste demo.');
    return;
  }
  errorBox.classList.remove('on');
  setUpload(false);
  cards.innerHTML = '';
  resultCount.textContent = (o.title ? o.title + ' · ' : '') + list.length + (list.length === 1 ? ' jogador' : ' jogadores') + (o.example ? ' · exemplo ilustrativo, não é a mira de um jogador real' : '');
  list.forEach(p => cards.appendChild(renderPlayer(p)));
  results.classList.add('on');
  if (settings.autocopy && !o.example && list.length === 1 && list[0].crosshair_code) {
    navigator.clipboard.writeText(list[0].crosshair_code).then(() => showSnack('Mira copiada automaticamente')).catch(() => {});
  }
}

function showError(msg) {
  progress.classList.remove('on');
  setUpload(true);
  errorText.textContent = msg;
  errorBox.classList.add('on');
}

// ---------- Busca de jogador profissional ----------
const CFG_URL = id => 'https://cybershoke.net/api/api/v1/user/download/cfg/' + encodeURIComponent(String(id).trim());
let proIndex = null;

function normName(n) { return String(n || '').replace(/\s+/g, '').toLowerCase(); }

function buildIndex() {
  if (proIndex) return proIndex;
  const sidByUrl = {};
  Object.keys(proSettings).forEach(sid => { if (proSettings[sid].url) sidByUrl[proSettings[sid].url] = sid; });
  const map = new Map();
  Object.keys(proNames).forEach(k => {
    const e = proNames[k];
    map.set(k, { key: k, name: e.name || k, info: e, steamid: sidByUrl[e.url] || null });
  });
  // jogadores que so aparecem pelo SteamID
  Object.keys(proSettings).forEach(sid => {
    const e = proSettings[sid], k = normName(e.name);
    if (k && !map.has(k)) map.set(k, { key: k, name: e.name, info: e, steamid: sid });
  });
  Object.keys(csLinks).forEach(k => {
    if (!map.has(k)) map.set(k, { key: k, name: csLinks[k].name || k, info: null, steamid: null });
  });
  proIndex = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  return proIndex;
}

// FACEIT_NICKS (opcional): nick exato da FACEIT (minusculo -> nick), usado se o JSON de links nao tiver o jogador.
const FACEIT_NICKS = {};

function proLinks(p) {
  const k = normName(p.name), q = encodeURIComponent(p.name);
  const links = [];
  const fn = FACEIT_NICKS[k];
  links.push(fn
    ? ['FACEIT', 'https://www.faceit.com/en/players/' + encodeURIComponent(fn)]
    : ['FACEIT', 'https://duckduckgo.com/?q=' + encodeURIComponent('site:faceit.com/en/players ' + p.name)]);
  links.push(['HLTV', 'https://www.hltv.org/search?query=' + q]);
  return links;
}

// FACEIT/HLTV: coletados no GitHub Actions pelo CyberShoke (scripts/build_cybershoke_links.py).
// O navegador nao consegue consultar o CyberShoke direto (CORS), entao o site le o JSON pronto.
let csLinks = {};
const csLinksReady = fetch('cybershoke-links.json')
  .then(r => (r.ok ? r.json() : {}))
  .then(j => { csLinks = (j && j.links) || {}; })
  .catch(() => {});
function safeUrl(u, host) {
  try { const x = new URL(u); return x.protocol === 'https:' && (x.hostname === host || x.hostname.endsWith('.' + host)) ? x.href : null; } catch (e) { return null; }
}

// Miras dos profissionais (procrosshairs.com), coletadas a cada 2 dias: docs/crosshairs.json
let xhData = {};
const xhReady = fetch('crosshairs.json')
  .then(r => (r.ok ? r.json() : {}))
  .then(j => { xhData = (j && j.players) || {}; })
  .catch(() => {});
function findCrosshair(p) {
  if (p.steamid && xhData['id:' + p.steamid]) return xhData['id:' + p.steamid];
  return xhData[normName(p.name)] || null;
}

async function fetchProData(p) {
  await Promise.all([csLinksReady, xhReady]);
  const e = csLinks[normName(p.name)];
  const xh = findCrosshair(p);
  if (!e) return { err: 'ainda não coletei o perfil deste jogador (a coleta roda todo dia no GitHub)', xh: xh };
  const fu = e.faceit && safeUrl(e.faceit.url, 'faceit.com');
  const hu = e.hltv && safeUrl(e.hltv.url, 'hltv.org');
  return {
    faceit: fu ? { url: fu.replace('/ru/', '/en/'), level: e.faceit.skill_level, elo: e.faceit.elo } : null,
    hltv: hu ? { url: hu } : null,
    photo: e.hltv && safeUrl(e.hltv.photo, 'img-cdn.hltv.org'),
    xh: xh,
  };
}

function renderSearchCard(p, rank) {
  const card = el('article', 'pd');
  const nick = (p.name || '?').trim(), info = p.info || {};

  // Capa coral com o número do jogador e a foto (ou inicial) redonda saindo da faixa
  const cover = el('div', 'pd-cover');
  const num = el('span', 'pd-num', rank ? '#' + String(rank).padStart(3, '0') : '');
  const starWrap = el('span', 'pd-star'); starWrap.appendChild(starBtn(p));
  const closeBtn = el('button', 'pd-close'); closeBtn.type = 'button'; closeBtn.setAttribute('aria-label', 'Fechar painel do jogador'); closeBtn.title = 'Fechar'; closeBtn.textContent = '✕';
  closeBtn.onclick = () => dexDeselect();
  cover.append(starWrap, closeBtn, num);
  const av = el('div', 'pd-av', nick.charAt(0) || '?');
  const tag = el('p', 'pd-credit'); tag.hidden = true; // sem texto de crédito
  const name = el('h3', 'pd-name', nick);
  card.append(cover, av, name);
  if (p.custom) card.appendChild(el('p', 'pd-sub', 'Não listado'));
  else if (metaOf(p).team) card.appendChild(el('p', 'pd-sub', metaOf(p).team));

  // Links
  const links = el('div', 'pd-links');
  const linkEls = proLinks(p).slice().reverse().map(([label, href]) => {
    const a = el('a', 'pro-btn ' + label.toLowerCase());
    a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.append(el('span', '', label));
    links.appendChild(a);
    return a;
  });
  card.appendChild(links);

  // Linhas de informação (só o que existe para o jogador)
  const rows = el('dl', 'pd-rows');
  const hasAny = !!(info.resolution || info.edpi || info.sensitivity || info.dpi || (info.keyboard && info.keyboard.current));
  // Campos principais aparecem sempre; quando o dado não foi coletado, mostra "não informado" em vez de sumir
  const row = (k, v, always) => {
    if (!v && !(always && hasAny)) return;
    const r = el('div', v ? 'pd-row' : 'pd-row miss');
    r.append(el('dt', '', k), el('dd', '', v ? String(v) : 'não informado'));
    rows.appendChild(r);
  };
  row('Resolução', info.resolution, true);
  row('eDPI', info.edpi && Math.round(parseFloat(info.edpi)), true);
  row('Sensibilidade', info.sensitivity, true);
  row('DPI', info.dpi);
  row('Hz', info.hz);
  row('Zoom', info.zoom_sensitivity);
  // Teclado: actuation point e rapid trigger (relato mais atual)
  const kb = info.keyboard && info.keyboard.current;
  if (!kb) { row('Actuation', '', true); row('Rapid Trigger', '', true); }
  if (kb) {
    const sc = (type) => { const s = keyboardScope(kb, type); return s.keys.length ? s.keys.join('') : s.label === 'Escopo não informado' ? '' : s.label.toLowerCase(); };
    const fmt = (v, type) => v + ' mm' + (sc(type) ? ' · ' + sc(type) : '');
    row('Actuation', kb.actuation && fmt(kb.actuation, 'actuation'));
    row('Rapid Trigger', kb.rapid_trigger_disabled ? 'Desativado' : kb.rapid_trigger && fmt(kb.rapid_trigger, 'rapid_trigger'));
  }
  if (rows.children.length) card.appendChild(rows);
  else card.appendChild(el('p', 'pd-sub', 'Ainda não há configurações de mouse e vídeo coletadas para este jogador.'));

  const mira = el('div', 'pd-boxes');
  card.appendChild(mira);
  const vm = info.viewmodel;
  if (vm && vm.fov) {
    const box = el('section', 'pd-box'); box.style.order = '2';
    box.appendChild(el('h4', '', 'Viewmodel'));
    const prev = el('div', 'vm-prev');
    [['FOV', vm.fov], ['X', vm.offset_x], ['Y', vm.offset_y], ['Z', vm.offset_z]].forEach(([k, v]) => {
      if (v === undefined || v === '') return;
      const c = el('div', 'vm-cell'); c.append(el('small', '', k), el('b', '', String(v))); prev.appendChild(c);
    });
    box.appendChild(prev);
    const cmd = ['viewmodel_fov ' + vm.fov, 'viewmodel_offset_x ' + vm.offset_x, 'viewmodel_offset_y ' + vm.offset_y, 'viewmodel_offset_z ' + vm.offset_z]
      .filter(c => !/ (undefined|)$/.test(c)).join('; ') + ';';
    const cb = el('button', 'btn btn-outline', 'Copiar');
    cb.type = 'button'; cb.dataset.label = 'Copiar';
    cb.onclick = () => copyValue(cmd, cb);
    box.appendChild(cb);
    mira.appendChild(box);
  }
  const actions = el('div', 'pd-actions');
  card.appendChild(actions);

  if (p.steamid) {
    const cfg = el('a', 'btn btn-outline', 'Abrir CFG no CyberShoke');
    cfg.href = CFG_URL(p.steamid); cfg.target = '_blank'; cfg.rel = 'noopener noreferrer';
    cfg.title = 'Abre a CFG deste jogador no CyberShoke (envia o SteamID para o CyberShoke)';
    actions.appendChild(cfg);
  }

  fetchProData(p).then(d => {
    if (!d || !card.isConnected) return;
    const fEl = linkEls.find(a => a.classList.contains('faceit')), hEl = linkEls.find(a => a.classList.contains('hltv'));
    if (d.faceit) { fEl.href = d.faceit.url; fEl.title = [d.faceit.level ? 'nível ' + d.faceit.level : '', d.faceit.elo ? d.faceit.elo + ' elo' : ''].filter(Boolean).join(' · '); }
    if (d.hltv) hEl.href = d.hltv.url;
    if (d.xh && d.xh.code) {
      const xhd = decodeCrosshair(d.xh.code);
      if (xhd) {
        const box = el('section', 'pd-box'); box.style.order = '1';
        box.appendChild(el('h4', '', 'Mira'));
        const prev = el('div', 'xh-prev checker');
        const cv = document.createElement('canvas');
        cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Prévia da mira de ' + nick);
        paintCrosshair(cv, xhd, 150, 4);
        prev.appendChild(cv);
        box.append(prev);
        const cb = el('button', 'btn btn-outline', 'Copiar');
        cb.type = 'button'; cb.dataset.label = 'Copiar';
        cb.onclick = () => copyValue(d.xh.code, cb);
        box.appendChild(cb);
        if (d.xh.changed) {
          const when = new Date(d.xh.changed + 'T12:00:00').toLocaleDateString('pt-BR');
          box.appendChild(el('span', 'pd-sub', 'Mira trocada em ' + when));
        }
        mira.appendChild(box);
      }
    }
    if (d.photo) {
      // foto da HLTV no lugar da inicial; se nao carregar, a inicial continua
      const img = new Image();
      img.alt = 'Foto de ' + nick;
      img.referrerPolicy = 'no-referrer';
      img.onload = () => { av.textContent = ''; av.classList.add('has-photo'); av.appendChild(img); tag.hidden = false; };
      img.src = d.photo;
    }
  });
  return card;
}

function keyboardScope(setting, type) {
  const scope = String(setting[type + '_scope'] || '').trim();
  let keys = Array.isArray(setting[type + '_keys']) ? setting[type + '_keys'].slice() : [];
  if (!keys.length && /^wasd$/i.test(scope)) keys = ['W', 'A', 'S', 'D'];
  if (/demais teclas|other keys|other buttons|remaining keys|rest of keys/i.test(scope)) return { label: 'Demais teclas', keys: [] };
  if (/todas as teclas|all keys|every key/i.test(scope)) return { label: 'Todas as teclas', keys: [] };
  if (keys.length || /teclas específicas|specific keys/i.test(scope) || /^wasd$/i.test(scope)) {
    return { label: 'Teclas específicas', keys: keys };
  }
  return { label: 'Escopo não informado', keys: [] };
}

function appendKeyboardSetting(grid, label, value, type, setting) {
  const disabled = type === 'rapid_trigger' && !!setting.rapid_trigger_disabled;
  if (!value && !disabled) return;
  const num = Number(String(value || '').replace(',', '.'));
  const pct = Number.isFinite(num) ? Math.max(5, Math.min(95, num / 4 * 100)) : 25;
  const scope = keyboardScope(setting, type);
  const card = el('section', 'keyboard-setting');

  if (!disabled && Number.isFinite(num)) {
    const trackWrap = el('div', 'keyboard-slider-wrap');
    const track = el('div', 'keyboard-slider');
    const fill = el('div', 'keyboard-slider-fill');
    const thumb = el('div', 'keyboard-slider-thumb');
    track.style.setProperty('--position', pct + '%');
    track.style.setProperty('--fill', pct + '%');
    track.append(fill, thumb);
    trackWrap.appendChild(track);
    card.appendChild(trackWrap);
  }

  const info = el('div', 'keyboard-setting-info');
  info.append(
    el('span', 'keyboard-setting-label', label),
    el('div', 'keyboard-setting-value', disabled ? 'Desativado' : value + ' mm')
  );
  if (type === 'rapid_trigger' && (setting.rapid_trigger_activate || setting.rapid_trigger_deactivate)) {
    const activate = setting.rapid_trigger_activate;
    const deactivate = setting.rapid_trigger_deactivate;
    const detail = activate && deactivate && activate === deactivate
      ? 'Ativação/desativação: ' + activate + ' mm'
      : [activate ? 'Ativação: ' + activate + ' mm' : '', deactivate ? 'Desativação: ' + deactivate + ' mm' : ''].filter(Boolean).join(' · ');
    info.appendChild(el('p', 'keyboard-note', detail));
  }
  if (scope.label !== 'Escopo não informado') info.appendChild(el('span', 'keyboard-scope-chip', scope.label));
  if (scope.keys.length) {
    const keys = el('div', 'keyboard-keys');
    scope.keys.forEach(k => keys.appendChild(el('span', 'keyboard-key', k)));
    info.appendChild(keys);
  }
  card.appendChild(info);
  grid.appendChild(card);
}

function keyboardSourceLink(label, url, safe) {
  if (!safe) return null;
  const a = el('a');
  a.href = safe;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.append(icon('ext'), document.createTextNode(label));
  return a;
}

function renderKeyboardProfile(p) {
  const keyboard = p.info && p.info.keyboard;
  const current = keyboard && keyboard.current;
  if (!current || (!current.actuation && !current.rapid_trigger && !current.rapid_trigger_disabled && !(current.groups && current.groups.length))) {
    const empty = el('div', 'keyboard-empty');
    empty.append(
      el('strong', '', p.name + ' — sem configuração de teclado encontrada'),
      document.createTextNode('Ainda não encontramos um relato identificável de Actuation Point ou Rapid Trigger para este jogador. Isso não significa que ele não use esses recursos.')
    );
    const profileUrl = safeUrl(p.info && p.info.url, 'prosettings.net');
    const source = keyboardSourceLink('Ver perfil e comentários no ProSettings', profileUrl, profileUrl);
    if (source) empty.appendChild(source);
    return empty;
  }

  const card = el('article', 'keyboard-profile');
  const head = el('header', 'keyboard-profile-head');
  head.appendChild(el('div', 'keyboard-profile-avatar', (p.name || '?').charAt(0)));
  const main = el('div', 'keyboard-profile-main');
  main.append(el('h3', 'keyboard-profile-name', p.name), el('p', 'keyboard-profile-sub', 'Configurações encontradas nos comentários do ProSettings'));
  head.appendChild(main);

  const links = el('div', 'keyboard-profile-links');
  const profileUrl = safeUrl(current.source_url || p.info.url, 'prosettings.net');
  const source = keyboardSourceLink('Ver comentário', profileUrl, profileUrl);
  if (source) links.appendChild(source);
  const clipUrl = safeEvidenceUrl(current.evidence_url || (current.evidence_urls || [])[0]);
  const clip = keyboardSourceLink('Abrir evidência', clipUrl, clipUrl);
  if (clip) links.appendChild(clip);
  if (links.childNodes.length) head.appendChild(links);
  card.appendChild(head);
  card.appendChild(el('div', 'keyboard-divider'));

  const grid = el('div', 'keyboard-settings');
  appendKeyboardSetting(grid, 'Actuation Point', current.actuation, 'actuation', current);
  appendKeyboardSetting(grid, 'Rapid Trigger', current.rapid_trigger, 'rapid_trigger', current);
  card.appendChild(grid);

  if (Array.isArray(current.groups) && current.groups.length > 1) {
    const details = el('details', 'keyboard-history');
    details.appendChild(el('summary', '', 'Ver ajustes por grupo de teclas'));
    const list = el('ul', 'keyboard-history-list');
    current.groups.forEach(group => {
      const li = el('li');
      const bits = [];
      if (group.actuation) bits.push('Actuation ' + group.actuation + ' mm');
      if (group.rapid_trigger) bits.push('Rapid Trigger ' + group.rapid_trigger + ' mm');
      else if (group.rapid_trigger_disabled) bits.push('Rapid Trigger desativado');
      if (group.rapid_trigger_activate || group.rapid_trigger_deactivate) {
        if (group.rapid_trigger_activate && group.rapid_trigger_deactivate && group.rapid_trigger_activate === group.rapid_trigger_deactivate) {
          bits.push('Ativação/desativação ' + group.rapid_trigger_activate + ' mm');
        } else {
          if (group.rapid_trigger_activate) bits.push('Ativação ' + group.rapid_trigger_activate + ' mm');
          if (group.rapid_trigger_deactivate) bits.push('Desativação ' + group.rapid_trigger_deactivate + ' mm');
        }
      }
      li.append(el('b', '', group.label || 'Grupo de teclas'), document.createTextNode(' — ' + bits.join(' · ')));
      list.appendChild(li);
    });
    details.appendChild(list);
    card.appendChild(details);
  }


  if (keyboard.alternatives && keyboard.alternatives.length) {
    const details = el('details', 'keyboard-history');
    details.appendChild(el('summary', '', 'Ver relatos anteriores ou configurações divergentes'));
    const list = el('ul', 'keyboard-history-list');
    keyboard.alternatives.forEach(alt => {
      const li = el('li');
      const bits = [];
      if (alt.actuation) bits.push('Actuation ' + alt.actuation + ' mm');
      if (alt.rapid_trigger) bits.push('Rapid Trigger ' + alt.rapid_trigger + ' mm');
      else if (alt.rapid_trigger_disabled) bits.push('Rapid Trigger desativado');
      if (alt.rapid_trigger_activate || alt.rapid_trigger_deactivate) {
        bits.push('Ativação ' + (alt.rapid_trigger_activate || '—') + ' mm · Desativação ' + (alt.rapid_trigger_deactivate || '—') + ' mm');
      }
      if (alt.groups && alt.groups.length > 1) bits.push('Ajustes por grupos de teclas');
      const actScope = keyboardScope(alt, 'actuation');
      const rtScope = keyboardScope(alt, 'rapid_trigger');
      const scopeText = [];
      const scopeBit = (name, sc) => { const t = sc.keys.length ? sc.keys.join(' ') : (sc.label === 'Escopo não informado' ? '' : sc.label); return t ? name + ': ' + t : name; };
      if (alt.actuation) scopeText.push(scopeBit('Actuation', actScope));
      if (alt.rapid_trigger || alt.rapid_trigger_disabled) scopeText.push(scopeBit('RT', rtScope));
      li.append(el('b', '', bits.join(' · ')), document.createTextNode(' — ' + scopeText.join(' · ') + (alt.date ? ' · ' + alt.date : '')));
      if (alt.source_url) {
        const altUrl = safeUrl(alt.source_url, 'prosettings.net');
        if (altUrl) {
          const link = el('a', 'keyboard-source', 'Abrir relato');
          link.href = altUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
          li.appendChild(document.createTextNode(' · '));
          li.appendChild(link);
        }
      }
      list.appendChild(li);
    });
    details.appendChild(list);
    card.appendChild(details);
  }
  return card;
}

// "Analisar Demo" sempre volta para a tela de envio
function goHome() {
  if (busy) return;
  results.classList.remove('on');
  errorBox.classList.remove('on');
  setUpload(true);
}
document.querySelectorAll('.side a[data-page="demo"]').forEach(a => a.addEventListener('click', () => { demoTab('demo'); goHome(); }));

// ---------- SetupDex: catálogo de jogadores, favoritos e abas da demo ----------
const dexSearch = document.getElementById('dexSearch'), dexClear = document.getElementById('dexClear');
const dexGrid = document.getElementById('dexGrid'), dexPages = document.getElementById('dexPages'), dexCount = document.getElementById('dexCount');
const dexSort = document.getElementById('dexSort'), dexChips = document.getElementById('dexChips');
const detail = document.getElementById('searchResult'), favGrid = document.getElementById('favGrid');
// A faixa coral que fica ao lado da barra de rolagem acompanha a rolagem do painel (ver --st no CSS)
detail.addEventListener('scroll', () => detail.style.setProperty('--st', detail.scrollTop + 'px'), { passive: true });
const DEX_PER = 12;
const dex = { team: '', q: '', filter: 'all', sort: 'full', page: 1, list: [], sel: null, none: true, ready: false };

function favKeys() { return LS.get('favorites', []); }
function isFav(k) { return favKeys().includes(k); }
function toggleFav(k) {
  const f = favKeys();
  LS.set('favorites', f.includes(k) ? f.filter(x => x !== k) : f.concat([k]));
  refreshStars();
  paintFav();
  if (dex.filter === 'fav') dexRender();
}
function paintStar(b) {
  const on = isFav(b.dataset.fav);
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', (on ? 'Remover ' : 'Adicionar ') + b.dataset.name + (on ? ' dos favoritos' : ' aos favoritos'));
  b.replaceChildren(icon(on ? 'star' : 'staro'));
}
function refreshStars() { document.querySelectorAll('.star[data-fav]').forEach(paintStar); }
function starBtn(p) {
  const b = el('button', 'star'); b.type = 'button';
  b.dataset.fav = p.key; b.dataset.name = p.name;
  paintStar(b);
  b.onclick = e => { e.stopPropagation(); toggleFav(p.key); };
  return b;
}

// Tem relato de actuation point / rapid trigger?
function kbCurrent(p) {
  const c = p.info && p.info.keyboard && p.info.keyboard.current;
  return c && (c.actuation || c.rapid_trigger || c.rapid_trigger_disabled || (c.groups && c.groups.length)) ? c : null;
}
// "Mais completos": quanto mais dados do jogador, mais no topo
function dexScore(p) {
  if (p._s == null) {
    const l = csLinks[p.key];
    p._s = (findCrosshair(p) ? 4 : 0) + (kbCurrent(p) ? 3 : 0) + (p.info && (p.info.sensitivity || p.info.dpi) ? 2 : 0) +
      (p.steamid ? 1 : 0) + (l && l.hltv && l.hltv.photo ? 1 : 0) + (l && l.faceit ? 1 : 0);
  }
  return p._s;
}
// Top 20 e times (coletados do ProSettings por scripts/build_pro_meta.py)
let proMeta = { top: [], players: [] };
const proMetaReady = fetch('pro-meta.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { if (j) proMeta = j; }).catch(() => {});
let metaMaps = null;
function metaOf(p) {
  if (!metaMaps) {
    metaMaps = { team: new Map(), top: new Map() };
    (proMeta.players || []).forEach(e => { if (e.team) { metaMaps.team.set('s:' + e.slug, e.team); metaMaps.team.set('n:' + normName(e.nick), e.team); } });
    (proMeta.top || []).forEach((e, i) => { metaMaps.top.set('s:' + e.slug, i + 1); metaMaps.top.set('n:' + normName(e.nick), i + 1); });
  }
  if (p._m === undefined) {
    const m = /\/players\/([^/#?]+)/.exec((p.info && p.info.url) || ''), slug = m ? m[1].toLowerCase() : '';
    const pick = mp => (slug && mp.get('s:' + slug)) || mp.get('n:' + p.key) || null;
    p._m = { team: pick(metaMaps.team), top: pick(metaMaps.top) };
  }
  return p._m;
}
// Top 20 do HLTV (ranking oficial de 2025, o mais recente publicado; o de 2026 sai em dezembro)
const HLTV_TOP20 = ['ZywOo', 'donk', 'ropz', 'm0NESY', 'sh1ro', 'molodoy', 'flameZ', 'frozen', 'KSCERATO', 'Spinx', 'Twistzz', 'mezii', 'Senzu', 'XANTARES', 'YEKINDAR', 'xertioN', 'torzsi', 'NiKo', 'iM', 'b1t'];
const hltvRank = new Map(HLTV_TOP20.map((n, i) => [normName(n), i + 1]));
// Número do card = lugar do jogador no ranking da HLTV (0 = fora do Top 20, sem número)
function dexNum(p) { return hltvRank.get(p.key) || 0; }
function dexPass(p) {
  if (dex.filter === 'top') return hltvRank.has(p.key);
  if (dex.filter === 'fav') return isFav(p.key);
  if (dex.filter === 'times') return dex.team ? metaOf(p).team === dex.team : !!metaOf(p).team;
  return true;
}

function dexAvatar(p) {
  const av = el('div', 'dcard-av', (p.name || '?').charAt(0));
  const l = csLinks[p.key], ph = l && l.hltv && safeUrl(l.hltv.photo, 'img-cdn.hltv.org');
  if (ph) {
    // foto da HLTV no lugar da inicial; se nao carregar, a inicial continua
    const img = new Image();
    img.alt = ''; img.referrerPolicy = 'no-referrer';
    img.onload = () => { av.textContent = ''; av.classList.add('has-photo'); av.appendChild(img); };
    img.src = ph;
  }
  return av;
}

function dexCard(p, rank, onOpen) {
  const card = el('article', 'dcard' + (dex.sel && dex.sel.key === p.key ? ' sel' : ''));
  card.dataset.key = p.key;
  const top = el('div', 'dcard-top');
  const podium = rank >= 1 && rank <= 3;
  if (podium) card.classList.add('podium', 'p' + rank);
  top.append(podium ? el('span', 'dcard-num medal m' + rank, rank + 'º') : el('span', 'dcard-num', rank ? '#' + String(rank).padStart(3, '0') : ''), starBtn(p));
  const ed = p.info && parseFloat(p.info.edpi);
  const team = metaOf(p).team;
  const sub = team || (p.info && p.info.resolution) || 'Ver perfil';
  const open = el('button', 'dcard-open'); open.type = 'button';
  open.append(dexAvatar(p), el('span', 'dcard-name', p.name), el('span', 'dcard-sub', sub));
  open.onclick = onOpen;
  const tags = el('div', 'dcard-tags');
  if (findCrosshair(p)) tags.appendChild(el('span', 'dtag', 'Mira'));
  if (kbCurrent(p)) tags.appendChild(el('span', 'dtag kb', 'Teclado'));
  card.append(top, open, tags);
  return card;
}

function dexEmptyPanel() {
  const w = el('div', 'dex-hello');
  const ic = el('div', 'dh-ic'); ic.innerHTML = '<svg viewBox="0 0 64 64" width="34" height="34" fill="none" stroke="#1B1B1B" stroke-width="5" stroke-linecap="round" aria-hidden="true"><circle cx="32" cy="32" r="17"/><path d="M32 3v14M32 47v14M3 32h14M47 32h14"/><circle cx="32" cy="32" r="3.5" fill="#1B1B1B"/></svg>';
  const tips = el('div', 'dh-tips');
  ['Copie a mira com um clique', 'Veja mouse, vídeo e teclado', 'Marque a estrela para favoritar'].forEach((t, i) => { const s = el('span'); s.append(el('b', '', String(i + 1)), document.createTextNode(t)); tips.appendChild(s); });
  w.append(ic, el('h3', '', 'Escolha um jogador'), el('p', '', 'Clique em um card para ver o setup completo.'), tips);
  return w;
}

// Clicar de novo no card selecionado (ou no X do painel) tira a seleção
function dexPick(p) { if (dex.sel && dex.sel.key === p.key) dexDeselect(); else dexSelect(p, true); }
function dexDeselect() {
  dex.sel = null; dex.none = true;
  dexGrid.querySelectorAll('.dcard.sel').forEach(c => c.classList.remove('sel'));
  detail.replaceChildren(dexEmptyPanel());
}

function dexSelect(p, byUser) {
  dex.sel = p; dex.none = false;
  detail.style.setProperty('--st', '0px');
  dexGrid.querySelectorAll('.dcard').forEach(c => c.classList.toggle('sel', c.dataset.key === p.key));
  detail.innerHTML = '';
  const rank = dexNum(p);
  detail.append(renderSearchCard(p, rank));
  if (kbCurrent(p)) detail.appendChild(renderKeyboardProfile(p));
  detail.scrollTop = 0;
  if (byUser && matchMedia('(max-width: 1300px)').matches) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Rolagem infinita: o fim da lista (dexPages) é observado e, ao chegar perto, entram mais DEX_PER cards.
function dexMore() {
  const have = dexGrid.querySelectorAll('.dcard').length;
  const end = Math.min(dex.list.length, have + DEX_PER);
  for (let i = have; i < end; i++) { const p = dex.list[i]; dexGrid.appendChild(dexCard(p, dexNum(p), () => dexPick(p))); }
  dex.shown = end;
  dexPaintEnd();
}
function dexPaintEnd() {
  dexPages.innerHTML = '';
  const left = dex.list.length - dex.shown;
  if (left <= 0) { if (dex.list.length > DEX_PER) dexPages.appendChild(el('span', 'gap', 'Fim da lista')); return; }
  if (dexIO) { dexPages.appendChild(el('span', 'gap', 'Carregando mais…')); dexIO.unobserve(dexPages); dexIO.observe(dexPages); return; }
  const b = el('button', '', 'Mostrar mais (' + left.toLocaleString('pt-BR') + ')'); b.type = 'button'; b.onclick = dexMore;
  dexPages.appendChild(b);
}
const dexIO = 'IntersectionObserver' in window
  ? new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && dex.ready && dex.shown < dex.list.length) dexMore(); }, { rootMargin: '700px 0px' })
  : null;

function dexRender() {
  if (!dex.ready) return;
  const q = normName(dex.q);
  const list = buildIndex().filter(p => (!q || p.key.includes(q)) && dexPass(p));
  list.sort((a, b) => {
    if (q) { const d = (b.key.startsWith(q) ? 1 : 0) - (a.key.startsWith(q) ? 1 : 0); if (d) return d; }
    if (dex.filter === 'top' || dex.sort === 'full') { const d = (hltvRank.get(a.key) || 1e9) - (hltvRank.get(b.key) || 1e9); if (d) return d; }
    if (dex.filter === 'times' && !dex.team) { const d = metaOf(a).team.localeCompare(metaOf(b).team); if (d) return d; }
    if (dex.sort === 'full') { const d = dexScore(b) - dexScore(a); if (d) return d; }
    return a.name.localeCompare(b.name);
  });
  dex.list = list;
  const countLabel = { top: 'Top 20 HLTV (', fav: 'Favoritos (', times: 'Times (' }[dex.filter] || 'Jogadores encontrados (';
  dexCount.textContent = countLabel + list.length.toLocaleString('pt-BR') + ')';
  dexGrid.innerHTML = '';
  // dex.page === 1 => lista nova (busca/filtro/ordem mudou): volta ao primeiro lote; senão mantém o que já foi carregado
  const reset = dex.page === 1;
  const keep = reset ? DEX_PER : Math.max(dex.shown || 0, DEX_PER);
  if (reset && window.scrollY > 0) window.scrollTo({ top: 0 });
  dex.page = 0; dex.shown = 0;
  const first = Math.min(list.length, keep);
  list.slice(0, first).forEach((p, i) => dexGrid.appendChild(dexCard(p, dexNum(p), () => dexPick(p))));
  dex.shown = first;
  dexPaintEnd();
  if (!list.length) {
    dex.sel = null;
    dexGrid.appendChild(el('p', 'dex-empty', dex.filter === 'fav' && !dex.q ? 'Nenhum favorito ainda. Toque na estrela de um jogador para guardá-lo aqui.' : 'Nenhum jogador encontrado. Confira a grafia do nick.'));
    detail.replaceChildren(dexEmptyPanel());
  } else if (dex.sel && !list.some(x => x.key === dex.sel.key)) {
    dexDeselect();
  } else if (!dex.sel) {
    detail.replaceChildren(dexEmptyPanel());
  }
}

// Favoritos (aba dentro de "Analisar Demo")
function paintFav() {
  if (!dex.ready) return;
  favGrid.innerHTML = '';
  const idx = buildIndex(), l = favKeys().map(k => idx.find(p => p.key === k)).filter(Boolean);
  if (!l.length) { favGrid.appendChild(el('p', 'dex-empty', 'Nenhum favorito ainda. Toque na estrela de um jogador no SetupDex para guardá-lo aqui.')); return; }
  l.forEach((p, i) => favGrid.appendChild(dexCard(p, dexNum(p), () => { location.hash = '#/inicio'; dexSelect(p, true); })));
}
function demoTab(t) {
  document.querySelectorAll('[data-dtab]').forEach(b => b.classList.toggle('on', b.dataset.dtab === t));
  document.querySelectorAll('[data-dpane]').forEach(x => { x.hidden = x.dataset.dpane !== t; });
  if (t === 'hist') renderHistory();
  if (t === 'fav') paintFav();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-dtab],[data-tab]'); if (b) demoTab(b.dataset.dtab || b.dataset.tab); });

const DEX_CHIPS = [['all', 'Todos'], ['top', 'Top 20'], ['times', 'Times'], ['fav', 'Favoritos']];
function paintChips() {
  dexChips.innerHTML = '';
  DEX_CHIPS.forEach(([k, label]) => {
    const b = el('button', 'chip', label); b.type = 'button';
    b.setAttribute('aria-pressed', String(dex.filter === k));
    b.onclick = () => { dex.filter = k; dex.page = 1; paintChips(); paintTeams(); dexRender(); };
    dexChips.appendChild(b);
  });
}
function paintTeams() {
  const wrap = document.getElementById('dexTeamWrap'), sel = document.getElementById('dexTeam');
  wrap.hidden = dex.filter !== 'times';
  if (wrap.hidden || sel.options.length) return;
  const counts = {};
  (proMeta.players || []).forEach(e => { if (e.team) counts[e.team] = (counts[e.team] || 0) + 1; });
  sel.appendChild(new Option('Todos os times', ''));
  Object.keys(counts).sort((a, b) => a.localeCompare(b)).forEach(tm => sel.appendChild(new Option(tm + ' (' + counts[tm] + ')', tm)));
  sel.onchange = () => { dex.team = sel.value; dex.page = 1; dexRender(); };
}
paintChips();
dexSearch.addEventListener('input', () => { dex.q = dexSearch.value; dex.page = 1; dexClear.hidden = !dexSearch.value; dexRender(); });
dexSearch.addEventListener('keydown', e => { if (e.key === 'Escape' && dexSearch.value) dexClear.click(); });
dexClear.onclick = () => { dexSearch.value = ''; dex.q = ''; dex.page = 1; dexClear.hidden = true; dexRender(); dexSearch.focus(); };
dexSort.onchange = () => { dex.sort = dexSort.value; dex.page = 1; dexRender(); };
Promise.all([proSettingsReady, csLinksReady, xhReady, proMetaReady]).then(() => { dex.ready = true; dexRender(); paintFav(); });

route();
startWorker();
