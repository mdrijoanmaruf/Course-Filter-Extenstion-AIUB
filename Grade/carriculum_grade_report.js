(function () {
  'use strict';

  if (!window.location.href.includes('/Student/GradeReport/ByCurriculum')) return;
  if (window.__aiubGradeEnhanced) return;
  window.__aiubGradeEnhanced = true;

  const GRADE_BG = {
    'A+': '#059669', 'A':  '#10b981',
    'B+': '#2563eb', 'B':  '#3b82f6',
    'C+': '#d97706', 'C':  '#f59e0b',
    'D+': '#dc2626', 'D':  '#ef4444',
    'F':  '#7f1d1d', 'W':  '#6b7280',
    '-':  '#7c3aed',
  };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function injectCSS() { }

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
    if (!grades.length) return `<span class="cgr-gp-nd">â€”</span>`;
    const last = grades[grades.length - 1];
    const bg   = GRADE_BG[last.grade] || '#90a4ae';
    const lbl  = last.grade === '-' ? 'Ongoing' : last.grade;
    return `<span class="cgr-gp" style="color:${bg}">${esc(lbl)}</span>`;
  }

  function semLines(grades) {
    if (!grades.length) return `<span class="cgr-gp-nd">â€”</span>`;
    return grades.map(g => `<div class="cgr-sem-ln">${esc(g.sem)}</div>`).join('');
  }

  function parseInfo(tbl) {
    const items = [];
    tbl.querySelectorAll('tr').forEach(tr => {
      const tds = [...tr.querySelectorAll('td')];
      if (tds[0] && tds[2]) items.push({ k: tds[0].textContent.trim(), v: tds[2].textContent.trim() });
      if (tds[3] && tds[5]) items.push({ k: tds[3].textContent.trim(), v: tds[5].textContent.trim() });
    });
    return items;
  }

  function infoHTML(items, printHref) {
    const cells = items.map(({ k, v }) =>
      `<div class="cgr-info-cell">
        <div class="cgr-info-lbl">${esc(k)}</div>
        <div class="cgr-info-val${k === 'Cgpa' ? ' cgpa' : ''}">${esc(v) || 'â€”'}</div>
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

  function sectionHeadHTML(label, type) {
    const cls = type === 'elective' ? ' el' : '';
    return `<div class="cgr-sh${cls}">${label}</div>`;
  }

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

  function legendHTML() {
    return `
      <div class="cgr-legend">
        <span><span class="cgr-legend-dot" style="background:#2563eb"></span>Ongoing</span>
        <span><span class="cgr-legend-dot" style="background:#059669"></span>Completed</span>
        <span><span class="cgr-legend-dot" style="background:#dc2626"></span>Withdrawn</span>
        <span><span class="cgr-legend-dot" style="background:#cbd5e1"></span>Not Attempted</span>
      </div>`;
  }

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

  function enhance() {
    const gr = document.querySelector('.grade-report');
    if (!gr) return;

    const rootPanel = gr.closest('.panel');
    if (rootPanel) rootPanel.classList.add('cgr-root-panel');

    const printLink = document.querySelector('a[href*="PrintGradeReport"]');
    const printHref = printLink ? printLink.getAttribute('href') : null;

    let infoItems  = null;
    let inElective = false;
    let semLabel   = null;
    const semSections  = [];
    const electiveRows = [];

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

  function init() {
    if (!document.querySelector('.grade-report')) {
      setTimeout(init, 400);
      return;
    }
    injectCSS();
    enhance();
  }

  chrome.storage.sync.get({ extensionEnabled: true }, function (r) {
    if (!r.extensionEnabled) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });
})();
