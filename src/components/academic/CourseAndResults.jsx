import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../content.css';

// ── Grade helpers ────────────────────────────────────────────────────────────

const GRADE_COLORS = {
  'A+': '#059669', A: '#10b981', 'B+': '#2563eb', B: '#3b82f6',
  'C+': '#d97706', C: '#f59e0b', 'D+': '#dc2626', D: '#ef4444',
  F: '#991b1b', W: '#6b7280', UW: '#6b7280', '-': '#7c3aed',
};
const gradeColor = (g) => GRADE_COLORS[(g || '-').trim()] || '#6b7280';

function parseGradeScore(text) {
  const m = (text || '').trim().match(/^(\S+)\s*\(([^)]*)\)/);
  return m ? { grade: m[1], score: m[2] } : { grade: (text || '-').trim(), score: '' };
}

function parseMeta(text) {
  return {
    total: (text.match(/Total\s*(?:Mark\s*)?:\s*([\d.]+)/i) || [])[1] || '',
    pass: (text.match(/Pass(?:ing\s*Mark)?\s*:\s*([\d.]+)/i) || [])[1] || '',
    contrib: (text.match(/Contributes\s*:\s*([\d.]+%)/i) || [])[1] || '',
  };
}

function metaLine(m) {
  if (!m.total) return '';
  return `Total: ${m.total} · Pass: ${m.pass} · Contributes: ${m.contrib}`;
}

function parseRow(row) {
  const hEl = row.querySelector('h4, h6');
  if (!hEl) return null;
  const clone = hEl.cloneNode(true);
  clone.querySelectorAll('small, a').forEach((n) => n.remove());
  const name = clone.textContent.trim();
  const metaTxt = hEl.querySelector('small em')?.textContent?.trim() || '';
  const scoreCol = row.querySelector('.col-md-4, .col-sm-4');
  const score = scoreCol?.textContent?.trim() || '';
  return { name, meta: parseMeta(metaTxt), score, isH4: hEl.tagName === 'H4' };
}

