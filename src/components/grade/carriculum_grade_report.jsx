import { useState } from 'react';
import { createRoot } from 'react-dom/client';

// ── Constants & helpers ──────────────────────────────────────────────────────

const GRADE_BG = {
  'A+': '#059669', A: '#10b981', 'B+': '#2563eb', B: '#3b82f6',
  'C+': '#d97706', C: '#f59e0b', 'D+': '#dc2626', D: '#ef4444',
  F: '#7f1d1d', W: '#6b7280', '-': '#7c3aed',
};

const NIL_TOKENS = new Set(['', 'NIL', 'NILL', 'N/A', 'NA', '-']);
let courseCatalog = [];
const metaByName = new Map();
const metaByCode = new Map();

function norm(v) { return String(v || '').replace(/\s+/g, ' ').trim().toUpperCase(); }
function normCode(v) { return norm(v).replace(/\s+/g, ''); }
function normalizePrereqText(raw) {
  const s = String(raw || '').trim();
  if (!s || NIL_TOKENS.has(norm(s))) return 'Nil';
  return s;
}

function buildCatalogIndex(items) {
  items.forEach((item) => {
    const nameKey = norm(item.course_name);
    const codeKey = normCode(item.course);
    if (nameKey && !metaByName.has(nameKey)) metaByName.set(nameKey, item);
    if (codeKey && !metaByCode.has(codeKey)) metaByCode.set(codeKey, item);
  });
}

function loadCourseCatalog() {
  return fetch(chrome.runtime.getURL('Academic/CSE.json'))
    .then((res) => (res.ok ? res.json() : []))
    .then((items) => { if (Array.isArray(items)) { courseCatalog = items; buildCatalogIndex(items); } })
    .catch(() => { courseCatalog = []; });
}

function findCourseMeta(code, name) {
  const byName = metaByName.get(norm(name));
  if (byName) return byName;
  const byCode = metaByCode.get(normCode(code));
  if (byCode) return byCode;
  const nameKey = norm(name);
  return courseCatalog.find((item) => {
    const n = norm(item.course_name);
    return n === nameKey || n.includes(nameKey) || nameKey.includes(n);
  }) || null;
}

