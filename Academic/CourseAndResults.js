(function () {
  'use strict';
  if (window.__aiubCourseEnhanced) return;
  window.__aiubCourseEnhanced = true;

  /* ── Grade colour map ─────────────────────────────────────────── */
  const GRADE_COLORS = {
    'A+': '#059669', 'A': '#10b981', 'B+': '#2563eb', 'B': '#3b82f6',
    'C+': '#d97706', 'C': '#f59e0b', 'D+': '#dc2626', 'D': '#ef4444',
    'F': '#991b1b', 'W': '#6b7280', 'UW': '#6b7280', '-': '#7c3aed'
  };
  function gradeColor(g) { return GRADE_COLORS[(g || '-').trim()] || '#6b7280'; }

  /* ── Parse helpers ────────────────────────────────────────────── */
  function parseGradeScore(text) {
    const m = (text || '').trim().match(/^(\S+)\s*\(([^)]*)\)/);
    return m ? { grade: m[1], score: m[2] } : { grade: (text || '-').trim(), score: '' };
  }

  function parseMeta(text) {
    return {
      total:   (text.match(/Total\s*(?:Mark\s*)?:\s*([\d.]+)/i)  || [])[1] || '',
      pass:    (text.match(/Pass(?:ing\s*Mark)?\s*:\s*([\d.]+)/i) || [])[1] || '',
      contrib: (text.match(/Contributes\s*:\s*([\d.]+%)/i)        || [])[1] || ''
    };
  }

  function metaLine(m) {
    if (!m.total) return '';
    return `Total: ${m.total} &nbsp;·&nbsp; Pass: ${m.pass} &nbsp;·&nbsp; Contributes: ${m.contrib}`;
  }

  function selectOptions(sel) {
    return Array.from(sel.querySelectorAll('option')).map(o => ({
      value:    o.value,
      text:     o.textContent.trim(),
      selected: o.selected
    }));
  }

  /* ── Parse a .row with h4 or h6 ──────────────────────────────── */
  function parseRow(row) {
    const hEl = row.querySelector('h4, h6');
    if (!hEl) return null;
    const clone = hEl.cloneNode(true);
    clone.querySelectorAll('small, a').forEach(n => n.remove());
    const name     = clone.textContent.trim();
    const metaTxt  = hEl.querySelector('small em')?.textContent?.trim() || '';
    const scoreCol = row.querySelector('.col-md-4, .col-sm-4');
    const score    = scoreCol?.textContent?.trim() || '';
    return { name, meta: parseMeta(metaTxt), score, isH4: hEl.tagName === 'H4' };
  }

  /* ── Parse one term (.margin-l5.list-group-item) ─────────────── */
  function parseTerm(termEl) {
    const bgRow = termEl.querySelector('.row.bg-info');
    if (!bgRow) return null;

    const h4 = bgRow.querySelector('h4');
    const nameClone = h4.cloneNode(true);
    nameClone.querySelectorAll('small').forEach(n => n.remove());
    const termName = nameClone.textContent.trim();
    const termMeta = parseMeta(h4.querySelector('small em')?.textContent?.trim() || '');
    const gs = parseGradeScore(bgRow.querySelector('.col-md-4 h4, .col-sm-4 h4')?.textContent?.trim() || '-');

    const body = termEl.querySelector('.margin-left-20');
    if (!body) return { termName, termMeta, grade: gs.grade, score: gs.score, sections: [] };

    const sections = [];
    const kids = Array.from(body.children);
    let i = 0;
    while (i < kids.length) {
      const kid = kids[i];
      if (kid.classList.contains('row')) {
        const r = parseRow(kid);
        if (r && r.isH4) {
          const subItems = [];
          if (i + 1 < kids.length && kids[i + 1].classList.contains('margin-left-20')) {
            i++;
            kids[i].querySelectorAll('.row').forEach(sr => {
              const sub = parseRow(sr);
              if (sub) subItems.push(sub);
            });
          }
          sections.push({ ...r, subItems });
        }
      }
      i++;
    }
    return { termName, termMeta, grade: gs.grade, score: gs.score, sections };
  }

  /* ── CSS ──────────────────────────────────────────────────────── */
  const CSS = `<style id="car-style">
.car-root-panel > .panel-heading { display: none !important; }
.car-root-panel > .panel-body { background: transparent !important; border: none !important; box-shadow: none !important; padding: 16px 4px !important; }

/* Filter bar */
.car-filter-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; align-items: flex-end; }
.car-filter-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 160px; }
.car-filter-group.wide { flex: 2.5; }
.car-filter-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
.car-select {
  appearance: none;
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%236b7280' d='M6 8L0 0h12z'/%3E%3C/svg%3E") no-repeat right 10px center;
  border: 1.5px solid #e5e7eb; border-radius: 8px;
  padding: 9px 32px 9px 12px; font-size: 13px; color: #111827; cursor: pointer; width: 100%;
  transition: border-color 0.15s;
}
.car-select:focus { outline: none; border-color: #3b82f6; }
.car-select:hover { border-color: #9ca3af; }

/* Course card */
.car-course-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%);
  border: 1.5px solid #bfdbfe; border-radius: 14px;
  padding: 18px 22px; margin-bottom: 16px;
  display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
}
.car-course-name { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 5px; }
.car-course-meta { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
.car-course-teacher { font-size: 12px; color: #4b5563; margin-top: 4px; }
.car-final-block { text-align: right; white-space: nowrap; }
.car-final-grade { font-size: 28px; font-weight: 800; line-height: 1; }
.car-final-score { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.car-final-lbl { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; }

/* Term cards - Midterm */
.car-term-card { background: #fff; border: 1.5px solid #e5e7eb; border-radius: 12px; margin-bottom: 14px; overflow: hidden; }
.car-term-card.car-midterm { border-color: #bfdbfe; background: #f0f9ff; }
.car-term-card.car-finalterm { border-color: #f0d9ff; background: #faf5ff; }

.car-term-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px;
  cursor: pointer; user-select: none;
}
.car-term-card.car-midterm .car-term-head { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); }
.car-term-card.car-finalterm .car-term-head { background: linear-gradient(135deg, #fce7f3 0%, #e9d5ff 100%); }
.car-term-head:hover { filter: brightness(0.98); }
.car-term-name { font-size: 14px; font-weight: 600; color: #111827; }
.car-term-meta { font-size: 11px; color: #6b7280; margin-top: 2px; }
.car-term-right { display: flex; align-items: center; gap: 12px; }
.car-term-score { font-size: 13px; color: #6b7280; }
.car-term-grade { font-size: 20px; font-weight: 700; }
.car-term-card.car-midterm .car-term-grade { color: #1d4ed8; }
.car-term-card.car-finalterm .car-term-grade { color: #be185d; }
.car-term-chevron { font-size: 10px; color: #9ca3af; transition: transform 0.2s; }
.car-term-card.car-open .car-term-chevron { transform: rotate(180deg); }
.car-term-body { display: none; padding: 8px 2px; }
.car-term-card.car-open .car-term-body { display: block; }

/* Section (Theory/Lab) cards - flattened */
.car-section-card { margin: 6px 8px; padding: 0; border: none; border-radius: 0; overflow: visible; }
.car-section-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; background: transparent; cursor: pointer; user-select: none;
  border-left: 3px solid #9ca3af; border-radius: 0;
}
.car-term-card.car-midterm .car-section-head { border-left-color: #3b82f6; background: #eff6ff; }
.car-term-card.car-finalterm .car-section-head { border-left-color: #ec4899; background: #fdf2f8; }
.car-section-head:hover { filter: brightness(0.98); }
.car-section-name { font-size: 13px; font-weight: 600; color: #374151; }
.car-section-meta { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.car-section-right { display: flex; align-items: center; gap: 8px; }
.car-section-score { font-size: 15px; font-weight: 700; }
.car-term-card.car-midterm .car-section-score { color: #1d4ed8; }
.car-term-card.car-finalterm .car-section-score { color: #be185d; }
.car-section-chevron { font-size: 10px; color: #9ca3af; transition: transform 0.2s; }
.car-section-card.car-open .car-section-chevron { transform: rotate(180deg); }
.car-section-body { display: none; }
.car-section-card.car-open .car-section-body { display: block; }

/* Sub-item rows */
.car-sub-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 12px; border-top: 1px solid rgba(148, 163, 184, 0.2); }
.car-sub-row:first-child { border-top: none; }
.car-sub-row:hover { background: rgba(255, 255, 255, 0.6); }
.car-term-card.car-midterm .car-sub-row:hover { background: rgba(59, 130, 246, 0.05); }
.car-term-card.car-finalterm .car-sub-row:hover { background: rgba(236, 72, 153, 0.05); }
.car-sub-name { font-size: 12px; font-weight: 500; color: #374151; }
.car-sub-meta { font-size: 11px; color: #9ca3af; margin-top: 1px; }
.car-sub-score { font-size: 13px; font-weight: 600; white-space: nowrap; padding-left: 8px; }
.car-term-card.car-midterm .car-sub-score { color: #2563eb; }
.car-term-card.car-finalterm .car-sub-score { color: #db2777; }
.car-empty { color: #9ca3af; font-style: italic; font-size: 12px; padding: 12px 14px; }
</style>`;

  /* ── Build HTML ───────────────────────────────────────────────── */
  function buildSelectOpts(opts) {
    return opts.map(o =>
      `<option value="${o.value}"${o.selected ? ' selected' : ''}>${escHtml(o.text)}</option>`
    ).join('');
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function termCardHTML(term, idx) {
    let sectionsHTML = '';
    if (term.sections.length === 0) {
      sectionsHTML = `<div class="car-empty">No data available yet.</div>`;
    } else {
      term.sections.forEach(sec => {
        const subHTML = sec.subItems.length === 0
          ? `<div class="car-empty">No sub-items.</div>`
          : sec.subItems.map(sub => `
<div class="car-sub-row">
  <div>
    <div class="car-sub-name">${escHtml(sub.name)}</div>
    ${sub.meta.total ? `<div class="car-sub-meta">${metaLine(sub.meta)}</div>` : ''}
  </div>
  <div class="car-sub-score">${escHtml(sub.score)}</div>
</div>`).join('');

        sectionsHTML += `
<div class="car-section-card car-open">
  <div class="car-section-head">
    <div>
      <div class="car-section-name">${escHtml(sec.name)}</div>
      ${sec.meta.total ? `<div class="car-section-meta">${metaLine(sec.meta)}</div>` : ''}
    </div>
    <div class="car-section-right">
      <span class="car-section-score">${escHtml(sec.score)}</span>
      <span class="car-section-chevron">▼</span>
    </div>
  </div>
  <div class="car-section-body">${subHTML}</div>
</div>`;
      });
    }

    const gs = term;
    const isMidterm = term.termName.toLowerCase().includes('midterm');
    const termClass = isMidterm ? 'car-midterm' : 'car-finalterm';
    return `
<div class="car-term-card ${termClass} car-open" id="car-term-${idx}">
  <div class="car-term-head">
    <div>
      <div class="car-term-name">${escHtml(term.termName)}</div>
      ${term.termMeta.total ? `<div class="car-term-meta">${metaLine(term.termMeta)}</div>` : ''}
    </div>
    <div class="car-term-right">
      ${gs.score && gs.score !== '-' ? `<span class="car-term-score">${escHtml(gs.score)}</span>` : ''}
      <span class="car-term-grade" style="color:${gradeColor(gs.grade)}">${escHtml(gs.grade)}</span>
      <span class="car-term-chevron">▼</span>
    </div>
  </div>
  <div class="car-term-body">${sectionsHTML}</div>
</div>`;
  }

  /* ── Main enhance ─────────────────────────────────────────────── */
  function enhance() {
    const panelBody = document.querySelector('#main-content .panel-body');
    if (!panelBody) return;

    const sectionDdEl  = document.getElementById('SectionDropDown');
    const semesterDdEl = document.getElementById('SemesterDropDown');
    if (!sectionDdEl || !semesterDdEl) return;

    const listGroup = panelBody.querySelector('.list-group');
    if (!listGroup) return;

    const activeItem = listGroup.querySelector('.list-group-item.active');
    if (!activeItem) return;

    /* Course header */
    const courseName     = activeItem.querySelector('label')?.textContent?.trim() || '';
    const courseMetaTxt  = activeItem.querySelector('em')?.textContent?.trim() || '';
    const courseMeta     = parseMeta(courseMetaTxt);
    const teacherRows    = activeItem.querySelectorAll('.col-md-8 em, .col-sm-4 em');
    let teacherText      = '';
    teacherRows.forEach(el => {
      const t = el.textContent.replace(/Course Teacher\(s\):/i, '').trim();
      if (t) teacherText = t;
    });
    const finalGradeRaw = activeItem.querySelector('.col-md-4 h4, .col-sm-4 h4')?.textContent?.trim() || '-';
    const finalGs = parseGradeScore(finalGradeRaw);

    /* Term sections */
    const termEls = listGroup.querySelectorAll('.list-group-item:not(.active) .margin-l5.list-group-item');
    const terms   = Array.from(termEls).map(parseTerm).filter(Boolean);

    /* Dropdown data */
    const sectionOpts  = selectOptions(sectionDdEl);
    const semesterOpts = selectOptions(semesterDdEl);

    /* Build */
    const filterBar = `
<div class="car-filter-bar">
  <div class="car-filter-group wide">
    <span class="car-filter-label">Course</span>
    <select class="car-select" id="car-section-dd">${buildSelectOpts(sectionOpts)}</select>
  </div>
  <div class="car-filter-group">
    <span class="car-filter-label">Semester</span>
    <select class="car-select" id="car-semester-dd">${buildSelectOpts(semesterOpts)}</select>
  </div>
</div>`;

    const courseCard = `
<div class="car-course-card">
  <div>
    <div class="car-course-name">${escHtml(courseName)}</div>
    ${courseMeta.total ? `<div class="car-course-meta">${metaLine(courseMeta)}</div>` : ''}
    ${teacherText ? `<div class="car-course-teacher">&#9679; ${escHtml(teacherText)}</div>` : ''}
  </div>
  <div class="car-final-block">
    <div class="car-final-grade" style="color:${gradeColor(finalGs.grade)}">${escHtml(finalGs.grade)}</div>
    ${finalGs.score && finalGs.score !== '-' ? `<div class="car-final-score">${escHtml(finalGs.score)}</div>` : ''}
    <div class="car-final-lbl">Final</div>
  </div>
</div>`;

    const termsHTML = terms.map((t, i) => termCardHTML(t, i)).join('');

    panelBody.innerHTML = CSS + filterBar + courseCard + termsHTML;

    /* Sidebar fix */
    const panel = panelBody.closest('.panel');
    if (panel) panel.classList.add('car-root-panel');

    /* Re-wire dropdowns */
    document.getElementById('car-section-dd').addEventListener('change', function () {
      window.location.href = this.value;
    });
    document.getElementById('car-semester-dd').addEventListener('change', function () {
      window.location.href = this.value;
    });

    /* Collapsibles via event delegation */
    panelBody.addEventListener('click', e => {
      const termHead = e.target.closest('.car-term-head');
      if (termHead) {
        termHead.closest('.car-term-card')?.classList.toggle('car-open');
        return;
      }
      const secHead = e.target.closest('.car-section-head');
      if (secHead) {
        secHead.closest('.car-section-card')?.classList.toggle('car-open');
      }
    });
  }

  /* ── Boot ─────────────────────────────────────────────────────── */
  function tryEnhance() {
    const listGroup = document.querySelector('#main-content .panel-body .list-group');
    if (listGroup && listGroup.querySelector('.list-group-item.active')) {
      enhance();
    } else {
      setTimeout(tryEnhance, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryEnhance);
  } else {
    tryEnhance();
  }
})();