function parseTerm(termEl) {
  const bgRow = termEl.querySelector('.row.bg-info');
  if (!bgRow) return null;

  const h4 = bgRow.querySelector('h4');
  const nameClone = h4.cloneNode(true);
  nameClone.querySelectorAll('small').forEach((n) => n.remove());
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
          kids[i].querySelectorAll('.row').forEach((sr) => {
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

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ sec, isMidterm }) {
  const [open, setOpen] = useState(true);
  const scoreColor = isMidterm ? 'text-blue-600' : 'text-pink-600';
  const chevronColor = isMidterm ? 'text-blue-400' : 'text-pink-400';
  const hoverBg = isMidterm ? 'hover:bg-blue-50/50' : 'hover:bg-pink-50/50';

  return (
    <div className={`rounded-md overflow-hidden bg-white/40 ${!open ? '' : ''}`} style={{ marginBottom: 8 }}>
      <div
        className={`flex justify-between items-center px-3.5 py-2.5 cursor-pointer select-none ${hoverBg}`}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="text-[13px] font-semibold text-slate-900">{sec.name}</div>
          {sec.meta.total && <div className="text-[11px] text-slate-400 mt-0.5">{metaLine(sec.meta)}</div>}
        </div>
        <div className="flex items-center gap-2.5">
          <span className={`text-[16px] font-bold ${scoreColor}`}>{sec.score}</span>
          <span className={`text-[11px] transition-transform ${chevronColor} ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {open && (
        <div className="px-3.5 pb-2 bg-white/30">
          {sec.subItems.length === 0
            ? <p className="text-[12px] italic text-slate-400 text-center py-3">No sub-items.</p>
            : sec.subItems.map((sub, i) => (
              <div key={i} className={`flex justify-between items-center px-2.5 py-2 rounded mb-0.5 bg-white/20 hover:bg-white/50 ${isMidterm ? 'hover:bg-blue-50/40' : 'hover:bg-pink-50/40'}`}>
                <div>
                  <div className="text-[12px] font-medium text-slate-800">{sub.name}</div>
                  {sub.meta.total && <div className="text-[11px] text-slate-400 mt-0.5">{metaLine(sub.meta)}</div>}
                </div>
                <span className={`text-[13px] font-bold pl-2 ${scoreColor}`}>{sub.score}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

function TermCard({ term }) {
  const [open, setOpen] = useState(true);
  const isMidterm = term.termName.toLowerCase().includes('midterm');

  const cardStyle = isMidterm
    ? 'bg-gradient-to-br from-sky-50 to-blue-50 border-[1.5px] border-blue-200 border-l-[5px] border-l-blue-600'
    : 'bg-gradient-to-br from-orange-50 to-pink-50 border-[1.5px] border-pink-200 border-l-[5px] border-l-pink-500';
  const labelStyle = isMidterm ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800';
  const gradeColor2 = isMidterm ? 'text-blue-600' : 'text-pink-600';
  const chevronColor = isMidterm ? 'text-blue-400' : 'text-pink-400';

  return (
    <div className={`rounded-xl mb-4 overflow-hidden ${cardStyle}`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div
        className="flex justify-between items-center flex-wrap gap-3 px-4 py-4 cursor-pointer select-none hover:opacity-90"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-md ${labelStyle}`}>
            {isMidterm ? 'Midterm' : 'Final'}
          </span>
          <div>
            <div className="text-[15px] font-bold text-slate-900">{term.termName}</div>
            {term.termMeta.total && <div className="text-[11px] text-slate-500 mt-0.5">{metaLine(term.termMeta)}</div>}
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          {term.score && term.score !== '-' && <span className="text-[13px] text-slate-500">{term.score}</span>}
          <span className="text-[24px] font-extrabold leading-none" style={{ color: gradeColor(term.grade) }}>{term.grade}</span>
          <span className={`text-[11px] transition-transform ${chevronColor} ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4">
          {term.sections.length === 0
            ? <p className="text-[12px] italic text-slate-400 text-center py-3">No data available yet.</p>
            : term.sections.map((sec, i) => <SectionCard key={i} sec={sec} isMidterm={isMidterm} />)
          }
        </div>
      )}
    </div>
  );
}

function CourseAndResultsView({ sectionOpts, semesterOpts, courseName, courseMeta, teacherText, finalGs, terms, onSectionChange, onSemesterChange }) {
  return (
    <div className="text-[13px] text-slate-800 px-1" style={{ boxSizing: 'border-box' }}>
      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap mb-5 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]" style={{ flex: '2.5 1 0' }}>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Course</span>
          <select
            className="border-[1.5px] border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-900 bg-white cursor-pointer outline-none focus:border-blue-400 hover:border-slate-400 w-full"
            onChange={(e) => onSectionChange(e.target.value)}
            defaultValue={sectionOpts.find((o) => o.selected)?.value || ''}
          >
            {sectionOpts.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Semester</span>
          <select
            className="border-[1.5px] border-slate-200 rounded-lg px-3 py-2 text-[13px] text-slate-900 bg-white cursor-pointer outline-none focus:border-blue-400 hover:border-slate-400 w-full"
            onChange={(e) => onSemesterChange(e.target.value)}
            defaultValue={semesterOpts.find((o) => o.selected)?.value || ''}
          >
            {semesterOpts.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
          </select>
        </div>
      </div>

      {/* Course card */}
      <div className="flex justify-between items-start gap-4 bg-gradient-to-br from-sky-50 to-violet-50 border-[1.5px] border-blue-200 rounded-2xl px-5 py-4 mb-4">
        <div>
          <div className="text-[16px] font-bold text-slate-900 mb-1">{courseName}</div>
          {courseMeta.total && <div className="text-[12px] text-slate-500 mb-1">{metaLine(courseMeta)}</div>}
          {teacherText && <div className="text-[12px] text-slate-600">● {teacherText}</div>}
        </div>
        <div className="text-right whitespace-nowrap flex-shrink-0">
          <div className="text-[28px] font-extrabold leading-none" style={{ color: gradeColor(finalGs.grade) }}>
            {finalGs.grade}
          </div>
          {finalGs.score && finalGs.score !== '-' && (
            <div className="text-[12px] text-slate-400 mt-0.5">{finalGs.score}</div>
          )}
          <div className="text-[11px] uppercase tracking-wide text-slate-400 mt-0.5">Final</div>
        </div>
      </div>

      {/* Term cards */}
      {terms.map((term, i) => <TermCard key={i} term={term} />)}
    </div>
  );
}

// ── Self-mount ───────────────────────────────────────────────────────────────

(function mount() {
  if (window.__aiubCourseResultsMounted) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function init() {
      const listGroup = document.querySelector('#main-content .panel-body .list-group');
      if (!listGroup || !listGroup.querySelector('.list-group-item.active')) {
        setTimeout(init, 200); return;
      }

      if (window.__aiubCourseResultsMounted) return;
      window.__aiubCourseResultsMounted = true;

      const panelBody = document.querySelector('#main-content .panel-body');
      const sectionDdEl = document.getElementById('SectionDropDown');
      const semesterDdEl = document.getElementById('SemesterDropDown');
      if (!panelBody || !sectionDdEl || !semesterDdEl) return;

      const activeItem = listGroup.querySelector('.list-group-item.active');
      const courseName = activeItem.querySelector('label')?.textContent?.trim() || '';
      const courseMetaTxt = activeItem.querySelector('em')?.textContent?.trim() || '';
      const courseMeta = parseMeta(courseMetaTxt);

      let teacherText = '';
      activeItem.querySelectorAll('.col-md-8 em, .col-sm-4 em').forEach((el) => {
        const t = el.textContent.replace(/Course Teacher\(s\):/i, '').trim();
        if (t) teacherText = t;
      });

      const finalGradeRaw = activeItem.querySelector('.col-md-4 h4, .col-sm-4 h4')?.textContent?.trim() || '-';
      const finalGs = parseGradeScore(finalGradeRaw);

      const termEls = listGroup.querySelectorAll('.list-group-item:not(.active) .margin-l5.list-group-item');
      const terms = Array.from(termEls).map(parseTerm).filter(Boolean);

      const sectionOpts = [...sectionDdEl.querySelectorAll('option')].map((o) => ({ value: o.value, text: o.textContent.trim(), selected: o.selected }));
      const semesterOpts = [...semesterDdEl.querySelectorAll('option')].map((o) => ({ value: o.value, text: o.textContent.trim(), selected: o.selected }));

      const panel = panelBody.closest('.panel');
      if (panel) {
        panel.style.cssText = 'border:none!important;box-shadow:none!important;background:transparent!important';
        const heading = panel.querySelector('.panel-heading');
        if (heading) heading.style.display = 'none';
      }
      panelBody.style.cssText = 'padding:16px 4px!important;background:transparent!important;border:none!important;box-shadow:none!important';
      panelBody.innerHTML = '';

      const root = document.createElement('div');
      panelBody.appendChild(root);
      createRoot(root).render(
        <CourseAndResultsView
          sectionOpts={sectionOpts}
          semesterOpts={semesterOpts}
          courseName={courseName}
          courseMeta={courseMeta}
          teacherText={teacherText}
          finalGs={finalGs}
          terms={terms}
          onSectionChange={(val) => { if (val) window.location.href = val; }}
          onSemesterChange={(val) => { if (val) window.location.href = val; }}
        />
      );
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });
})();