function prerequisiteListFromMeta(meta) {
  if (!meta) return [];
  if (Array.isArray(meta.prerequisites) && meta.prerequisites.length) return meta.prerequisites.map(String);
  const raw = normalizePrereqText(meta.prerequisite);
  if (raw === 'Nil') return [];
  if (/\bCREDITS?\b/i.test(raw)) return [raw];
  const codeMatches = raw.replace(/\s+/g, ' ').trim().match(/[A-Z]{2,4}\s*[0-9#*]{4}/gi);
  if (codeMatches && codeMatches.length > 1) return codeMatches;
  return raw.split(/\s*(?:,|&|\bAND\b)\s*/i).map((s) => s.trim()).filter(Boolean);
}

function findPrerequisite(code, name) {
  const meta = findCourseMeta(code, name);
  if (!meta) return 'Nil';
  if (Array.isArray(meta.prerequisites) && meta.prerequisites.length) return meta.prerequisites.join(', ');
  return normalizePrereqText(meta.prerequisite);
}

function parseCreditValue(raw) {
  const m = String(raw || '').match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function findCourseCredit(code, name) {
  const meta = findCourseMeta(code, name);
  return meta ? parseCreditValue(meta.credit) : 0;
}

function parseGrades(text) {
  const out = [];
  const re = /\(([^)]+)\)\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push({ sem: m[1].trim(), grade: m[2].trim() || '-' });
  return out;
}

function getState(grades) {
  if (!grades.length) return 'nd';
  const last = grades[grades.length - 1].grade;
  if (last === '-') return 'ong';
  if (last === 'W') return 'wdn';
  return 'done';
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

function normalizeInfoKey(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function getInfoValue(items, keys) {
  const wanted = new Set(keys.map(normalizeInfoKey));
  for (const item of items) if (wanted.has(normalizeInfoKey(item.k))) return String(item.v || '').trim();
  return '';
}

function extractNumber(text) {
  const m = String(text || '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function addLockInfo(semSections, electiveRows) {
  const allRows = [...semSections.flatMap((s) => s.rows), ...electiveRows];
  const completedCodes = new Set(allRows.filter((r) => r.state === 'done' || r.state === 'ong').map((r) => normCode(r.code)));
  allRows.forEach((r) => {
    if (r.state !== 'nd') return;
    const reqList = prerequisiteListFromMeta(findCourseMeta(r.code, r.name));
    const missing = reqList.filter((req) => {
      const n = normalizePrereqText(req);
      if (n === 'Nil') return false;
      if (/\bCREDITS?\b/i.test(n)) return true;
      return !completedCodes.has(normCode(n));
    });
    r.locked = missing.length > 0;
    r.missingPrereqs = missing;
    r.prereqStatus = r.locked ? 'Locked' : 'Unlocked';
    r.needToComplete = r.locked ? missing.join(', ') : '-';
  });
}

function saveGraphData(infoItems, semSections, electiveRows) {
  if (!chrome.storage?.local) return;
  const coreRows = semSections.flatMap((s) => s.rows);
  const sumCredit = (rows, pred) => rows.filter(pred).reduce((s, r) => s + parseCreditValue(r.credit), 0);
  const payload = {
    studentName: getInfoValue(infoItems, ['Name', 'Student Name']),
    studentId: getInfoValue(infoItems, ['Id', 'Student Id']),
    program: getInfoValue(infoItems, ['Program', 'Department']),
    cgpa: extractNumber(getInfoValue(infoItems, ['Cgpa', 'CGPA'])),
    totalCredits: coreRows.reduce((s, r) => s + parseCreditValue(r.credit), 0),
    totalCourses: coreRows.length,
    stateCredits: {
      completed: sumCredit(coreRows, (r) => r.state === 'done'),
      ongoing: sumCredit(coreRows, (r) => r.state === 'ong'),
      withdrawn: sumCredit(coreRows, (r) => r.state === 'wdn'),
      notAttempted: sumCredit(coreRows, (r) => r.state === 'nd'),
    },
    stateCounts: {
      completed: coreRows.filter((r) => r.state === 'done').length,
      ongoing: coreRows.filter((r) => r.state === 'ong').length,
      withdrawn: coreRows.filter((r) => r.state === 'wdn').length,
      notAttempted: coreRows.filter((r) => r.state === 'nd').length,
    },
    capturedAt: new Date().toISOString(),
  };
  chrome.storage.local.get({ aiubGraphData: {} }, (res) => {
    const next = Object.assign({}, res.aiubGraphData || {});
    next.curriculum = payload;
    next.updatedAt = new Date().toISOString();
    chrome.storage.local.set({ aiubGraphData: next });
  });
}

// ── React components ─────────────────────────────────────────────────────────

function GradePill({ grades }) {
  if (!grades.length) return <span className="text-[12px] text-slate-300">—</span>;
  const last = grades[grades.length - 1];
  const color = GRADE_BG[last.grade] || '#90a4ae';
  const label = last.grade === '-' ? 'Ongoing' : last.grade;
  return <span className="text-[11px] font-bold" style={{ color }}>{label}</span>;
}

function SemLines({ grades }) {
  if (!grades.length) return <span className="text-[12px] text-slate-300">—</span>;
  return (
    <div>
      {grades.map((g, i) => (
        <div key={i} className="text-[11px] text-slate-500 leading-relaxed">{g.sem}</div>
      ))}
    </div>
  );
}

function LockBadge({ status }) {
  const isLocked = status === 'Locked';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
      isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    }`}>
      {status}
    </span>
  );
}

function SemTable({ sec }) {
  const rowBg = (state) => ({ ong: 'bg-sky-50', wdn: 'bg-red-50', nd: 'bg-slate-50', done: '' }[state] || '');
  const codeColor = (state) => ({ ong: 'text-blue-600', wdn: 'text-red-600', nd: 'text-slate-300', done: 'text-blue-900' }[state] || 'text-blue-900');

  return (
    <div>
      <div className="inline-flex items-center text-[11px] font-bold text-slate-600 uppercase tracking-wide bg-slate-100 border border-slate-200 rounded px-2.5 py-1 mt-3.5 mb-1.5">
        {sec.label}
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden mb-1.5">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {['Code', 'Course', 'Prerequisite', 'Semester Taken', 'Grade'].map((h, i) => (
                <th key={h} className="bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200 text-left" style={{ width: [null,'auto','25%','23%','8%'][i] }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sec.rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-100 last:border-b-0 hover:bg-blue-50 ${rowBg(r.state)}`}>
                <td className={`px-3 py-2 font-mono text-[12px] font-semibold whitespace-nowrap ${codeColor(r.state)}`}>{r.code}</td>
                <td className={`px-3 py-2 ${r.state === 'nd' ? 'text-slate-400' : 'text-slate-700'}`}>{r.name}</td>
                <td className="px-3 py-2 text-[12px] text-slate-500 leading-snug">{r.prerequisite || 'Nil'}</td>
                <td className="px-3 py-2"><SemLines grades={r.grades} /></td>
                <td className="px-3 py-2 text-center"><GradePill grades={r.grades} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotAttemptedSection({ semSections, electiveRows }) {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [];
  semSections.forEach((sec, i) => {
    const nd = sec.rows.filter((r) => r.state === 'nd');
    if (nd.length) tabs.push({ label: sec.label || `Semester ${i + 1}`, rows: nd });
  });
  const electiveNA = electiveRows.filter((r) => r.state === 'nd');
  if (electiveNA.length) tabs.push({ label: 'Elective', rows: electiveNA });

  if (!tabs.length) {
    return (
      <div className="bg-amber-50 border border-yellow-200 rounded-xl p-4 mb-5">
        <div className="text-center text-green-600 text-[13px] font-semibold bg-green-50 rounded-lg border border-green-200 py-3.5">
          ✓ All courses have been attempted!
        </div>
      </div>
    );
  }

  const total = tabs.reduce((s, t) => s + t.rows.length, 0);
  const cur = tabs[activeTab] || tabs[0];

  return (
    <div className="bg-amber-50 border border-yellow-200 rounded-xl p-4 mb-5">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-amber-800 bg-amber-100 border-l-[3px] border-amber-500 rounded px-3 py-1.5 mb-3">
        ⏳ Not Attempted Yet
        <span className="ml-auto bg-yellow-200 text-amber-900 rounded-full text-[10px] font-bold px-2 py-0.5">{total}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold border cursor-pointer transition-all outline-none ${
              i === activeTab
                ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
            <span className={`rounded-full text-[10px] font-bold px-1.5 ${i === activeTab ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {t.rows.length}
            </span>
          </button>
        ))}
      </div>

      {cur && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Code', 'Course Name', 'Prerequisite', 'Status', 'Need To Complete'].map((h) => (
                  <th key={h} className="bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cur.rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-b-0 hover:bg-amber-50/60">
                  <td className="px-3 py-2 font-mono text-[12px] font-semibold text-slate-300">{r.code}</td>
                  <td className="px-3 py-2 text-slate-500">{r.name}</td>
                  <td className="px-3 py-2 text-[12px] text-slate-400 leading-snug">{r.prerequisite || 'Nil'}</td>
                  <td className="px-3 py-2 text-center"><LockBadge status={r.prereqStatus || 'Unlocked'} /></td>
                  <td className="px-3 py-2 text-[12px] text-slate-400">{r.needToComplete || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CurriculumGradeReport({ infoItems, semSections, electiveRows, printHref }) {
  const graphHref = (() => { try { return chrome.runtime.getURL('graphs.html'); } catch { return ''; } })();

  return (
    <div className="text-[13px] text-slate-800 py-4 px-1" style={{ boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-100">
        <h2 className="text-[16px] font-bold text-slate-900 m-0">
          Curriculum <span className="text-blue-600">Grade Report</span>
        </h2>
        <div className="flex items-center gap-2">
          {printHref && (
            <a href={printHref} className="text-[11px] font-semibold text-slate-500 border border-slate-300 rounded-md px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-blue-700 hover:border-indigo-300 no-underline transition-all">
              🖨 Print
            </a>
          )}
          {graphHref && (
            <a href={graphHref} className="text-[11px] font-semibold text-sky-700 border border-sky-200 rounded-md px-3 py-1.5 bg-sky-50 hover:bg-sky-100 no-underline transition-all">
              📊 Graph
            </a>
          )}
        </div>
      </div>

      {/* Info grid */}
      {infoItems.length > 0 && (
        <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {infoItems.map(({ k, v }) => (
            <div key={k} className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all cursor-default">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">{k}</div>
              <div className={k === 'Cgpa' ? 'text-[26px] font-extrabold text-green-600 leading-tight' : 'text-[13px] font-medium text-slate-900'}>
                {v || '—'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Not attempted section */}
      <NotAttemptedSection semSections={semSections} electiveRows={electiveRows} />

      {/* Core curriculum */}
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-blue-800 bg-blue-50 border-l-[3px] border-blue-600 rounded px-3 py-1.5 mb-2 mt-5">
        Core Curriculum
      </div>
      {semSections.map((sec, i) => <SemTable key={i} sec={sec} />)}

      {/* Elective curriculum */}
      {electiveRows.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-green-800 bg-green-50 border-l-[3px] border-green-600 rounded px-3 py-1.5 mb-2 mt-5">
            Elective Curriculum
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {['Code', 'Course', 'Prerequisite', 'Semester Taken', 'Grade'].map((h) => (
                    <th key={h} className="bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {electiveRows.map((r, i) => (
                  <tr key={i} className={`border-b border-slate-100 last:border-b-0 hover:bg-blue-50 ${r.state === 'ong' ? 'bg-sky-50' : r.state === 'wdn' ? 'bg-red-50' : r.state === 'nd' ? 'bg-slate-50' : ''}`}>
                    <td className="px-3 py-2 font-mono text-[12px] font-semibold text-blue-900">{r.code}</td>
                    <td className={`px-3 py-2 ${r.state === 'nd' ? 'text-slate-400' : 'text-slate-700'}`}>{r.name}</td>
                    <td className="px-3 py-2 text-[12px] text-slate-500">{r.prerequisite || 'Nil'}</td>
                    <td className="px-3 py-2"><SemLines grades={r.grades} /></td>
                    <td className="px-3 py-2 text-center"><GradePill grades={r.grades} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3.5 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
        {[['#2563eb','Ongoing'],['#059669','Completed'],['#dc2626','Withdrawn'],['#cbd5e1','Not Attempted']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Self-mount ───────────────────────────────────────────────────────────────

(function mount() {
  if (window.__aiubGradeCurrMounted) return;
  if (!window.location.href.includes('/Student/GradeReport/ByCurriculum')) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function init() {
      const gr = document.querySelector('.grade-report');
      if (!gr) { setTimeout(init, 400); return; }
      if (window.__aiubGradeCurrMounted) return;
      window.__aiubGradeCurrMounted = true;

      const rootPanel = gr.closest('.panel');
      if (rootPanel) {
        rootPanel.style.cssText = 'box-shadow:none!important;border:none!important;background:transparent!important;margin-bottom:0!important';
        const heading = rootPanel.querySelector('.panel-heading');
        if (heading) heading.style.display = 'none';
        const pb = rootPanel.querySelector('.panel-body');
        if (pb) pb.style.cssText = 'padding:0!important;background:transparent!important';
      }

      const printLink = document.querySelector('a[href*="PrintGradeReport"]');
      const printHref = printLink?.getAttribute('href') || null;
      const safePrint = printHref && /^[/?#]/.test(printHref) ? printHref : null;

      let infoItems = null;
      let inElective = false;
      let semLabel = null;
      const semSections = [];
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
          const rows = [...el.querySelectorAll('tbody tr')].slice(1).map((tr) => {
            const tds = [...tr.querySelectorAll('td')];
            if (tds.length < 3) return null;
            const code = tds[0].textContent.trim();
            const name = tds[1].textContent.trim();
            const grades = parseGrades(tds[2].textContent);
            return { code, name, credit: findCourseCredit(code, name), grades, prerequisite: findPrerequisite(code, name), state: getState(grades) };
          }).filter(Boolean);

          if (inElective) electiveRows.push(...rows);
          else { semSections.push({ label: semLabel || '', rows }); semLabel = null; }
        }
      }

      addLockInfo(semSections, electiveRows);
      saveGraphData(infoItems || [], semSections, electiveRows);

      gr.innerHTML = '';
      const container = document.createElement('div');
      gr.appendChild(container);
      createRoot(container).render(
        <CurriculumGradeReport
          infoItems={infoItems || []}
          semSections={semSections}
          electiveRows={electiveRows}
          printHref={safePrint}
        />
      );
    }

    loadCourseCatalog().finally(() => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    });
  });
})();
