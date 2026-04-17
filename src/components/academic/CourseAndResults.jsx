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
  const [open, setOpen] = useState(false);
  const scoreColor = isMidterm ? '#0891b2' : '#a855f7';
  const hoverBg = isMidterm ? 'rgba(6, 182, 212, 0.1)' : 'rgba(168, 85, 247, 0.1)';
  const borderColor = isMidterm ? '#b3e5fc' : '#e9d5ff';
  const activeBg = open ? hoverBg : 'rgba(255, 255, 255, 0.6)';

  return (
    <div 
      className="rounded-xl border overflow-hidden shadow-sm transition-all duration-300"
      style={{ 
        marginBottom: 10, 
        background: activeBg,
        borderColor: borderColor,
        borderWidth: '1px'
      }}
    >
      <div
        className="flex justify-between items-center px-4 py-3 cursor-pointer select-none transition-colors duration-200"
        style={{ background: hoverBg }}
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="text-[14px] font-semibold text-slate-800">{sec.name}</div>
          {sec.meta.total && <div className="text-[11px] text-slate-500 mt-1">{metaLine(sec.meta)}</div>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[16px] font-bold" style={{ color: scoreColor }}>{sec.score}</span>
          <span 
            className="text-[12px] transition-transform duration-300"
            style={{ color: scoreColor, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >▼</span>
        </div>
      </div>

      <div style={{ display: open ? 'block' : 'none', maxHeight: open ? '500px' : '0', opacity: open ? 1 : 0, overflow: 'hidden', transition: 'all 0.3s ease-in-out' }}>
        <div className="px-4 pb-3">
          <div className="w-full h-[1px] bg-slate-200/50 mb-2"></div>
          {sec.subItems.length === 0
            ? <p className="text-[12px] italic text-slate-400 text-center py-2">No sub-items.</p>
            : sec.subItems.map((sub, i) => (
              <div 
                key={i} 
                className="flex justify-between items-center px-3 py-2.5 rounded-lg mb-1 bg-white/70 shadow-sm transition-colors"
                style={{ background: hoverBg }}
              >
                <div>
                  <div className="text-[13px] font-medium text-slate-700">{sub.name}</div>
                  {sub.meta.total && <div className="text-[11px] text-slate-400 mt-0.5">{metaLine(sub.meta)}</div>}
                </div>
                <span className="text-[14px] font-bold pl-2" style={{ color: scoreColor }}>{sub.score}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

function TermCard({ term }) {
  const [open, setOpen] = useState(true);
  const isMidterm = term.termName.toLowerCase().includes('midterm');

  const cardGradient = isMidterm
    ? 'linear-gradient(135deg, #ecf7fe 0%, #e0f2fe 50%, #e0f9ff 100%)'
    : 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 50%, #ddd6fe 100%)';
  
  const borderColor = isMidterm ? '#06b6d4' : '#a855f7';
  const borderBgColor = isMidterm ? '#b3e5fc' : '#e9d5ff';
  const labelBg = isMidterm ? '#cffafe' : '#e9d5ff';
  const labelText = isMidterm ? '#0369a1' : '#6d28d9';
  const chevronColor = isMidterm ? '#0891b2' : '#d946ef';

  return (
    <div 
      className="rounded-xl mb-5 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md"
      style={{
        background: cardGradient,
        border: `1.5px solid ${borderBgColor}`,
        borderLeft: `6px solid ${borderColor}`
      }}
    >
      <div
        className="flex justify-between items-center flex-wrap gap-4 px-5 py-4 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span 
            className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-md shadow-sm"
            style={{ backgroundColor: labelBg, color: labelText }}
          >
            {isMidterm ? 'Midterm' : 'Final'}
          </span>
          <div>
            <div className="text-[16px] font-bold text-slate-800">{term.termName}</div>
            {term.termMeta.total && <div className="text-[12px] text-slate-500 mt-1">{metaLine(term.termMeta)}</div>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {term.score && term.score !== '-' && <span className="text-[14px] font-medium text-slate-600 bg-white/50 px-2 py-0.5 rounded-md">{term.score}</span>}
          <span className="text-[26px] font-extrabold leading-none drop-shadow-sm" style={{ color: gradeColor(term.grade) }}>{term.grade}</span>
          <span 
            className="text-[12px] transition-transform duration-300"
            style={{ color: chevronColor, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >▼</span>
        </div>
      </div>

      <div style={{ display: open ? 'block' : 'none', maxHeight: open ? '2000px' : '0', opacity: open ? 1 : 0, overflow: 'hidden', transition: 'all 0.3s ease-in-out' }}>
        <div className="px-5 pb-5">
          {term.sections.length === 0
            ? <p className="text-[13px] italic text-slate-400 text-center py-4 bg-white/40 rounded-lg">No data available yet.</p>
            : term.sections.map((sec, i) => <SectionCard key={i} sec={sec} isMidterm={isMidterm} />)
          }
        </div>
      </div>
    </div>
  );
}

function CourseAndResultsView({ sectionOpts, semesterOpts, courseName, courseMeta, teacherText, finalGs, terms, onSectionChange, onSemesterChange }) {
  return (
    <div className="text-[14px] font-sans text-slate-800 px-1 w-full" style={{ boxSizing: 'border-box' }}>
      {/* Filter bar */}
      <div className="flex gap-4 flex-wrap mb-6 items-end p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]" style={{ flex: '2.5 1 0' }}>
          <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500 ml-1">Course</span>
          <select
            className="border-[1.5px] border-slate-300 rounded-xl px-4 py-2.5 text-[14px] font-medium text-slate-800 bg-white cursor-pointer outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-400 w-full transition-all shadow-sm"
            onChange={(e) => onSectionChange(e.target.value)}
            defaultValue={sectionOpts.find((o) => o.selected)?.value || ''}
          >
            {sectionOpts.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500 ml-1">Semester</span>
          <select
            className="border-[1.5px] border-slate-300 rounded-xl px-4 py-2.5 text-[14px] font-medium text-slate-800 bg-white cursor-pointer outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:border-slate-400 w-full transition-all shadow-sm"
            onChange={(e) => onSemesterChange(e.target.value)}
            defaultValue={semesterOpts.find((o) => o.selected)?.value || ''}
          >
            {semesterOpts.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
          </select>
        </div>
      </div>

      {/* Course card */}
      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-5 bg-gradient-to-br from-blue-50 via-white to-indigo-50 border border-blue-100 rounded-2xl px-6 py-5 mb-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="text-[20px] font-extrabold mb-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-green-700 drop-shadow-sm">{courseName}</div>
          {courseMeta.total && <div className="text-[13px] text-slate-500 mb-2 font-medium">{metaLine(courseMeta)}</div>}
          {teacherText && <div className="text-[13px] text-slate-700 bg-white/60 border border-slate-200/60 inline-block px-2.5 py-1 rounded-md backdrop-blur-sm shadow-sm">
            <span className="mr-1.5 opacity-80">👨‍🏫</span>{teacherText}
          </div>}
        </div>
        <div className="text-right whitespace-nowrap flex-shrink-0 relative z-10 bg-white/60 backdrop-blur-md px-5 py-3 rounded-xl border border-blue-100 shadow-sm">
          <div className="text-[36px] font-black leading-none drop-shadow-sm" style={{ color: gradeColor(finalGs.grade) }}>
            {finalGs.grade}
          </div>
          {finalGs.score && finalGs.score !== '-' && (
            <div className="text-[14px] font-medium text-slate-500 mt-1">{finalGs.score}</div>
          )}
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Final Grade</div>
        </div>
      </div>

      {/* Term cards */}
      <div className="space-y-2">
        {terms.map((term, i) => <TermCard key={i} term={term} />)}
      </div>
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
