/**
 * Hand-rolled SVG charts — no charting library, no CDN.
 *
 * Accessibility contract for every chart here:
 *   - role="img" plus a summary in aria-label describing the key insight
 *   - values are labelled directly on the marks, so colour is never the only channel
 *   - a <table> alternative is rendered (visually hidden) for screen readers
 *   - <title> children give native hover tooltips without JS
 */

import { escapeHtml } from './ui.js';

const SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

function dataTable(caption, headers, rows) {
  return `
    <table class="visually-hidden">
      <caption>${escapeHtml(caption)}</caption>
      <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows
        .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
        .join('')}</tbody>
    </table>`;
}

/**
 * Vertical bar chart for a 1–5 rating distribution.
 * @param {Object} distribution rating -> count, e.g. { 1: 0, 2: 1, ... }
 */
export function ratingDistributionChart(distribution, { summary = '' } = {}) {
  const entries = Object.entries(distribution).map(([rating, count]) => [Number(rating), Number(count)]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) {
    return `<p class="muted" style="padding:24px 0;text-align:center">No ratings submitted yet.</p>`;
  }

  // Sized to fit inside a card on a 375px viewport, so no bar is clipped there.
  const W = 292;
  const H = 220;
  const pad = { top: 20, right: 8, bottom: 40, left: 28 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const max = Math.max(...entries.map(([, count]) => count));
  const niceMax = Math.max(1, Math.ceil(max / 2) * 2);
  const bandW = plotW / entries.length;
  const barW = Math.min(52, bandW * 0.6);

  const ticks = [0, niceMax / 2, niceMax];
  const gridLines = ticks
    .map((tick) => {
      const y = pad.top + plotH - (tick / niceMax) * plotH;
      return `<line class="grid-line" x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}"/>
              <text x="${pad.left - 8}" y="${y + 4}" text-anchor="end">${tick}</text>`;
    })
    .join('');

  const bars = entries
    .map(([rating, count], i) => {
      const barH = (count / niceMax) * plotH;
      const x = pad.left + i * bandW + (bandW - barW) / 2;
      const y = pad.top + plotH - barH;
      // Low ratings amber, high ratings blue — reinforced by the printed count.
      const fill = rating <= 2 ? 'var(--chart-4)' : rating === 3 ? 'var(--chart-3)' : 'var(--chart-1)';
      const pct = ((count / total) * 100).toFixed(0);
      return `
        <g>
          <rect class="bar" x="${x}" y="${y}" width="${barW}" height="${Math.max(barH, count > 0 ? 2 : 0)}"
                rx="4" fill="${fill}">
            <title>${count} rating${count === 1 ? '' : 's'} of ${rating} star${rating === 1 ? '' : 's'} (${pct}%)</title>
          </rect>
          ${count > 0 ? `<text class="bar-label" x="${x + barW / 2}" y="${y - 6}" text-anchor="middle">${count}</text>` : ''}
          <text x="${x + barW / 2}" y="${H - pad.bottom + 18}" text-anchor="middle">${rating} ★</text>
        </g>`;
    })
    .join('');

  const label = summary || `Rating distribution across ${total} responses.`;

  return `
    <div class="chart-scroll">
    <svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(label)}">
      ${gridLines}
      <line class="axis-line" x1="${pad.left}" y1="${pad.top + plotH}" x2="${W - pad.right}" y2="${pad.top + plotH}"/>
      ${bars}
      <text x="${W / 2}" y="${H - 6}" text-anchor="middle">Rating</text>
    </svg>
    </div>
    ${dataTable(
      'Rating distribution',
      ['Rating', 'Responses'],
      entries.map(([rating, count]) => [`${rating} stars`, String(count)])
    )}`;
}

/**
 * Horizontal bar chart — good for comparing named categories on small screens,
 * because labels stay readable without rotation.
 * @param {Array<{label: string, value: number, max?: number, note?: string}>} items
 */
export function horizontalBarChart(items, { max = null, unit = '', summary = '' } = {}) {
  if (!items.length) {
    return `<p class="muted" style="padding:24px 0;text-align:center">No data to chart yet.</p>`;
  }

  const rowH = 40;
  const W = 292;
  const labelW = 104;
  const valueW = 44;
  const H = items.length * rowH + 8;
  const trackW = W - labelW - valueW - 8;
  const ceiling = max ?? Math.max(...items.map((item) => item.value), 1);

  const rows = items
    .map((item, i) => {
      const y = i * rowH + 8;
      const width = ceiling === 0 ? 0 : (item.value / ceiling) * trackW;
      const fill = SERIES[i % SERIES.length];
      const display = `${Number(item.value).toFixed(item.value % 1 === 0 ? 0 : 1)}${unit}`;
      // Full label stays available via the <title> tooltip and the data table.
      const clipped = item.label.length > 14 ? `${item.label.slice(0, 13)}…` : item.label;
      return `
        <g>
          <text x="0" y="${y + 18}" dominant-baseline="middle">
            ${escapeHtml(clipped)}<title>${escapeHtml(item.label)}</title>
          </text>
          <rect x="${labelW}" y="${y + 6}" width="${trackW}" height="14" rx="7" fill="var(--chart-grid)"/>
          <rect class="bar" x="${labelW}" y="${y + 6}" width="${Math.max(width, item.value > 0 ? 3 : 0)}"
                height="14" rx="7" fill="${fill}">
            <title>${escapeHtml(item.label)}: ${display}${item.note ? ` — ${escapeHtml(item.note)}` : ''}</title>
          </rect>
          <text class="bar-label" x="${W}" y="${y + 18}" text-anchor="end" dominant-baseline="middle">${escapeHtml(display)}</text>
        </g>`;
    })
    .join('');

  // Rendered at its natural size rather than stretched to the container: a scaled
  // viewBox scales the label text with it, so the same chart would read at a
  // different type size in a wide card than in a narrow one.
  return `
    <div class="chart-scroll">
      <svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
           role="img" aria-label="${escapeHtml(summary || 'Comparison chart')}">${rows}</svg>
    </div>
    ${dataTable(
      summary || 'Chart data',
      ['Item', 'Value'],
      items.map((item) => [item.label, `${item.value}${unit}`])
    )}`;
}

/** Donut for a single proportion (e.g. satisfaction rate). Percentage printed in the centre. */
export function donutChart(percent, { label = '', caption = '' } = {}) {
  const size = 180;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  const dash = (value / 100) * circumference;

  return `
    <div style="display:grid;place-items:center;gap:8px">
      <svg class="chart" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img"
           aria-label="${escapeHtml(caption || `${value.toFixed(1)} percent`)}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none"
                stroke="var(--chart-grid)" stroke-width="${stroke}"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none"
                stroke="var(--chart-1)" stroke-width="${stroke}" stroke-linecap="round"
                stroke-dasharray="${dash} ${circumference - dash}"
                transform="rotate(-90 ${size / 2} ${size / 2})"/>
        <text x="50%" y="48%" text-anchor="middle" style="font-size:28px;font-weight:600;fill:var(--color-fg)">
          ${value.toFixed(0)}%
        </text>
        <text x="50%" y="62%" text-anchor="middle" style="font-size:11px">${escapeHtml(label)}</text>
      </svg>
    </div>`;
}

export function legend(items) {
  return `<div class="legend">${items
    .map(
      (item, i) =>
        `<span class="legend-item">
           <span class="legend-swatch" style="background:${item.color ?? SERIES[i % SERIES.length]}"></span>
           ${escapeHtml(item.label)}
         </span>`
    )
    .join('')}</div>`;
}
