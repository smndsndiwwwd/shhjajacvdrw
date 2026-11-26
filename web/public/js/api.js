export function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.2s';
    setTimeout(() => el.remove(), 220);
  }, 3600);
}

export async function api(url, options = {}) {
  const opts = {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin'
  };
  if (options.body !== undefined) {
    opts.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data.error || `Request failed (${res.status})`;
    if (!options.silent) toast(errMsg, 'error');
    throw new Error(errMsg);
  }
  return data;
}

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatRichText(str) {
  return esc(str)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em class="comm-em">$1</em>')
    .replace(/`([^`\n]+)`/g, '<code class="comm-code">$1</code>')
    .replace(/\n/g, '<br>');
}

export function openModal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" id="modal-bg"><div class="modal-card">${html}</div></div>`;
  document.getElementById('modal-bg').addEventListener('click', (e) => {
    if (e.target.id === 'modal-bg') closeModal();
  });
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

/**
 * Parses SQLite UTC timestamps ("YYYY-MM-DD HH:MM:SS"), ISO strings, or epoch ms into a Date object.
 */
export function parseServerDate(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number' && !Number.isNaN(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const str = String(raw).trim();
  if (/^\d+$/.test(str)) {
    const d = new Date(Number(str));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // SQLite datetime('now') / CURRENT_TIMESTAMP stores UTC without 'Z' or timezone offset
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(str)
    ? str.replace(' ', 'T') + 'Z'
    : str;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatLocalTimestamp(raw, { withSeconds = false } = {}) {
  const d = parseServerDate(raw);
  if (!d) return String(raw ?? '');
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {})
  });
}

export function formatLocalTimeOnly(raw) {
  const d = parseServerDate(raw);
  if (!d) return String(raw ?? '');
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatUtcHourToLocal(hourStr = '00:00') {
  const hr = parseInt(String(hourStr).slice(0, 2), 10);
  if (Number.isNaN(hr)) return String(hourStr);
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hr, 0, 0));
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}
