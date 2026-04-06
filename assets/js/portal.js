/**
 * JYB Client Portal — portal.js
 * Shared utilities: API, auth, formatting, status badges
 */

const API = 'https://jyb-portal-api.jinyerbalance.workers.dev';

// ── Auth ──────────────────────────────────────────────────

function getClient() {
  try {
    return JSON.parse(sessionStorage.getItem('jyb_client') || 'null');
  } catch (e) {
    return null;
  }
}

function getAdminToken() {
  return sessionStorage.getItem('jyb_admin_token');
}

function setClient(data) {
  sessionStorage.setItem('jyb_client', JSON.stringify(data));
}

function setAdminToken(token) {
  sessionStorage.setItem('jyb_admin_token', token);
}

function signOut() {
  sessionStorage.clear();
  window.location.href = '/login.html';
}

// ── API Fetch ─────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const url = `${API}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error('Server returned an unexpected response.');
    }

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    throw err;
  }
}

async function clientFetch(path, options = {}) {
  const client = getClient();
  if (!client) { signOut(); return; }
  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${client.token}`,
      ...(options.headers || {}),
    },
  });
}

async function adminFetch(path, options = {}) {
  const token = getAdminToken();
  if (!token) { signOut(); return; }
  return apiFetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

// ── Formatting ────────────────────────────────────────────

function formatMoney(cents) {
  if (cents === null || cents === undefined) return '—';
  return '$' + (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(str) {
  if (!str) return '—';
  // str may be YYYY-MM-DD or ISO
  const d = new Date(str + (str.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateRange(start, end) {
  const s = start ? formatDate(start) : null;
  const e = end   ? formatDate(end)   : null;
  if (s && e) return `${s} &rarr; ${e}`;
  if (s) return `Started ${s}`;
  if (e) return `Due ${e}`;
  return '—';
}

// ── Status Badges ─────────────────────────────────────────

const STATUS_MAP = {
  // Invoice statuses
  paid:        { cls: 'badge-green',  label: 'Paid' },
  unpaid:      { cls: 'badge-amber',  label: 'Unpaid' },
  overdue:     { cls: 'badge-red',    label: 'Overdue' },
  draft:       { cls: 'badge-silver', label: 'Draft' },
  cancelled:   { cls: 'badge-silver', label: 'Cancelled' },
  // Project statuses
  in_progress: { cls: 'badge-amber',  label: 'In Progress' },
  completed:   { cls: 'badge-green',  label: 'Completed' },
  on_hold:     { cls: 'badge-red',    label: 'On Hold' },
  // Deliverable statuses
  pending:     { cls: 'badge-amber',  label: 'Pending' },
  delivered:   { cls: 'badge-green',  label: 'Delivered' },
  // Client statuses
  active:      { cls: 'badge-green',  label: 'Active' },
  inactive:    { cls: 'badge-silver', label: 'Inactive' },
};

function statusBadge(status) {
  const s = (status || 'unknown').toLowerCase();
  const map = STATUS_MAP[s] || { cls: 'badge-silver', label: s };
  return `<span class="badge ${map.cls}">${map.label}</span>`;
}

const TYPE_LABELS = {
  branding:   'Branding',
  web:        'Web',
  video:      'Video',
  social:     'Social',
  'care-plan':'Care Plan',
  custom:     'Custom',
  // account types
  store:      'Store',
  'one-time': 'One-Time',
  retainer:   'Retainer',
  'care_plan':'Care Plan',
  handover:   'Handover',
};

function typeBadge(type) {
  const label = TYPE_LABELS[type] || type || '—';
  return `<span class="badge badge-silver">${label}</span>`;
}

// ── DOM Helpers ───────────────────────────────────────────

function showMsg(el, text, type = 'error') {
  el.textContent = text;
  el.className = `msg msg-${type} visible`;
}

function hideMsg(el) {
  el.className = 'msg';
  el.textContent = '';
}

function spinner() {
  return `<div class="spinner-wrap"><div class="spinner"></div></div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Tabs ──────────────────────────────────────────────────

function initTabs(barSelector, contentSelector) {
  const buttons  = document.querySelectorAll(barSelector + ' .tab-btn');
  const contents = document.querySelectorAll(contentSelector);

  buttons.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      if (contents[i]) contents[i].classList.add('active');
    });
  });

  // Activate first by default
  if (buttons[0]) buttons[0].classList.add('active');
  if (contents[0]) contents[0].classList.add('active');
}

// ── Copy to Clipboard ─────────────────────────────────────

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1800);
  } catch (e) {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1800);
  }
}

// ── URL Token Auto-Login ──────────────────────────────────

function getUrlToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || null;
}

// ── Export (for inline script access) ────────────────────

window.JYB = {
  API,
  getClient,
  getAdminToken,
  setClient,
  setAdminToken,
  signOut,
  apiFetch,
  clientFetch,
  adminFetch,
  formatMoney,
  formatDate,
  formatDateRange,
  statusBadge,
  typeBadge,
  showMsg,
  hideMsg,
  spinner,
  escapeHtml,
  initTabs,
  copyText,
  getUrlToken,
};
