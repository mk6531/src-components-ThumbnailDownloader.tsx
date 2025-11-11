// State
const state = {
  files: [],
  quality: 80,
  maxWidth: null,
  maxHeight: null,
  stats: { totalFiles: 0, originalSize: 0, webpSize: 0 }
};

// DOM
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const filesContainer = document.getElementById('filesContainer');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const maxWidthInput = document.getElementById('maxWidth');
const maxHeightInput = document.getElementById('maxHeight');

const convertAllBtn = document.getElementById('convertAllBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

const statFiles = document.getElementById('statFiles');
const statOriginal = document.getElementById('statOriginal');
const statWebp = document.getElementById('statWebp');
const statSaved = document.getElementById('statSaved');

// Upload
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('keypress', e => {
  if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});
uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => handleFiles(e.target.files));

// Settings
qualitySlider.addEventListener('input', e => {
  const v = parseInt(e.target.value || '80', 10);
  state.quality = Math.min(100, Math.max(1, v));
  qualityValue.textContent = state.quality;
});
maxWidthInput.addEventListener('input', e => {
  const n = parseInt(e.target.value || '', 10);
  state.maxWidth = Number.isFinite(n) && n > 0 ? n : null;
});
maxHeightInput.addEventListener('input', e => {
  const n = parseInt(e.target.value || '', 10);
  state.maxHeight = Number.isFinite(n) && n > 0 ? n : null;
});

// Bulk
convertAllBtn.addEventListener('click', convertAllFiles);
downloadAllBtn.addEventListener('click', downloadAllFiles);
clearAllBtn.addEventListener('click', clearAllFiles);

// FAQ
document.querySelectorAll('.faq-question').forEach(el => {
  el.addEventListener('click', toggleFAQ);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleFAQ({ currentTarget: el });
    }
  });
});

function toggleFAQ(e) {
  const item = e.currentTarget.closest('.faq-item');
  const was = item.classList.contains('active');
  document.querySelectorAll('.faq-item').forEach(i => {
    i.classList.remove('active');
    const q = i.querySelector('.faq-question');
    if (q) q.setAttribute('aria-expanded', 'false');
  });
  if (!was) {
    item.classList.add('active');
    e.currentTarget.setAttribute('aria-expanded', 'true');
  }
}

// Files
function handleFiles(fileList) {
  const imgs = Array.from(fileList).filter(f => f.type.startsWith('image/'));
  if (!imgs.length) { alert('Please select valid image files.'); return; }

  imgs.forEach(file => {
    const id = Date.now() + Math.random();
    const rec = { id, file, name: file.name, size: file.size, converted: false, webpBlob: null, webpSize: 0 };
    state.files.push(rec);
    renderFileCard(rec);
  });
  updateStats();
  updateButtons();
}

function renderFileCard(f) {
  const el = document.createElement('div');
  el.className = 'file-card';
  el.id = `file-${f.id}`;
  el.innerHTML = `
    <div class="file-header">
      <div>
        <div class="file-name">${escapeHtml(f.name)}</div>
        <div class="file-size">Original: ${formatBytes(f.size)}</div>
      </div>
      <div class="file-size" id="webp-size-${f.id}">WebP: --</div>
    </div>
    <div class="file-progress"><div class="progress-bar" id="progress-${f.id}"></div></div>
    <div class="file-actions">
      <button class="btn btn-primary btn-small" id="convert-${f.id}">Convert</button>
      <button class="btn btn-secondary btn-small" id="download-${f.id}" disabled>Download</button>
      <button class="btn btn-secondary btn-small" id="remove-${f.id}">Remove</button>
    </div>
  `;
  filesContainer.appendChild(el);
  document.getElementById(`convert-${f.id}`).addEventListener('click', () => convertFile(f.id));
  document.getElementById(`download-${f.id}`).addEventListener('click', () => downloadFile(f.id));
  document.getElementById(`remove-${f.id}`).addEventListener('click', () => removeFile(f.id));
}

