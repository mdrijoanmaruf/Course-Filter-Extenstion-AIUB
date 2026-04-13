(function () {
  'use strict';
  if (window.__aiubCourseEnhanced) return;
  window.__aiubCourseEnhanced = true;

  const GRADE_COLORS = {
    'A+': '#059669', 'A': '#10b981', 'B+': '#2563eb', 'B': '#3b82f6',
    'C+': '#d97706', 'C': '#f59e0b', 'D+': '#dc2626', 'D': '#ef4444',
    'F': '#991b1b', 'W': '#6b7280', 'UW': '#6b7280', '-': '#7c3aed'
  };
  function gradeColor(g) { return GRADE_COLORS[(g || '-').trim()] || '#6b7280'; }

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

  const CSS = `<style id="car-style">
.car-root-panel { border: none !important; box-shadow: none !important; }
.car-root-panel > .panel-heading { display: none !important; }
.car-root-panel > .panel-body { background: transparent !important; border: none !important; box-shadow: none !important; padding: 16px 4px !important; }

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

.car-term-card {
  border-radius: 12px; margin-bottom: 18px; overflow: hidden;
  border-left: 5px solid #94a3af; transition: all 0.15s;
}
.car-term-card.car-midterm {
  background: linear-gradient(135deg, #f0f9ff 0%, #eff6ff 100%);
  border: 1.5px solid #bfdbfe; border-left: 5px solid #2563eb;
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.1);
}
.car-term-card.car-midterm:hover {
  border-color: #93c5fd; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
}
.car-term-card.car-finalterm {
  background: linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%);
  border: 1.5px solid #fbcfe8; border-left: 5px solid #ec4899;
  box-shadow: 0 1px 3px rgba(236, 72, 153, 0.1);
}
.car-term-card.car-finalterm:hover {
  border-color: #f472b6; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.15);
}

.car-term-head {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
  padding: 16px 18px;
  cursor: pointer; user-select: none; background: transparent; border-bottom: 1px solid transparent;
  transition: background 0.12s;
}
.car-term-card.car-midterm .car-term-head {
  border-bottom: 1px solid #dbeafe;
}
.car-term-card.car-finalterm .car-term-head {
  border-bottom: 1px solid #fbcfe8;
}
.car-term-head:hover { opacity: 0.85; }
.car-term-label {
  display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.5px; padding: 3px 10px; border-radius: 5px; white-space: nowrap;
  margin-right: 6px;
}
.car-term-card.car-midterm .car-term-label {
  background: #dbeafe; color: #1d4ed8;
}
.car-term-card.car-finalterm .car-term-label {
  background: #fbcfe8; color: #be185d;
}
.car-term-name { font-size: 15px; font-weight: 700; color: #0f172a; }
.car-term-meta { font-size: 11px; color: #6b7280; margin-top: 3px; }
.car-term-right { display: flex; align-items: center; gap: 14px; }
.car-term-score { font-size: 13px; color: #6b7280; }
.car-term-grade { font-size: 24px; font-weight: 800; line-height: 1; }
.car-term-card.car-midterm .car-term-grade { color: #1d4ed8; }
.car-term-card.car-finalterm .car-term-grade { color: #be185d; }
.car-term-chevron {
  font-size: 11px; transition: transform 0.2s;
  padding: 6px 8px; border-radius: 5px;
}
.car-term-card.car-midterm .car-term-chevron { color: #3b82f6; }
.car-term-card.car-finalterm .car-term-chevron { color: #ec4899; }
.car-term-card.car-open .car-term-chevron { transform: rotate(180deg); }
.car-term-body { display: none; padding: 0 18px 16px 18px; }
.car-term-card.car-open .car-term-body { display: block; }

.car-section-card {
  margin: 0; padding: 0; border: none; border-radius: 6px; overflow: hidden;
  background: rgba(255, 255, 255, 0.4);
  transition: all 0.12s;
}
.car-section-card:not(:last-child) { margin-bottom: 10px; }
.car-section-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: transparent; cursor: pointer; user-select: none;
  border: none; transition: background 0.12s;
}
.car-section-card:hover {
  background: rgba(255, 255, 255, 0.65);
}
.car-term-card.car-midterm .car-section-card:hover {
  background: rgba(59, 130, 246, 0.08);
}
.car-term-card.car-finalterm .car-section-card:hover {
  background: rgba(236, 72, 153, 0.08);
}
.car-section-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.car-section-meta { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.car-section-right { display: flex; align-items: center; gap: 10px; }
.car-section-score { font-size: 16px; font-weight: 700; }
.car-term-card.car-midterm .car-section-score { color: #2563eb; }
.car-term-card.car-finalterm .car-section-score { color: #db2777; }
.car-section-chevron {
  font-size: 11px; transition: transform 0.2s;
  padding: 4px 6px; border-radius: 4px;
}
.car-term-card.car-midterm .car-section-chevron { color: #60a5fa; }
.car-term-card.car-finalterm .car-section-chevron { color: #f472b6; }
.car-section-card.car-open .car-section-chevron { transform: rotate(180deg); }
.car-section-body { display: none; padding: 0; }
.car-section-card.car-open .car-section-body {
  display: block; padding: 8px 14px;
  background: rgba(255, 255, 255, 0.3);
}

.car-sub-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 10px; border: none; border-radius: 4px; background: rgba(255, 255, 255, 0.2);
  transition: background 0.1s;
}
.car-sub-row:not(:last-child) { margin-bottom: 3px; }
.car-sub-row:first-child { border-top: none; }
.car-sub-row:hover { background: rgba(255, 255, 255, 0.5); }
.car-term-card.car-midterm .car-sub-row:hover { background: rgba(59, 130, 246, 0.12); }
.car-term-card.car-finalterm .car-sub-row:hover { background: rgba(236, 72, 153, 0.12); }
.car-sub-name { font-size: 12px; font-weight: 500; color: #1f2937; }
.car-sub-meta { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.car-sub-score { font-size: 13px; font-weight: 700; white-space: nowrap; padding-left: 8px; }
.car-term-card.car-midterm .car-sub-score { color: #2563eb; }
.car-term-card.car-finalterm .car-sub-score { color: #db2777; }
.car-empty { color: #9ca3af; font-style: italic; font-size: 12px; padding: 14px 12px; text-align: center; }
</style>`;

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
    const termLabel = isMidterm ? 'Midterm' : 'Final';
    return `
<div class="car-term-card ${termClass} car-open" id="car-term-${idx}">
  <div class="car-term-head">
    <div style="display: flex; align-items: center;">
      <span class="car-term-label">${termLabel}</span>
      <div>
        <div class="car-term-name">${escHtml(term.termName)}</div>
        ${term.termMeta.total ? `<div class="car-term-meta">${metaLine(term.termMeta)}</div>` : ''}
      </div>
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

    const termEls = listGroup.querySelectorAll('.list-group-item:not(.active) .margin-l5.list-group-item');
    const terms   = Array.from(termEls).map(parseTerm).filter(Boolean);

    const sectionOpts  = selectOptions(sectionDdEl);
    const semesterOpts = selectOptions(semesterDdEl);

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

    panelBody.innerHTML = filterBar + courseCard + termsHTML;

    const panel = panelBody.closest('.panel');
    if (panel) panel.classList.add('car-root-panel');

    document.getElementById('car-section-dd').addEventListener('change', function () {
      window.location.href = this.value;
    });
    document.getElementById('car-semester-dd').addEventListener('change', function () {
      window.location.href = this.value;
    });

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

  function tryEnhance() {
    const listGroup = document.querySelector('#main-content .panel-body .list-group');
    if (listGroup && listGroup.querySelector('.list-group-item.active')) {
      enhance();
    } else {
      setTimeout(tryEnhance, 200);
    }
  }

  chrome.storage.sync.get({ extensionEnabled: true }, function (r) {
    if (!r.extensionEnabled) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryEnhance);
    } else {
      tryEnhance();
    }
  });
})();
