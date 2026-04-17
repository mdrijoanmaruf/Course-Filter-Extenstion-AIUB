import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../content.css';

const GRADE_COLORS = {
  'A+': '#059669', A: '#10b981', 'B+': '#2563eb', B: '#3b82f6',
  'C+': '#d97706', C: '#f59e0b', 'D+': '#dc2626', D: '#ef4444',
  F: '#991b1b', W: '#6b7280', UW: '#6b7280', '-': '#7c3aed',
};

function gpaColor(v) {
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return '#64748b';
  if (n >= 3.5) return '#059669';
  if (n >= 3.0) return '#2563eb';
  if (n >= 2.5) return '#d97706';
  return '#dc2626';
}

function normText(v) { return String(v || '').replace(/\s+/g, ' ').trim().toUpperCase(); }
function normCode(v) { return normText(v).replace(/\s+/g, ''); }
function extractNumber(text) {
  const m = String(text || '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}
function parseCreditValue(raw) {
  const m = String(raw || '').match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}
function normalizeInfoKey(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function getInfoValue(items, keys) {
  const wanted = new Set(keys.map(normalizeInfoKey));
  for (const item of items) {
    if (wanted.has(normalizeInfoKey(item.k))) return String(item.v || '').trim();
  }
  return '';
}

function parseInfo(tbl) {
  const items = [];
  tbl.querySelectorAll('tr').forEach((tr) => {
    const tds = [...tr.querySelectorAll('td')];
    if (tds[0] && tds[2]) items.push({ k: tds[0].textContent.trim(), v: tds[2].textContent.trim() });
    if (tds[3] && tds[5]) items.push({ k: tds[3].textContent.trim(), v: tds[5].textContent.trim() });
  });
  return items;
}

function parseSemesters(tbl) {
  const sems = [];
  let cur = null;
  [...tbl.querySelectorAll('tbody tr')].forEach((tr) => {
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
        tgp: tds[1]?.textContent.trim() || '',
        ecr: tds[2]?.textContent.trim() || '',
        gpa: tds[3]?.textContent.trim() || '',
        cgpa: tds[4]?.textContent.trim() || '',
      };
      return;
    }

    if (cur && tds.length >= 11) {
      const fg = tds[5].textContent.trim();
      const sts = tds[10].textContent.trim();
      const mtg = tds[3].textContent.trim();
      const ftg = tds[4].textContent.trim();
      const prn = (tds[11]?.textContent.trim() || '').toUpperCase();
      const isWType = fg === 'W' || mtg === 'UW' || ftg === 'UW';
      let state;
      if (sts === 'DRP') state = 'wdn';
      else if (fg === '-') state = 'ong';
      else if (isWType && prn === 'Y') state = 'done';
      else if (isWType) state = 'wdn';
      else if (fg === 'F') state = 'fail';
      else state = 'done';

      cur.courses.push({
        classId: tds[0].textContent.trim(),
        name: tds[1].textContent.trim(),
        credits: tds[2].textContent.trim(),
        creditValue: parseCreditValue(tds[2].textContent.trim()),
        mtg, ftg, fg,
        tgp: tds[6].textContent.trim(),
        sts, prn, state,
      });
    }
  });
  if (cur) sems.push(cur);
  return sems;
}

function saveGraphData(infoItems, semesters) {
  if (!chrome.storage?.local) return;
  chrome.storage.local.get({ aiubGraphData: {} }, (res) => {
    const next = { ...res.aiubGraphData };
    const curriculum = next.curriculum || {};
    const coreCodeSet = new Set((curriculum.coreCourseCodes || []).map(normCode));
    const coreNameSet = new Set((curriculum.coreCourseNames || []).map(normText));
    const hasCoreMap = coreCodeSet.size > 0 || coreNameSet.size > 0;

    const isCore = (c) => !hasCoreMap || coreCodeSet.has(normCode(c.classId)) || coreNameSet.has(normText(c.name));
    const filtered = semesters.map((sem) => ({ ...sem, courses: sem.courses.filter(isCore) }));
    const allCourses = filtered.flatMap((s) => s.courses);
    const sumCr = (pred) => allCourses.filter(pred).reduce((s, c) => s + c.creditValue, 0);

    next.semester = {
      studentName: getInfoValue(infoItems, ['Name', 'Student Name']),
      studentId: getInfoValue(infoItems, ['Id', 'Student Id']),
      program: getInfoValue(infoItems, ['Program', 'Department']),
      latestCgpa: extractNumber(getInfoValue(infoItems, ['Cgpa', 'CGPA'])),
      totalCredits: allCourses.reduce((s, c) => s + c.creditValue, 0),
      totalCourses: allCourses.length,
      passFail: {
        passed: allCourses.filter((c) => c.state === 'done').length,
        ongoing: allCourses.filter((c) => c.state === 'ong').length,
        dropped: allCourses.filter((c) => c.state === 'wdn').length,
        failed: allCourses.filter((c) => c.state === 'fail').length,
      },
      passFailCredits: {
        passed: sumCr((c) => c.state === 'done'),
        ongoing: sumCr((c) => c.state === 'ong'),
        dropped: sumCr((c) => c.state === 'wdn'),
        failed: sumCr((c) => c.state === 'fail'),
      },
      semesterGpaTrend: filtered.map((s) => ({ label: s.label, gpa: extractNumber(s.summary?.gpa) })).filter((p) => p.gpa > 0),
      cgpaTrend: filtered.map((s) => ({ label: s.label, cgpa: extractNumber(s.summary?.cgpa) })).filter((p) => p.cgpa > 0),
      creditBySemester: filtered.map((s) => ({
        label: s.label,
        credits: s.courses.filter((c) => c.state === 'done').reduce((sum, c) => sum + c.creditValue, 0),
      })).filter((p) => p.credits > 0),
      capturedAt: new Date().toISOString(),
    };
    next.updatedAt = new Date().toISOString();
    chrome.storage.local.set({ aiubGraphData: next });
  });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function GradePill({ grade }) {
  if (!grade) return <span className="text-slate-300 text-[12px]">—</span>;
  if (grade === '-') return <span className="text-[12px] font-semibold" style={{ color: '#7c3aed' }}>Ongoing</span>;
  const color = GRADE_COLORS[grade] || '#6b7280';
  return <span className="text-[13px] font-bold" style={{ color }}>{grade}</span>;
}

function MiniGrade({ grade }) {
  if (!grade || grade === '-' || grade === '') return <span className="text-slate-300 text-[11px]">—</span>;
  const color = GRADE_COLORS[grade] || '#6b7280';
  return <span className="text-[11px] font-semibold" style={{ color }}>{grade}</span>;
}

function StatusBadge({ state }) {
  const map = {
    ong:  { text: 'Ongoing', cls: 'bg-violet-100 text-violet-700' },
    wdn:  { text: 'Dropped', cls: 'bg-slate-100 text-slate-500' },
    fail: { text: 'Failed',  cls: 'bg-red-100 text-red-700' },
    done: { text: 'Passed',  cls: 'bg-emerald-100 text-emerald-700' },
  };
  const { text, cls } = map[state] || map.done;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md ${cls}`}>
      {text}
    </span>
  );
}

function SummaryBar({ summary }) {
  if (!summary) return null;
  const items = [
    { label: 'Grade Points', value: summary.tgp },
    { label: 'Credits Earned', value: summary.ecr },
    { label: 'Semester GPA', value: summary.gpa, colored: true },
    { label: 'Cumulative GPA', value: summary.cgpa, colored: true },
  ];
  return (
    <div className="flex gap-3 flex-wrap px-4 py-3 bg-slate-50 border-t border-slate-100">
      {items.map(({ label, value, colored }) => (
        <div key={label} className="flex flex-col items-center flex-1 min-w-[80px]">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">{label}</div>
          <span
            className="text-[15px] font-bold"
            style={colored ? { color: gpaColor(value) } : { color: '#0f172a' }}
          >
            {value || '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function SemesterCard({ sem }) {
  const [open, setOpen] = useState(true);
  const isActive = sem.courses.some((c) => c.state === 'ong');
  const borderColor = isActive ? 'border-violet-300' : 'border-slate-200';
  const dotColor = isActive ? 'bg-violet-500' : 'bg-slate-300';

  return (
    <div className={`rounded-xl overflow-hidden mb-3 border ${borderColor}`} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div
        className="flex justify-between items-center px-4 py-3 cursor-pointer select-none bg-white hover:bg-slate-50"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
          <span className="text-[14px] font-semibold text-slate-900">{sem.label}</span>
          {isActive && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-violet-100 text-violet-700">Current</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-slate-400">{sem.courses.length} course{sem.courses.length !== 1 ? 's' : ''}</span>
          {sem.summary?.gpa && sem.summary.gpa !== '0.00' && (
            <span className="text-[12px] font-semibold" style={{ color: gpaColor(sem.summary.gpa) }}>
              GPA {sem.summary.gpa}
            </span>
          )}
          <span className={`text-[10px] text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {open && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide text-slate-500 w-[9%]">Class ID</th>
                  <th className="text-left px-3 py-2 font-semibold text-[10px] uppercase tracking-wide text-slate-500">Course</th>
                  <th className="text-center px-2 py-2 font-semibold text-[10px] uppercase tracking-wide text-slate-500 w-[5%]">Cr.</th>
                  <th className="text-center px-2 py-2 font-semibold text-[10px] uppercase tracking-wide text-slate-500 w-[6%]">Mid</th>
                  <th className="text-center px-2 py-2 font-semibold text-[10px] uppercase tracking-wide text-slate-500 w-[7%]">Final</th>
                  <th className="text-center px-2 py-2 font-semibold text-[10px] uppercase tracking-wide text-slate-500 w-[8%]">Grade</th>
                  <th className="text-center px-2 py-2 font-semibold text-[10px] uppercase tracking-wide text-slate-500 w-[6%]">TGP</th>
                  <th className="text-center px-2 py-2 font-semibold text-[10px] uppercase tracking-wide text-slate-500 w-[9%]">Status</th>
                </tr>
              </thead>
              <tbody>
                {sem.courses.map((c, i) => {
                  const rowBg = c.state === 'ong' ? '#faf5ff' : c.state === 'fail' ? '#fff5f5' : c.state === 'wdn' ? '#f8fafc' : '#fff';
                  return (
                    <tr key={i} style={{ background: rowBg }} className="border-b border-slate-100 hover:brightness-95">
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{c.classId}</td>
                      <td className="px-3 py-2 text-slate-800 font-medium">{c.name}</td>
                      <td className="px-2 py-2 text-center text-slate-600">{c.credits.replace(/[()]/g, '')}</td>
                      <td className="px-2 py-2 text-center"><MiniGrade grade={c.mtg} /></td>
                      <td className="px-2 py-2 text-center"><MiniGrade grade={c.ftg} /></td>
                      <td className="px-2 py-2 text-center"><GradePill grade={c.fg} /></td>
                      <td className="px-2 py-2 text-center text-slate-600">{c.tgp || '—'}</td>
                      <td className="px-2 py-2 text-center"><StatusBadge state={c.state} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <SummaryBar summary={sem.summary} />
        </>
      )}
    </div>
  );
}

function InfoGrid({ items }) {
  const isCgpa = (k) => /^cgpa$/i.test(k.replace(/\s/g, ''));
  return (
    <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {items.map(({ k, v }) => (
        <div key={k} className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">{k}</div>
          {isCgpa(k) ? (
            <div className="text-[26px] font-extrabold leading-tight" style={{ color: gpaColor(v) }}>{v || '—'}</div>
          ) : (
            <div className="text-[13px] font-medium text-slate-900">{v || '—'}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function SemesterGradeReport({ infoItems, semesters, printHref, graphHref }) {
  return (
    <div className="text-[13px] text-slate-800 px-1 py-4" style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Roboto,sans-serif" }}>
      <div className="flex items-center justify-between mb-4 pb-3.5 border-b-2 border-slate-100">
        <h2 className="text-[16px] font-bold text-slate-900 m-0">
          Semester <span className="text-blue-600">Grade Report</span>
        </h2>
        <div className="flex items-center gap-2">
          {printHref && (
            <a
              href={printHref}
              className="text-[11px] font-semibold text-slate-500 no-underline border border-slate-300 rounded-md px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-blue-700 hover:border-indigo-300 transition-colors"
            >
              🖨 Print
            </a>
          )}
          {graphHref && (
            <a
              href={graphHref}
              className="text-[11px] font-semibold text-sky-600 no-underline border border-sky-200 rounded-md px-3 py-1.5 bg-sky-50 hover:bg-sky-100 hover:border-sky-300 transition-colors"
            >
              📊 Graph
            </a>
          )}
        </div>
      </div>

      <InfoGrid items={infoItems} />

      {semesters.map((sem, i) => <SemesterCard key={i} sem={sem} />)}

      <div className="flex items-center gap-5 mt-4 pt-3 border-t border-slate-100">
        {[
          { color: '#10b981', label: 'Passed' },
          { color: '#7c3aed', label: 'Ongoing' },
          { color: '#6b7280', label: 'Dropped' },
          { color: '#991b1b', label: 'Failed' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
            <span className="text-[11px] text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Self-mount ───────────────────────────────────────────────────────────────

(function mount() {
  if (window.__aiubSemGradeEnhanced) return;
  if (!window.location.href.includes('/Student/GradeReport/BySemester')) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function init() {
      const gr = document.querySelector('.grade-report');
      if (!gr) { setTimeout(init, 400); return; }
      if (window.__aiubSemGradeEnhanced) return;
      window.__aiubSemGradeEnhanced = true;

      const rootPanel = gr.closest('.panel');
      if (rootPanel) {
        rootPanel.style.cssText = 'box-shadow:none!important;border:none!important;background:transparent!important;margin-bottom:0!important';
        const heading = rootPanel.querySelector(':scope > .panel-heading');
        if (heading) heading.style.display = 'none';
        const body = rootPanel.querySelector(':scope > .panel-body');
        if (body) body.style.cssText = 'padding:0!important;background:transparent!important';
      }

      const tables = [...gr.querySelectorAll('table')];
      if (tables.length < 2) return;

      const printLink = document.querySelector('a[href*="PrintGradeReport"]');
      const printHref = printLink?.getAttribute('href') || null;
      let graphHref = '';
      try { graphHref = chrome.runtime.getURL('Grade/Graphs.html'); } catch (_) {}

      const infoItems = parseInfo(tables[0]);
      const semesters = parseSemesters(tables[1]);
      saveGraphData(infoItems, semesters);

      gr.innerHTML = '';
      createRoot(gr).render(
        <SemesterGradeReport
          infoItems={infoItems}
          semesters={semesters}
          printHref={printHref}
          graphHref={graphHref}
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
