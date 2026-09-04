import fs from "node:fs/promises";
import path from "node:path";

/**
 * Renders the same tabbed High/Medium/Stretch dashboard you saw in Claude,
 * as a static HTML file. Uses localStorage for the check-in streak (works
 * fine here since this runs as a real hosted page, not a sandboxed artifact).
 */
export async function generateDashboard(result, profile, outputPaths) {
  const html = buildHtml(result, profile);
  for (const p of outputPaths) {
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, html);
  }
}

function jobCard(j) {
  const tags = j.matchedSkills.slice(0, 6).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
  const missing = j.missing.map((t) => `<span class="tag miss">${escapeHtml(t)}</span>`).join("");
  return `
    <div class="card" data-tier="${j.tier}">
      <div class="card-top">
        <div>
          <p class="card-title">${escapeHtml(j.title)}</p>
          <p class="card-sub"><b>${escapeHtml(j.company)}</b> · ${escapeHtml(j.location || "Location n/a")} · ${escapeHtml(j.source)}</p>
        </div>
        <div class="score"><div class="num">${j.fitScore}</div><div class="lbl">fit score</div></div>
      </div>
      <div class="tags">${tags}${missing}</div>
      <div class="card-foot">
        <span class="posted">${j.postedAt ? new Date(j.postedAt).toLocaleDateString() : "Date n/a"}</span>
        <a class="apply" href="${escapeAttr(j.url)}" target="_blank" rel="noopener">View / Apply →</a>
      </div>
    </div>`;
}

