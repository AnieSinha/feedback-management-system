/**
 * Shared UI primitives: icons, escaping, toasts, modals, empty/loading states.
 * No external dependencies — everything renders from inline SVG.
 */

/* ---------- icons (Lucide-style 24x24 stroke paths) ---------- */
const ICON_PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  program: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="4" width="3" height="14"/>',
  trending: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  eye: '<path d="M2 12s3.64-7 10-7 10 7 10 7-3.64 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A11 11 0 0 1 12 5c6.36 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.42M6.61 6.61A13.5 13.5 0 0 0 2 12s3.64 7 10 7a11 11 0 0 0 5.39-1.39"/><path d="m2 2 20 20"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  userCheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
};

/** Renders an inline SVG icon. Decorative by default; pass a label to expose it. */
export function icon(name, { size = 20, label = null, strokeWidth = 2 } = {}) {
  const path = ICON_PATHS[name];
  if (!path) throw new Error(`Unknown icon: ${name}`);
  const a11y = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"';
  return `<svg ${a11y} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

/* ---------- escaping ---------- */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const fmt = {
  number: (value, digits = 0) =>
    Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
  percent: (value) => `${Number(value ?? 0).toFixed(1)}%`,
  date: (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'),
  dateTime: (iso) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—',
  initials: (name) =>
    (name || '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
};

/* ---------- toasts ---------- */
export function toast(message, variant = 'info') {
  const root = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${variant}`;
  const iconName = variant === 'success' ? 'checkCircle' : variant === 'error' ? 'xCircle' : 'info';
  el.innerHTML = `<span class="toast-icon">${icon(iconName, { size: 18 })}</span><span class="toast-msg">${escapeHtml(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms';
    setTimeout(() => el.remove(), 220);
  }, 4000);
}

/* ---------- modal ---------- */
let closeActiveModal = null;

/**
 * Opens a modal. `render` returns the body HTML; `onSubmit` receives the form element
 * and may throw an ApiError, which is surfaced inline rather than closing the dialog.
 */
export function openModal({ title, bodyHtml, submitLabel = 'Save', danger = false, onSubmit, onMount }) {
  closeActiveModal?.();

  const previouslyFocused = document.activeElement;
  const root = document.getElementById('modal-root');
  const scrim = document.createElement('div');
  scrim.className = 'modal-scrim';
  scrim.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <form novalidate>
        <div class="modal-head">
          <h2 id="modal-title">${escapeHtml(title)}</h2>
          <button type="button" class="icon-btn" data-close aria-label="Close dialog">${icon('close')}</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-foot">
          <button type="button" class="btn btn-secondary" data-close>Cancel</button>
          <button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-submit>${escapeHtml(submitLabel)}</button>
        </div>
      </form>
    </div>`;
  root.appendChild(scrim);

  const form = scrim.querySelector('form');
  const submitBtn = scrim.querySelector('[data-submit]');

  const close = () => {
    document.removeEventListener('keydown', onKeydown);
    scrim.remove();
    closeActiveModal = null;
    previouslyFocused?.focus?.();
  };
  closeActiveModal = close;

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    // Focus trap.
    const focusables = scrim.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  document.addEventListener('keydown', onKeydown);

  scrim.addEventListener('click', (event) => {
    if (event.target === scrim || event.target.closest('[data-close]')) close();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    setBusy(submitBtn, true);
    try {
      await onSubmit(form);
      close();
    } catch (error) {
      showFormError(form, error);
    } finally {
      setBusy(submitBtn, false);
    }
  });

  onMount?.(form);
  // Focus the first real input, not the close button.
  const firstInput = form.querySelector('input:not([type=hidden]), select, textarea');
  (firstInput ?? submitBtn).focus();
  return { close, form };
}

export function confirmDialog({ title, message, confirmLabel = 'Delete', onConfirm }) {
  return openModal({
    title,
    bodyHtml: `<p>${escapeHtml(message)}</p>`,
    submitLabel: confirmLabel,
    danger: true,
    onSubmit: onConfirm,
  });
}

/* ---------- form helpers ---------- */
export function setBusy(button, busy, busyLabel = 'Working…') {
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span><span>${escapeHtml(busyLabel)}</span>`;
  } else if (button.dataset.label) {
    button.disabled = false;
    button.innerHTML = button.dataset.label;
    delete button.dataset.label;
  }
}

export function clearFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  form.querySelector('[data-form-error]')?.remove();
}

/**
 * Renders a submit failure: field-level messages next to their inputs when the
 * server sent a validation map, otherwise a summary alert at the top of the form.
 */
export function showFormError(form, error) {
  const body = form.querySelector('.modal-body') ?? form;
  let handledInline = false;

  if (error.fieldErrors) {
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      const input = form.querySelector(`[name="${field}"]`);
      const slot = form.querySelector(`[data-error-for="${field}"]`);
      if (input && slot) {
        input.setAttribute('aria-invalid', 'true');
        slot.textContent = message;
        handledInline = true;
      }
    }
    form.querySelector('[aria-invalid="true"]')?.focus();
  }

  if (!handledInline) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.setAttribute('role', 'alert');
    alert.dataset.formError = '';
    alert.innerHTML = `${icon('alert', { size: 18 })}<span>${escapeHtml(error.message)}</span>`;
    body.prepend(alert);
  }
}

/* ---------- shared markup ---------- */
export function emptyState({ iconName = 'inbox', title, message, actionHtml = '' }) {
  return `
    <div class="empty">
      <div class="empty-icon">${icon(iconName, { size: 22 })}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      ${actionHtml}
    </div>`;
}

export function errorState(error, retryAction) {
  return `
    <div class="empty">
      <div class="empty-icon">${icon('alert', { size: 22 })}</div>
      <h3>Could not load this page</h3>
      <p>${escapeHtml(error.message)}</p>
      ${retryAction ? `<button class="btn btn-secondary" data-action="${retryAction}">Try again</button>` : ''}
    </div>`;
}

export function skeletonRows(count = 5) {
  return `<div class="card-body">${'<div class="skeleton skeleton-row"></div>'.repeat(count)}</div>`;
}

/** Rating shown as number + stars, so meaning never depends on colour alone. */
export function ratingDisplay(value) {
  if (value === null || value === undefined) return '<span class="muted">—</span>';
  const rounded = Math.round(value);
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<span class="${i < rounded ? '' : 'off'}">${icon('star', { size: 13 })}</span>`
  ).join('');
  const label = `${Number(value).toFixed(Number.isInteger(value) ? 0 : 1)} out of 5`;
  return `<span class="rating" title="${label}">
      <span class="rating-value">${Number(value).toFixed(Number.isInteger(value) ? 0 : 1)}</span>
      <span class="rating-stars" role="img" aria-label="${label}">${stars}</span>
    </span>`;
}

export function statCard({ label, value, sub = '', iconName = 'chart' }) {
  return `
    <div class="card stat">
      <div class="stat-label">
        <span>${escapeHtml(label)}</span>
        <span class="stat-icon">${icon(iconName, { size: 17 })}</span>
      </div>
      <div class="stat-value">${escapeHtml(String(value))}</div>
      ${sub ? `<div class="stat-sub">${escapeHtml(sub)}</div>` : ''}
    </div>`;
}
