(function () {
  'use strict';

  if (!window.location.href.includes('/Student/GradeReport/ByCurriculum')) return;
  if (window.__aiubGradeEnhanced) return;
  window.__aiubGradeEnhanced = true;

  /* ── Grade colour map ────────────────────────────────────────── */
  const GRADE_BG = {
    'A+': '#059669', 'A':  '#10b981',
    'B+': '#2563eb', 'B':  '#3b82f6',
    'C+': '#d97706', 'C':  '#f59e0b',
    'D+': '#dc2626', 'D':  '#ef4444',
    'F':  '#7f1d1d', 'W':  '#6b7280',
    '-':  '#7c3aed',
  };

  /* ── XSS escape ──────────────────────────────────────────────── */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Inject CSS ──────────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('aiub-cgr-css')) return;
    const s = document.createElement('style');
    s.id = 'aiub-cgr-css';
    s.textContent = `
      /* SCOPED panel reset — only the .panel ancestor of .grade-report.
         Preserves the portal sidebar and all other panels. */
      .cgr-root-panel > .panel-heading { display: none !important; }
      .cgr-root-panel { box-shadow: none !important; border: none !important;
        background: transparent !important; margin-bottom: 0 !important; }
      .cgr-root-panel > .panel-body { padding: 0 !important; background: transparent !important; }

      /* ── Root card ── */
      .grade-report {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
        font-size: 13px;
        color: #1e293b;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 22px 24px;
        box-shadow: 0 1px 4px rgba(0,0,0,.06);
      }

      /* ── Top bar ── */
      .cgr-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 14px;
        border-bottom: 2px solid #f1f5f9;
      }
      .cgr-title { font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -.3px; margin: 0; padding: 0; }
      .cgr-title span { color: #2563eb; }
      .cgr-print {
        font-size: 11px; font-weight: 600; color: #475569; text-decoration: none;
        border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 13px;
        background: #f8fafc; transition: background .15s, color .15s, border-color .15s;
      }
      .cgr-print:hover { background: #e0e7ff; color: #1d4ed8; border-color: #a5b4fc; text-decoration: none; }

      /* ── Info grid ── */
      .cgr-info {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 20px;
      }
      .cgr-info-cell {
        padding: 10px 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        transition: box-shadow .15s, border-color .15s;
        cursor: default;
      }
      .cgr-info-cell:hover { box-shadow: 0 2px 8px rgba(37,99,235,.08); border-color: #bfdbfe; }
      .cgr-info-lbl {
        font-size: 10px; text-transform: uppercase; letter-spacing: .8px;
        color: #94a3b8; margin-bottom: 4px; font-weight: 600;
      }
      .cgr-info-val { font-size: 13px; color: #0f172a; font-weight: 500; }
      .cgr-info-val.cgpa { font-size: 26px; font-weight: 800; color: #059669; line-height: 1.1; }

      /* ── Section headings ── */
      .cgr-sh {
        display: flex; align-items: center; gap: 8px;
        font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .9px;
        color: #1e40af; margin: 20px 0 10px; padding: 7px 12px;
        background: #eff6ff; border-radius: 7px; border-left: 3px solid #2563eb;
      }
      .cgr-sh.el { color: #166534; background: #f0fdf4; border-left-color: #16a34a; }
      .cgr-sh-badge {
        margin-left: auto; display: inline-flex; align-items: center; justify-content: center;
        background: #dbeafe; color: #1d4ed8; border-radius: 20px;
        font-size: 10px; font-weight: 700; padding: 1px 8px; min-width: 22px;
      }

      /* ── Semester label ── */
      .cgr-sl {
        display: inline-flex; align-items: center;
        font-size: 11px; font-weight: 700; color: #334155;
        text-transform: uppercase; letter-spacing: .5px;
        background: #f1f5f9; border: 1px solid #e2e8f0;
        border-radius: 5px; padding: 4px 11px; margin: 14px 0 7px;
      }

      /* ── Table wrapper ── */
      .cgr-tbl-wrap {
        border: 1px solid #e2e8f0; border-radius: 8px;
        overflow: hidden; margin-bottom: 6px;
      }
      .cgr-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
      .cgr-tbl th {
        background: #f8fafc; padding: 8px 12px;
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        letter-spacing: .6px; color: #64748b;
        border-bottom: 1px solid #e2e8f0; text-align: left;
      }
      .cgr-tbl th.tc { text-align: center; }
      .cgr-tbl td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
      .cgr-tbl td.tc { text-align: center; }
      .cgr-tbl tbody tr:last-child td { border-bottom: none; }
      .cgr-tbl tbody tr:nth-child(even) td { background: #fafbfd; }
      .cgr-tbl tbody tr:hover td { background: #eff6ff !important; }

      /* ── Row states ── */
      tr.cgr-ong > td { background: #f0f9ff !important; }
      tr.cgr-wdn > td { background: #fff5f5 !important; }
      tr.cgr-nd  > td { background: #fafafa; }
      tr.cgr-nd .cgr-cn { color: #94a3b8; }

      /* ── Code cell ── */
      .cgr-code {
        font-family: 'Consolas', 'Cascadia Code', 'Courier New', monospace;
        font-size: 12px; font-weight: 600; white-space: nowrap; color: #1e3a8a;
      }
      tr.cgr-nd  .cgr-code { color: #cbd5e1; }
      tr.cgr-ong .cgr-code { color: #2563eb; }
      tr.cgr-wdn .cgr-code { color: #dc2626; }

      /* ── Semester text ── */
      .cgr-sem-ln { font-size: 11px; color: #64748b; line-height: 1.8; }

      /* ── Grade pill ── */
      .cgr-gp {
        display: inline-block; padding: 2px 10px; border-radius: 20px;
        font-size: 11px; font-weight: 700; color: #fff;
        white-space: nowrap; letter-spacing: .3px;
      }
      .cgr-gp-nd { font-size: 12px; color: #cbd5e1; }

      /* ── Not Attempted section ── */
      .cgr-na-section {
        background: #fffdf5; border: 1px solid #fde68a;
        border-radius: 10px; padding: 14px 16px 16px; margin-bottom: 20px;
      }
      .cgr-na-section .cgr-sh {
        margin: 0 0 12px; color: #92400e; background: #fef3c7; border-left-color: #f59e0b;
      }
      .cgr-na-section .cgr-sh-badge { background: #fde68a; color: #92400e; }
      .cgr-na-all-done {
        text-align: center; padding: 14px; color: #059669;
        font-size: 13px; font-weight: 600;
        background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;
      }

      /* ── Tab nav ── */
      .cgr-tabs-nav { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
      .cgr-tab-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 5px 12px; border: 1px solid #e2e8f0; border-radius: 6px;
        background: #fff; font-size: 11px; font-weight: 600; color: #64748b;
        cursor: pointer; transition: background .15s, color .15s, border-color .15s;
        outline: none; font-family: inherit;
      }
      .cgr-tab-btn:hover { background: #f1f5f9; color: #0f172a; border-color: #94a3b8; }
      .cgr-tab-btn.active {
        background: #1d4ed8; color: #fff; border-color: #1d4ed8;
        box-shadow: 0 1px 4px rgba(29,78,216,.3);
      }
      .cgr-tab-cnt {
        background: #e2e8f0; color: #475569;
        border-radius: 20px; padding: 0 6px;
        font-size: 10px; font-weight: 700; line-height: 1.6;
      }
      .cgr-tab-btn.active .cgr-tab-cnt { background: rgba(255,255,255,.25); color: #fff; }

      /* ── Tab panels ── */
      .cgr-tab-panel { display: none; }
      .cgr-tab-panel.active { display: block; }

      /* ── Legend ── */
      .cgr-legend {
        display: flex; flex-wrap: wrap; gap: 14px;
        margin-top: 18px; padding-top: 12px;
        border-top: 1px solid #f1f5f9;
        font-size: 11px; color: #64748b;
      }
      .cgr-legend span { display: flex; align-items: center; gap: 6px; }
      .cgr-legend-dot {
        display: inline-block; width: 9px; height: 9px;
        border-radius: 50%; flex-shrink: 0;
      }

      @media (max-width: 768px) {
        .cgr-info { grid-template-columns: repeat(2, 1fr); }
        .cgr-tbl th, .cgr-tbl td { padding: 6px 8px; font-size: 12px; }
        .grade-report { padding: 14px; }
      }
    `;
    document.head.appendChild(s);
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function parseGrades(text) {
    const out = [];
    const re = /\(([^)]+)\)\s*\[([^\]]*)\]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      out.push({ sem: m[1].trim(), grade: m[2].trim() || '-' });
    }
    return out;
  }

  function getState(grades) {
    if (!grades.length) return 'nd';
    const last = grades[grades.length - 1].grade;
    if (last === '-') return 'ong';
    if (last === 'W') return 'wdn';
    return 'done';
  }

  function gradePill(grades) {
    if (!grades.length) return `<span class="cgr-gp-nd">—</span>`;
    const last = grades[grades.length - 1];
    const bg   = GRADE_BG[last.grade] || '#90a4ae';
    const lbl  = last.grade === '-' ? 'Ongoing' : last.grade;
    return `<span class="cgr-gp" style="background:${bg}">${esc(lbl)}</span>`;
  }

  function semLines(grades) {
    if (!grades.length) return `<span class="cgr-gp-nd">—</span>`;
    return grades.map(g => `<div class="cgr-sem-ln">${esc(g.sem)}</div>`).join('');
  }

  /* ── Parse student info table ────────────────────────────────── */
  function parseInfo(tbl) {
    const items = [];
    tbl.querySelectorAll('tr').forEach(tr => {
      const tds = [...tr.querySelectorAll('td')];
      if (tds[0] && tds[2]) items.push({ k: tds[0].textContent.trim(), v: tds[2].textContent.trim() });
      if (tds[3] && tds[5]) items.push({ k: tds[3].textContent.trim(), v: tds[5].textContent.trim() });
    });
    return items;
  }

  /* ── Info block ──────────────────────────────────────────────── */
  function infoHTML(items, printHref) {
    const cells = items.map(({ k, v }) =>
      `<div class="cgr-info-cell">
        <div class="cgr-info-lbl">${esc(k)}</div>
        <div class="cgr-info-val${k === 'Cgpa' ? ' cgpa' : ''}">${esc(v) || '—'}</div>
      </div>`
    ).join('');
    const safeHref = printHref && /^[/?#]/.test(printHref) ? printHref : '#';
    return `
      <div class="cgr-top">
        <h2 class="cgr-title">Curriculum <span>Grade Report</span></h2>
        ${printHref ? `<a class="cgr-print" href="${esc(safeHref)}">&#128438; Print</a>` : ''}
      </div>
      <div class="cgr-info">${cells}</div>`;
  }

  /* ── Not Attempted — tabbed per semester ─────────────────────── */
  function notAttemptedHTML(semSections, electiveRows) {
    const tabs = [];
    semSections.forEach((sec, i) => {
      const nd = sec.rows.filter(r => r.state === 'nd');
      if (nd.length) tabs.push({ label: sec.label || `Semester ${i + 1}`, rows: nd });
    });
    const electiveNA = electiveRows.filter(r => r.state === 'nd');
    if (electiveNA.length) tabs.push({ label: 'Elective', rows: electiveNA });

    if (!tabs.length) {
      return `<div class="cgr-na-section"><div class="cgr-na-all-done">&#10003; All courses have been attempted!</div></div>`;
    }

    const total = tabs.reduce((s, t) => s + t.rows.length, 0);

    const tabBtns = tabs.map((t, i) =>
      `<button class="cgr-tab-btn${i === 0 ? ' active' : ''}" data-group="na" data-idx="${i}">
        ${esc(t.label)}<span class="cgr-tab-cnt">${t.rows.length}</span>
      </button>`
    ).join('');

    const tabPanels = tabs.map((t, i) => {
      const rows = t.rows.map(r =>
        `<tr>
          <td class="cgr-code">${esc(r.code)}</td>
          <td class="cgr-cn">${esc(r.name)}</td>
        </tr>`
      ).join('');
      return `
        <div class="cgr-tab-panel${i === 0 ? ' active' : ''}" data-group="na" data-idx="${i}">
          <div class="cgr-tbl-wrap">
            <table class="cgr-tbl">
              <thead><tr>
                <th style="width:14%">Code</th>
                <th>Course Name</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="cgr-na-section">
        <div class="cgr-sh">&#9203; Not Attempted Yet<span class="cgr-sh-badge">${total}</span></div>
        <div class="cgr-tabs-nav">${tabBtns}</div>
        <div>${tabPanels}</div>
      </div>`;
  }

  /* ── Section heading helper ──────────────────────────────────── */
  function sectionHeadHTML(label, type) {
    const cls = type === 'elective' ? ' el' : '';
    return `<div class="cgr-sh${cls}">${label}</div>`;
  }

  /* ── Core semester table ─────────────────────────────────────── */
  function semTableHTML(sec) {
    const rowsHTML = sec.rows.map(r =>
      `<tr class="cgr-${r.state}">
        <td class="cgr-code">${esc(r.code)}</td>
        <td class="cgr-cn">${esc(r.name)}</td>
        <td>${semLines(r.grades)}</td>
        <td class="tc">${gradePill(r.grades)}</td>
      </tr>`
    ).join('');
    return `
      <div class="cgr-sl">${esc(sec.label)}</div>
      <div class="cgr-tbl-wrap">
        <table class="cgr-tbl">
          <thead><tr>
            <th style="width:11%">Code</th>
            <th>Course</th>
            <th style="width:28%">Semester Taken</th>
            <th class="tc" style="width:8%">Grade</th>
          </tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>`;
  }

  /* ── Elective table ──────────────────────────────────────────── */
  function electiveTableHTML(rows) {
    const rowsHTML = rows.map(r =>
      `<tr class="cgr-${r.state}">
        <td class="cgr-code">${esc(r.code)}</td>
        <td class="cgr-cn">${esc(r.name)}</td>
        <td>${semLines(r.grades)}</td>
        <td class="tc">${gradePill(r.grades)}</td>
      </tr>`
    ).join('');
    return `
      <div class="cgr-tbl-wrap">
        <table class="cgr-tbl">
          <thead><tr>
            <th style="width:11%">Code</th>
            <th>Course</th>
            <th style="width:28%">Semester Taken</th>
            <th class="tc" style="width:8%">Grade</th>
          </tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>`;
  }

  /* ── Legend ──────────────────────────────────────────────────── */
  function legendHTML() {
    return `
      <div class="cgr-legend">
        <span><span class="cgr-legend-dot" style="background:#2563eb"></span>Ongoing</span>
        <span><span class="cgr-legend-dot" style="background:#059669"></span>Completed</span>
        <span><span class="cgr-legend-dot" style="background:#dc2626"></span>Withdrawn</span>
        <span><span class="cgr-legend-dot" style="background:#cbd5e1"></span>Not Attempted</span>
      </div>`;
  }

  /* ── Tab click handler ───────────────────────────────────────── */
  function initTabs(container) {
    container.querySelectorAll('.cgr-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.group;
        const idx   = btn.dataset.idx;
        container.querySelectorAll(`.cgr-tab-btn[data-group="${group}"]`)
          .forEach(b => b.classList.remove('active'));
        container.querySelectorAll(`.cgr-tab-panel[data-group="${group}"]`)
          .forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = container.querySelector(
          `.cgr-tab-panel[data-group="${group}"][data-idx="${idx}"]`
        );
        if (panel) panel.classList.add('active');
      });
    });
  }

  /* ── Enhance (two-pass) ──────────────────────────────────────── */
  function enhance() {
    const gr = document.querySelector('.grade-report');
    if (!gr) return;

    /* Scope panel reset only to the direct ancestor .panel — sidebar is safe */
    const rootPanel = gr.closest('.panel');
    if (rootPanel) rootPanel.classList.add('cgr-root-panel');

    const printLink = document.querySelector('a[href*="PrintGradeReport"]');
    const printHref = printLink ? printLink.getAttribute('href') : null;

    let infoItems  = null;
    let inElective = false;
    let semLabel   = null;
    const semSections  = [];
    const electiveRows = [];

    /* Pass 1 – collect data */
    for (const el of [...gr.children]) {
      const tag = el.tagName;
      if (tag === 'TABLE' && !infoItems) {
        infoItems = parseInfo(el);
      } else if (tag === 'DIV' && el.classList.contains('text-center')) {
        if (el.textContent.toLowerCase().includes('elective')) inElective = true;
      } else if (tag === 'LABEL') {
        semLabel = el.textContent.trim();
      } else if (tag === 'TABLE' && infoItems) {
        const rows = [...el.querySelectorAll('tbody tr')].slice(1).map(tr => {
          const tds = [...tr.querySelectorAll('td')];
          if (tds.length < 3) return null;
          const code   = tds[0].textContent.trim();
          const name   = tds[1].textContent.trim();
          const grades = parseGrades(tds[2].textContent);
          return { code, name, grades, state: getState(grades) };
        }).filter(Boolean);

        if (inElective) {
          electiveRows.push(...rows);
        } else {
          semSections.push({ label: semLabel || '', rows });
          semLabel = null;
        }
      }
    }

    /* Pass 2 – render */
    let html = '';
    html += infoHTML(infoItems || [], printHref);
    html += notAttemptedHTML(semSections, electiveRows);
    html += sectionHeadHTML('Core Curriculum', 'core');
    semSections.forEach(sec => { html += semTableHTML(sec); });
    if (electiveRows.length) {
      html += sectionHeadHTML('Elective Curriculum', 'elective');
      html += electiveTableHTML(electiveRows);
    }
    html += legendHTML();

    gr.innerHTML = html;
    initTabs(gr);
  }

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    if (!document.querySelector('.grade-report')) {
      setTimeout(init, 400);
      return;
    }
    injectCSS();
    enhance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