// Convert
async function convertFile(id) {
  const f = state.files.find(x => x.id === id);
  if (!f) return;

  const btn = document.getElementById(`convert-${id}`);
  const dl = document.getElementById(`download-${id}`);
  const bar = document.getElementById(`progress-${id}`);
  const sizeEl = document.getElementById(`webp-size-${id}`);

  btn.disabled = true; btn.textContent = 'Converting…'; setBar(bar, 15);

  try {
    const img = await loadImage(f.file); setBar(bar, 45);

    let { width, height } = img;
    if (state.maxWidth || state.maxHeight) {
      const ratio = width / height;
      if (state.maxWidth && width > state.maxWidth) { width = state.maxWidth; height = Math.round(width / ratio); }
      if (state.maxHeight && height > state.maxHeight) { height = state.maxHeight; width = Math.round(height * ratio); }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const q = Math.min(1, Math.max(0.01, state.quality / 100));
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', q)); // may be null on failure

    if (!blob) {
      btn.textContent = 'Error';
      alert('Conversion failed (WebP not supported or canvas blocked). Try a different image or browser.');
      btn.disabled = false;
      setBar(bar, 0);
      return;
    }

    setBar(bar, 100);

    f.converted = true;
    f.webpBlob = blob;
    f.webpSize = blob.size;

    sizeEl.textContent = `WebP: ${formatBytes(f.webpSize)} (${calculateSavings(f.size, f.webpSize)}% saved)`;
    btn.textContent = 'Converted ✓';
    dl.disabled = false;

    updateStats();
    updateButtons();
  } catch (e) {
    console.error(e);
    btn.textContent = 'Error';
    alert('Conversion error. Please try again.');
    btn.disabled = false;
    setBar(bar, 0);
  }
}

async function convertAllFiles() {
  for (const f of state.files) {
    if (!f.converted) { // eslint-disable-next-line no-await-in-loop
      await convertFile(f.id);
    }
  }
}

// Download
function downloadFile(id) {
  const f = state.files.find(x => x.id === id);
  if (!f || !f.webpBlob) return;

  const a = document.createElement('a');
  const url = URL.createObjectURL(f.webpBlob);
  a.href = url;
  a.download = (f.name.replace(/.[^/.]+$/, '') || 'image') + '.webp';
  // Click without appending to DOM is fine in modern browsers
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadAllFiles() {
  const list = state.files.filter(f => f.converted && f.webpBlob);
  list.forEach((f, i) => setTimeout(() => downloadFile(f.id), i * 220));
}

// Remove / Clear
function removeFile(id) {
  const idx = state.files.findIndex(x => x.id === id);
  if (idx === -1) return;
  state.files.splice(idx, 1);
  const el = document.getElementById(`file-${id}`);
  if (el) el.remove();
  updateStats();
  updateButtons();
}
function clearAllFiles() {
  if (!confirm('Clear all files?')) return;
  state.files = [];
  filesContainer.innerHTML = '';
  updateStats();
  updateButtons();
}

// UI helpers
function setBar(el, p){ if (el) el.style.width = `${p}%`; }
function updateStats(){
  state.stats.totalFiles = state.files.length;
  state.stats.originalSize = state.files.reduce((s,f)=>s+f.size,0);
  state.stats.webpSize = state.files.reduce((s,f)=>s+(f.webpSize||0),0);
  statFiles.textContent = state.stats.totalFiles;
  statOriginal.textContent = formatBytes(state.stats.originalSize);
  statWebp.textContent = formatBytes(state.stats.webpSize);
  statSaved.textContent = `${calculateSavings(state.stats.originalSize, state.stats.webpSize)}%`;
}
function updateButtons(){
  const has = state.files.length>0;
  const anyUn = state.files.some(f=>!f.converted);
  const anyConv = state.files.some(f=>f.converted && f.webpBlob);
  convertAllBtn.disabled = !anyUn;
  downloadAllBtn.disabled = !anyConv;
  clearAllBtn.disabled = !has;
}

// Utils
function loadImage(file){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
function formatBytes(bytes){
  if (!bytes) return '0 KB';
  const u = ['Bytes','KB','MB','GB']; const i = Math.floor(Math.log(bytes)/Math.log(1024));
  return `${(bytes/1024**i).toFixed(2)} ${u[i]}`;
}
function calculateSavings(orig, comp){
  if (!orig || orig<=0) return 0;
  return Math.max(0, Math.round(((orig - comp)/orig)*100));
}
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const href = a.getAttribute('href');
    if (!href || href==='#') return;
    const t = document.querySelector(href);
    if (t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth', block:'start'}); }
  });
});