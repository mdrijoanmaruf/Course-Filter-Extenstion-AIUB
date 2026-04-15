(function () {
  'use strict';

  if (!window.location.href.includes('/Student/GradeReport/BySemester')) return;
  if (window.__aiubSemGradeEnhanced) return;
  window.__aiubSemGradeEnhanced = true;

  const GRADE_BG = {
    'A+': '#059669', 'A':  '#10b981',
    'B+': '#2563eb', 'B':  '#3b82f6',
    'C+': '#d97706', 'C':  '#f59e0b',
    'D+': '#dc2626', 'D':  '#ef4444',
    'F':  '#991b1b', 'W':  '#6b7280', 'UW': '#6b7280',
    '-':  '#7c3aed',
  };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getGraphPageUrl() {
    try {
      return chrome.runtime.getURL('Grade/Graphs.html');
    } catch (e) {
      return '';
    }
  }

  function gpaColor(v) {
    const n = parseFloat(v);
    if (isNaN(n) || n === 0) return '#64748b';
    if (n >= 3.5) return '#059669';
    if (n >= 3.0) return '#2563eb';
    if (n >= 2.5) return '#d97706';
    return '#dc2626';
  }

  function injectCSS() { }

  function normalizeInfoKey(v) {
    return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function getInfoValue(items, keys) {
    const wanted = new Set(keys.map(normalizeInfoKey));
    for (const item of items) {
      if (wanted.has(normalizeInfoKey(item.k))) return String(item.v || '').trim();
    }
    return '';
  }

  function extractNumber(text) {
    const m = String(text || '').match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  }

  function parseCreditValue(raw) {
    const m = String(raw || '').match(/\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  }

  function normText(v) {
    return String(v || '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function normCode(v) {
    return normText(v).replace(/\s+/g, '');
  }

  function saveGraphData(mutator) {
    if (!chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get({ aiubGraphData: {} }, function (res) {
      const next = Object.assign({}, res.aiubGraphData || {});
      mutator(next);
      next.updatedAt = new Date().toISOString();
      chrome.storage.local.set({ aiubGraphData: next });
    });
  }

  function persistSemesterGraphData(infoItems, semesters) {
    saveGraphData(store => {
      const curriculum = store.curriculum || {};
      const coreCodeSet = new Set((curriculum.coreCourseCodes || []).map(normCode));
      const coreNameSet = new Set((curriculum.coreCourseNames || []).map(normText));
      const hasCoreMap = coreCodeSet.size > 0 || coreNameSet.size > 0;

      function isCoreCourse(course) {
        if (!hasCoreMap) return true;
        const code = normCode(course.classId);
        const name = normText(course.name);
        return coreCodeSet.has(code) || coreNameSet.has(name);
      }

      const filteredSemesters = semesters.map(sem => ({
        label: sem.label,
        summary: sem.summary,
        courses: sem.courses.filter(isCoreCourse),
      }));

      const allCourses = [];
      filteredSemesters.forEach(s => allCourses.push(...s.courses));

      function sumCredit(courses, predicate) {
        return courses
          .filter(predicate)
          .reduce((sum, c) => sum + parseCreditValue(c.creditValue), 0);
      }

      const passFail = {
        passed: allCourses.filter(c => c.state === 'done').length,
        ongoing: allCourses.filter(c => c.state === 'ong').length,
        dropped: allCourses.filter(c => c.state === 'wdn').length,
        failed: allCourses.filter(c => c.state === 'fail').length,
      };

      const passFailCredits = {
        passed: sumCredit(allCourses, c => c.state === 'done'),
        ongoing: sumCredit(allCourses, c => c.state === 'ong'),
        dropped: sumCredit(allCourses, c => c.state === 'wdn'),
        failed: sumCredit(allCourses, c => c.state === 'fail'),
      };

      const semesterGpaTrend = filteredSemesters
        .map(sem => ({
          label: sem.label,
          gpa: extractNumber(sem.summary && sem.summary.gpa),
        }))
        .filter(p => p.gpa > 0);

      const cgpaTrend = filteredSemesters
        .map(sem => ({
          label: sem.label,
          cgpa: extractNumber(sem.summary && sem.summary.cgpa),
        }))
        .filter(p => p.cgpa > 0);

      const creditBySemester = filteredSemesters
        .map(sem => ({
          label: sem.label,
          credits: sem.courses
            .filter(c => c.state === 'done')
            .reduce((sum, c) => sum + parseCreditValue(c.creditValue), 0),
        }))
        .filter(p => p.credits > 0);

      const payload = {
        studentName: getInfoValue(infoItems, ['Name', 'Student Name']),
        studentId: getInfoValue(infoItems, ['Id', 'Student Id']),
        program: getInfoValue(infoItems, ['Program', 'Department']),
        latestCgpa: extractNumber(getInfoValue(infoItems, ['Cgpa', 'CGPA'])),
        totalCredits: allCourses.reduce((sum, c) => sum + parseCreditValue(c.creditValue), 0),
        totalCourses: allCourses.length,
        passFail,
        passFailCredits,
        semesterGpaTrend,
        cgpaTrend,
        creditBySemester,
        capturedAt: new Date().toISOString(),
      };

      store.semester = payload;
    });
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

  function parseSemesters(tbl) {
    const sems = [];
    let cur = null;

    [...tbl.querySelectorAll('tbody tr')].forEach(tr => {
      const tds = [...tr.querySelectorAll('td')];
      if (!tds.length) return;

      if (tds[0].textContent.trim() === 'Class ID') return;

      if (tds.length === 1 && tds[0].getAttribute('colspan') === '12') {
        if (cur) sems.push(cur);
        const raw = (tds[0].querySelector('label') || tds[0]).textContent.trim();
        cur = { label: raw.replace(/^\*+\s*/, ''), courses: [], summary: null };
        return;
      }

      if (tds[0].getAttribute('colspan') === '6' && cur) {
        cur.summary = {
          tgp:  tds[1]?.textContent.trim() || '',
          ecr:  tds[2]?.textContent.trim() || '',
          gpa:  tds[3]?.textContent.trim() || '',
          cgpa: tds[4]?.textContent.trim() || '',
        };
        return;
      }

      if (cur && tds.length >= 11) {
        const fg  = tds[5].textContent.trim();
        const sts = tds[10].textContent.trim();
        const mtg = tds[3].textContent.trim();
        const ftg = tds[4].textContent.trim();
        const prn = (tds[11]?.textContent.trim() || '').toUpperCase();
        const isWType = fg === 'W' || mtg === 'UW' || ftg === 'UW';
        let state;
        if (sts === 'DRP')          state = 'wdn';
        else if (fg === '-')         state = 'ong';
        else if (isWType && prn === 'Y') state = 'done';
        else if (isWType)            state = 'wdn';
        else if (fg === 'F')         state = 'fail';
        else                         state = 'done';

        cur.courses.push({
          classId: tds[0].textContent.trim(),
          name:    tds[1].textContent.trim(),
          credits: tds[2].textContent.trim(),
          creditValue: parseCreditValue(tds[2].textContent.trim()),
          mtg,
          ftg,
          fg,
          tgp:     tds[6].textContent.trim(),
          sts,
          prn,
          state,
        });
      }
    });

    if (cur) sems.push(cur);
    return sems;
  }

  function gradePill(fg) {
    if (!fg || fg === '') return '<span class="sgr-gp-nd">â€”</span>';
    if (fg === '-') return '<span class="sgr-gp" style="color:#7c3aed">Ongoing</span>';
    const bg = GRADE_BG[fg] || '#6b7280';
    return `<span class="sgr-gp" style="color:${bg}">${esc(fg)}</span>`;
  }

  function miniGrade(g) {
    if (!g || g === '-' || g === '') return '<span class="sgr-mini-nd">â€”</span>';
    const bg = GRADE_BG[g] || '#6b7280';
    return `<span class="sgr-mini" style="color:${bg}">${esc(g)}</span>`;
  }

  function statusBadge(state) {
    const map = {
      ong:  '<span class="sgr-sts sgr-sts-ong">Ongoing</span>',
      wdn:  '<span class="sgr-sts sgr-sts-wdn">Dropped</span>',
      fail: '<span class="sgr-sts sgr-sts-fail">Failed</span>',
      done: '<span class="sgr-sts sgr-sts-ok">Passed</span>',
    };
    return map[state] || map.done;
  }

  function infoHTML(items, printHref) {
    const cells = items.map(({ k, v }) =>
      `<div class="sgr-info-cell">
        <div class="sgr-info-lbl">${esc(k)}</div>
        <div class="sgr-info-val${k === 'Cgpa' ? ' cgpa' : ''}">${esc(v) || 'â€”'}</div>
      </div>`
    ).join('');
    const safeHref = printHref && /^[/?#]/.test(printHref) ? printHref : '#';
    const graphHref = getGraphPageUrl();
    const actions = [];
    if (printHref) {
      actions.push(`<a class="sgr-action-link sgr-print" href="${esc(safeHref)}">&#128438; Print</a>`);
    }
    if (graphHref) {
      actions.push(`<a class="sgr-action-link sgr-graph" href="${esc(graphHref)}">&#128202; Graph</a>`);
    }

    return `
      <div class="sgr-top">
        <h2 class="sgr-title">Semester <span>Grade Report</span></h2>
        <div class="sgr-actions">${actions.join('')}</div>
      </div>
      <div class="sgr-info">${cells}</div>`;
  }

  function semesterHTML(sem) {
    const isActive = sem.courses.some(c => c.state === 'ong');

    const rowsHTML = sem.courses.map(c =>
      `<tr class="sgr-row-${c.state}">
        <td class="sgr-code">${esc(c.classId)}</td>
        <td class="sgr-name">${esc(c.name)}</td>
        <td class="tc">${esc(c.credits.replace(/[()]/g, ''))}</td>
        <td class="tc">${miniGrade(c.mtg)}</td>
        <td class="tc">${miniGrade(c.ftg)}</td>
        <td class="tc">${gradePill(c.fg)}</td>
        <td class="tc sgr-num">${c.tgp || 'â€”'}</td>
        <td class="tc">${statusBadge(c.state)}</td>
      </tr>`
    ).join('');

    const sumBar = sem.summary ? `
      <div class="sgr-sum-bar">
        <div class="sgr-sum-item">
          <div class="sgr-sum-lbl">Grade Points</div>
          <span class="sgr-sum-val">${sem.summary.tgp || 'â€”'}</span>
        </div>
        <div class="sgr-sum-item">
          <div class="sgr-sum-lbl">Credits Earned</div>
          <span class="sgr-sum-val">${sem.summary.ecr || 'â€”'}</span>
        </div>
        <div class="sgr-sum-item">
          <div class="sgr-sum-lbl">Semester GPA</div>
          <span class="sgr-sum-val" style="color:${gpaColor(sem.summary.gpa)}">${sem.summary.gpa || 'â€”'}</span>
        </div>
        <div class="sgr-sum-item">
          <div class="sgr-sum-lbl">Cumulative GPA</div>
          <span class="sgr-sum-val" style="color:${gpaColor(sem.summary.cgpa)}">${sem.summary.cgpa || 'â€”'}</span>
        </div>
      </div>` : '';

    return `
      <div class="sgr-sem-card${isActive ? ' sgr-sem-card--active' : ''}">
        <div class="sgr-sem-head">
          <div class="sgr-sem-label">
            <span class="sgr-sem-dot"></span>${esc(sem.label)}
          </div>
          <div class="sgr-sem-meta">
            <span class="sgr-sem-cnt">${sem.courses.length} course${sem.courses.length !== 1 ? 's' : ''}</span>
            ${isActive ? '<span class="sgr-sem-badge-active">&#9679; Current</span>' : ''}
            ${sem.summary && sem.summary.gpa && sem.summary.gpa !== '0.00'
              ? `<span class="sgr-sem-gpa">GPA&thinsp;<strong>${sem.summary.gpa}</strong></span>` : ''}
            <span class="sgr-sem-toggle">&#9660;</span>
          </div>
        </div>
        <div class="sgr-sem-body">
          <div class="sgr-tbl-wrap">
            <table class="sgr-tbl">
              <thead><tr>
                <th style="width:8%">Class ID</th>
                <th>Course</th>
                <th class="tc" style="width:5%">Cr.</th>
                <th class="tc" style="width:6%">Mid</th>
                <th class="tc" style="width:7%">Final</th>
                <th class="tc" style="width:8%">Grade</th>
                <th class="tc" style="width:6%">TGP</th>
                <th class="tc" style="width:8%">Status</th>
              </tr></thead>
              <tbody>${rowsHTML}</tbody>
            </table>
          </div>
          ${sumBar}
        </div>
      </div>`;
  }

  function enhance() {
    const gr = document.querySelector('.grade-report');
    if (!gr) return;

    const rootPanel = gr.closest('.panel');
    if (rootPanel) rootPanel.classList.add('sgr-root-panel');

    const printLink = document.querySelector('a[href*="PrintGradeReport"]');
    const printHref = printLink ? printLink.getAttribute('href') : null;

    const tables = [...gr.querySelectorAll('table')];
    if (tables.length < 2) return;

    const infoItems = parseInfo(tables[0]);
    const semesters = parseSemesters(tables[1]);
    persistSemesterGraphData(infoItems, semesters);

    let html = infoHTML(infoItems, printHref);
    semesters.forEach(sem => { html += semesterHTML(sem); });
    html += `
      <div class="sgr-legend">
        <span><span class="sgr-legend-dot" style="background:#10b981"></span>Passed</span>
        <span><span class="sgr-legend-dot" style="background:#7c3aed"></span>Ongoing</span>
        <span><span class="sgr-legend-dot" style="background:#6b7280"></span>Dropped</span>
        <span><span class="sgr-legend-dot" style="background:#991b1b"></span>Failed</span>
      </div>`;

    gr.innerHTML = html;

    gr.addEventListener('click', e => {
      const head = e.target.closest('.sgr-sem-head');
      if (head) head.closest('.sgr-sem-card').classList.toggle('collapsed');
    });
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
