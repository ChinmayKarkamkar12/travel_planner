/* ─── CONFIG ─────────────────────────────────────────────── */
const API_BASE = 'http://localhost:8000';

/* ─── GLOBE CANVAS ───────────────────────────────────────── */
(function initGlobe() {
  const canvas = document.getElementById('globe-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, cx, cy, R, frame;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    cx = W / 2; cy = H / 2;
    R = Math.min(W, H) * 0.46;
  }

  function drawGlobe(t) {
    ctx.clearRect(0, 0, W, H);

    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const latLines = 9;
    const lonLines = 12;

    // Latitude lines
    for (let i = 1; i < latLines; i++) {
      const lat = (Math.PI * i) / latLines - Math.PI / 2;
      const r = Math.cos(lat) * R;
      const y = cy - Math.sin(lat) * R;
      if (r < 1) continue;
      ctx.beginPath();
      ctx.ellipse(cx, y, r, r * 0.25, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Longitude lines (rotating)
    for (let i = 0; i < lonLines; i++) {
      const angle = (Math.PI * 2 * i) / lonLines + t * 0.0003;
      const cosA = Math.cos(angle);

      ctx.beginPath();
      const steps = 60;
      for (let j = 0; j <= steps; j++) {
        const phi = (Math.PI * j) / steps - Math.PI / 2;
        const x = cx + Math.cos(phi) * R * cosA;
        const y = cy - Math.sin(phi) * R;
        j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Equator highlight
    ctx.beginPath();
    ctx.ellipse(cx, cy, R, R * 0.25, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(232,168,76,0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    frame = requestAnimationFrame(drawGlobe);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(drawGlobe);
})();

/* ─── MARKDOWN RENDERER ──────────────────────────────────── */
function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Images (before links)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // HR
    .replace(/^---+$/gm, '<hr/>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*?<\/li>)(\s*<br\/>)*/gs, (match) => {
    const items = match.replace(/<br\/>/g, '');
    return `<ul>${items}</ul>`;
  });

  return `<div class="md-content"><p>${html}</p></div>`;
}

/* ─── TOAST ──────────────────────────────────────────────── */
function showToast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = `toast${isError ? ' error' : ''}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* ─── CARD HELPERS ───────────────────────────────────────── */
function showCard(id) {
  const card = document.getElementById(id);
  card.style.display = 'block';
  card.style.animation = 'cardIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards';
}

function setCardDone(statusId) {
  const el = document.getElementById(statusId);
  el.innerHTML = `
    <div class="status-done">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>`;
  const card = el.closest('.result-card');
  if (card) card.classList.add('ready');
}

function setCardError(bodyId, msg) {
  document.getElementById(bodyId).innerHTML = `
    <div class="error-msg">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>${msg}</span>
    </div>`;
}

/* ─── MAIN FORM HANDLER ──────────────────────────────────── */
const form = document.getElementById('trip-form');
const submitBtn = document.getElementById('submit-btn');
let finalReportText = '';

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const departure   = document.getElementById('departure').value.trim();
  const destination = document.getElementById('destination').value.trim();
  const dates       = document.getElementById('dates').value.trim();
  const interests   = document.getElementById('interests').value.trim();

  if (!departure || !destination || !dates) {
    showToast('Please fill in all required fields.', true);
    return;
  }

  // Update UI state
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.querySelector('.btn-text').textContent = 'Planning...';

  // Show trip header
  document.getElementById('trip-from').textContent = departure;
  document.getElementById('trip-to').textContent = destination;
  document.getElementById('trip-dates-display').textContent = dates;
  document.getElementById('trip-interests-display').textContent = interests || 'General';
  const tripHeader = document.getElementById('trip-header');
  tripHeader.style.display = 'block';

  // Scroll to results
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Show skeleton cards
  ['card-destination', 'card-events', 'card-weather', 'card-flights'].forEach(showCard);

  // Show final report skeleton
  const finalReport = document.getElementById('final-report');
  finalReport.style.display = 'block';

  const payload = { departure, destination, dates, interests };

  try {
    // ── 1. Destination ─────────────────────────────────────
    try {
      const res = await fetch(`${API_BASE}/research/destination`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      document.getElementById('body-destination').innerHTML = renderMarkdown(data.result || data.error || 'No data returned.');
      setCardDone('status-destination');
    } catch (err) {
      setCardError('body-destination', 'Could not load destination info. Is the backend running?');
      document.getElementById('status-destination').innerHTML = `<div style="color:#ff8080;font-size:1.2rem;">✕</div>`;
    }

    // ── 2. Events ──────────────────────────────────────────
    try {
      const res = await fetch(`${API_BASE}/research/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      document.getElementById('body-events').innerHTML = renderMarkdown(data.result || data.error || 'No data returned.');
      setCardDone('status-events');
    } catch (err) {
      setCardError('body-events', 'Could not load events. Is the backend running?');
      document.getElementById('status-events').innerHTML = `<div style="color:#ff8080;font-size:1.2rem;">✕</div>`;
    }

    // ── 3. Weather ─────────────────────────────────────────
    try {
      const res = await fetch(`${API_BASE}/research/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      document.getElementById('body-weather').innerHTML = renderMarkdown(data.result || data.error || 'No data returned.');
      setCardDone('status-weather');
    } catch (err) {
      setCardError('body-weather', 'Could not load weather data. Is the backend running?');
      document.getElementById('status-weather').innerHTML = `<div style="color:#ff8080;font-size:1.2rem;">✕</div>`;
    }

    // ── 4. Flights ─────────────────────────────────────────
    try {
      const res = await fetch(`${API_BASE}/research/flights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      document.getElementById('body-flights').innerHTML = renderMarkdown(data.result || data.error || 'No data returned.');
      setCardDone('status-flights');
    } catch (err) {
      setCardError('body-flights', 'Could not load flight options. Is the backend running?');
      document.getElementById('status-flights').innerHTML = `<div style="color:#ff8080;font-size:1.2rem;">✕</div>`;
    }

    // ── 5. Final Report ────────────────────────────────────
    try {
      const res = await fetch(`${API_BASE}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      finalReportText = data.result || '';
      document.getElementById('body-report').innerHTML = renderMarkdown(finalReportText || data.error || 'No report generated.');
      document.getElementById('report-actions').style.display = 'flex';
    } catch (err) {
      setCardError('body-report', 'Could not generate final report. Is the backend running?');
    }

  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.querySelector('.btn-text').textContent = 'Plan My Journey';
  }
});

/* ─── DOWNLOAD ───────────────────────────────────────────── */
document.getElementById('download-btn').addEventListener('click', () => {
  if (!finalReportText) return;
  const dest = document.getElementById('destination').value.trim().replace(/\s+/g, '_').toLowerCase();
  const blob = new Blob([finalReportText], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `travel_plan_${dest}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ─── NEW TRIP ───────────────────────────────────────────── */
document.getElementById('new-trip-btn').addEventListener('click', () => {
  ['card-destination','card-events','card-weather','card-flights'].forEach(id => {
    const el = document.getElementById(id);
    el.style.display = 'none';
    el.classList.remove('ready');
    const bodyId = id.replace('card-', 'body-');
    document.getElementById(bodyId).innerHTML = '<div class="skeleton-block"></div><div class="skeleton-block short"></div><div class="skeleton-block medium"></div>';
    const statusId = id.replace('card-', 'status-');
    document.getElementById(statusId).innerHTML = '<div class="status-loader"><div class="loader-ring"></div></div>';
  });
  document.getElementById('final-report').style.display = 'none';
  document.getElementById('trip-header').style.display = 'none';
  document.getElementById('report-actions').style.display = 'none';
  document.getElementById('body-report').innerHTML = '<div class="skeleton-block"></div><div class="skeleton-block medium"></div><div class="skeleton-block short"></div>';
  finalReportText = '';
  form.reset();
  document.getElementById('hero').scrollIntoView({ behavior: 'smooth' });
});