function buildHtml(result, profile) {
  const { tiers, generatedAt, newSinceLastRun, totalTracked } = result;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Job Radar — ${escapeHtml(profile.name)}</title>
<style>
  :root {
    --ink:#1a2332; --ink-soft:#4a5568; --paper:#fafaf7; --panel:#fff; --line:#e2e0d8;
    --accent:#b45309; --high:#166534; --high-bg:#ecfdf3; --med:#92400e; --med-bg:#fef7e8;
    --stretch:#6b21a8; --stretch-bg:#f6f0fc;
  }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--paper); color: var(--ink); margin:0; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 0 0 40px; }
  .top { background: linear-gradient(135deg,#1a2332,#2d3a52); color:#f0ede4; padding: 22px 28px; }
  .top h1 { margin:0; font-size:20px; }
  .top .sub { color:#b8c0d0; font-size:13px; }
  .stats { display:flex; gap:20px; margin-top:12px; flex-wrap:wrap; }
  .stat .n { font-family: monospace; font-size:20px; font-weight:700; color:#fbbf24; }
  .stat .l { font-size:10px; text-transform:uppercase; color:#b8c0d0; }
  .streakbar { background:#232d40; color:#9fb0c9; padding:8px 28px; font-size:12.5px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;}
  .tabs { display:flex; gap:4px; background:var(--panel); border-bottom:1px solid var(--line); padding: 0 28px; }
  .tab { padding:12px 16px; font-size:13.5px; font-weight:600; color:var(--ink-soft); cursor:pointer; border-bottom:3px solid transparent; }
  .tab.active { color:var(--ink); border-bottom-color:var(--accent); }
  .list { padding: 16px 28px; }
  .card { background:var(--panel); border:1px solid var(--line); border-left:4px solid var(--accent); border-radius:8px; padding:14px 16px; margin-bottom:10px; }
  .card[data-tier="high"] { border-left-color: var(--high); }
  .card[data-tier="medium"] { border-left-color: var(--med); }
  .card[data-tier="stretch"] { border-left-color: var(--stretch); }
  .card-top { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  .card-title { font-weight:700; font-size:15px; margin:0 0 2px; }
  .card-sub { font-size:12.5px; color:var(--ink-soft); margin:0; }
  .score { text-align:center; min-width:54px; }
  .score .num { font-family:monospace; font-size:20px; font-weight:700; }
  .card[data-tier="high"] .num { color:var(--high); }
  .card[data-tier="medium"] .num { color:var(--med); }
  .card[data-tier="stretch"] .num { color:var(--stretch); }
  .score .lbl { font-size:9px; text-transform:uppercase; color:var(--ink-soft); }
  .tags { display:flex; gap:6px; flex-wrap:wrap; margin:8px 0; }
  .tag { font-size:11px; background:#fef3e2; color:var(--accent); padding:2px 8px; border-radius:5px; font-family:monospace; }
  .tag.miss { background:#fdecec; color:#b91c1c; }
  .card-foot { display:flex; justify-content:space-between; align-items:center; margin-top:8px; }
  .posted { font-size:11px; color:#9a978a; }
  .apply { font-size:12.5px; font-weight:700; color:#fff; background:var(--ink); padding:6px 14px; border-radius:6px; text-decoration:none; }
  .empty { padding: 20px; color: var(--ink-soft); font-size: 13px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <h1>Job Radar — ${escapeHtml(profile.name)}</h1>
    <div class="sub">Generated ${new Date(generatedAt).toLocaleString()}</div>
    <div class="stats">
      <div class="stat"><div class="n">${totalTracked}</div><div class="l">Tracked</div></div>
      <div class="stat"><div class="n">${tiers.high.length}</div><div class="l">High fit</div></div>
      <div class="stat"><div class="n">${tiers.medium.length}</div><div class="l">Medium</div></div>
      <div class="stat"><div class="n">${tiers.stretch.length}</div><div class="l">Stretch</div></div>
      <div class="stat"><div class="n">${newSinceLastRun}</div><div class="l">New today</div></div>
    </div>
  </div>
  <div class="streakbar" id="streakbar"></div>
  <div class="tabs">
    <div class="tab active" data-tier="high">High <span>(${tiers.high.length})</span></div>
    <div class="tab" data-tier="medium">Medium <span>(${tiers.medium.length})</span></div>
    <div class="tab" data-tier="stretch">Stretch <span>(${tiers.stretch.length})</span></div>
  </div>
  <div class="list" id="list"></div>
</div>
<script>
  const tiers = ${JSON.stringify(tiers)};
  const listEl = document.getElementById('list');
  function render(tier) {
    const jobs = tiers[tier] || [];
    listEl.innerHTML = jobs.length
      ? jobs.map(j => \`
        <div class="card" data-tier="\${j.tier}">
          <div class="card-top">
            <div>
              <p class="card-title">\${j.title}</p>
              <p class="card-sub"><b>\${j.company}</b> · \${j.location || "Location n/a"} · \${j.source}</p>
            </div>
            <div class="score"><div class="num">\${j.fitScore}</div><div class="lbl">fit score</div></div>
          </div>
          <div class="tags">\${(j.matchedSkills||[]).slice(0,6).map(t=>'<span class="tag">'+t+'</span>').join('')}\${(j.missing||[]).map(t=>'<span class="tag miss">'+t+'</span>').join('')}</div>
          <div class="card-foot">
            <span class="posted">\${j.postedAt ? new Date(j.postedAt).toLocaleDateString() : "Date n/a"}</span>
            <a class="apply" href="\${j.url}" target="_blank" rel="noopener">View / Apply →</a>
          </div>
        </div>\`).join('')
      : '<div class="empty">No roles in this tier right now.</div>';
  }
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    render(t.dataset.tier);
  }));
  render('high');

  // Check-in streak, stored in this browser's localStorage (real page, not a sandboxed artifact)
  (function(){
    const today = new Date().toISOString().slice(0,10);
    const raw = localStorage.getItem('jobradar_streak');
    let state = raw ? JSON.parse(raw) : { streak: 0, last: null };
    if (state.last !== today) {
      const gapDays = state.last ? Math.round((new Date(today) - new Date(state.last)) / 86400000) : null;
      state.streak = gapDays === 1 ? state.streak + 1 : 1;
      state.last = today;
      localStorage.setItem('jobradar_streak', JSON.stringify(state));
    }
    document.getElementById('streakbar').innerHTML =
      '🔥 ' + state.streak + '-day check-in streak · Last refreshed by the daily job: ' + new Date(${JSON.stringify(generatedAt)}).toLocaleString();
  })();
</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s);
}
