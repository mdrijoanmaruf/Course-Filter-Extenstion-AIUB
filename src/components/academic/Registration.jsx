import { createRoot } from 'react-dom/client';
import '../../content.css';

// ── Data parsers (ported from old Registration.js) ──────────────────────────

function parseScheduleLine(text) {
  const typeMatch = text.match(/^\(([^)]+)\)/);
  const type = typeMatch ? typeMatch[1] : '';
  const afterType = text.replace(/^\([^)]+\)\s*/, '');
  const roomIdx = afterType.lastIndexOf('Room:');
  const timePart = (roomIdx > 0 ? afterType.slice(0, roomIdx) : afterType)
    .replace(/^Time:\s*/, '').trim();
  const room = roomIdx > 0 ? afterType.slice(roomIdx + 5).trim() : '';
  return { type, time: timePart, room };
}

function parseCreditSummary(tbl) {
  const items = [];
  tbl.querySelectorAll('div[class*="col-"]').forEach((col) => {
    const labels = [...col.children].filter((el) => el.tagName === 'LABEL');
    if (labels.length >= 2) {
      const key = labels[0].textContent.replace(':', '').trim();
      const val = labels[1].textContent.trim();
      if (key) items.push({ key, val });
    }
  });
  return items;
}

function parseCourses(table) {
  const courses = [];
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const tds = [...tr.querySelectorAll('td')];
    if (!tds.length) return;
    const a = tds[0].querySelector('a');
    if (!a) return;

    const fullText = a.textContent.trim();
    const sectionMatch = fullText.match(/\[([A-Z0-9]+)\]$/);
    const section = sectionMatch ? sectionMatch[1] : '';
    const withoutSec = fullText.replace(/\s*\[[A-Z0-9]+\]$/, '').trim();
    const dashIdx = withoutSec.indexOf('-');
    const code = dashIdx >= 0 ? withoutSec.slice(0, dashIdx).trim() : '';
    const name = dashIdx >= 0 ? withoutSec.slice(dashIdx + 1).trim() : withoutSec;

    const schedules = [...tds[0].querySelectorAll('div')].reduce((acc, d) => {
      const span = d.querySelector('span');
      if (!span || span.style.color === 'red') return acc;
      const txt = span.textContent.trim();
      if (txt) acc.push(parseScheduleLine(txt));
      return acc;
    }, []);

    const dropSpan = tds[0].querySelector('span[style*="color: red"]');
    const droppedText = dropSpan ? dropSpan.textContent.trim() : '';
    const credStr = tds[1] ? tds[1].textContent.trim() : '';
    const href = a.getAttribute('href') || '#';

    courses.push({ code, name, section, schedules, droppedText, credStr, href });
  });
  return courses;
}

function parseFees(div) {
  const items = [];
  div.querySelectorAll('li').forEach((li) => {
    const badge = li.querySelector('.badge');
    if (!badge) return;
    const amt = badge.textContent.trim();
    const clone = li.cloneNode(true);
    clone.querySelector('.badge')?.remove();
    const label = clone.textContent.trim();

    const si = li.querySelector('strong.text-info, label.text-info, .text-info');
    const sw = li.querySelector('label.text-warning, .text-warning');
    const ss = li.querySelector('label.text-success, .text-success');
    const st = li.querySelector('strong');

    let type = 'normal';
    if (si) {
      type = si.textContent.toLowerCase().includes('net') ? 'net-total' : 'total';
    } else if (sw) {
      type = label.toLowerCase().includes('prev') ? 'prev' : 'deduction';
    } else if (ss) {
      type = 'balance';
    } else if (st) {
      type = 'paid';
    }

    items.push({ label, amt, type });
  });
  return items;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function schedTypeClass(type) {
  const t = (type || '').toLowerCase();
  if (t === 'theory') return 'bg-blue-100/60 text-blue-700 text-[10px] font-semibold';
  if (t === 'lab') return 'bg-cyan-100/60 text-cyan-700 text-[10px] font-semibold';
  return 'bg-slate-100/60 text-slate-600 text-[10px] font-semibold';
}

function CourseCard({ course }) {
  const isDropped = !!course.droppedText;
  const dropMatch = course.droppedText.match(/\(([^)]+)\)/);
  const dropDetail = dropMatch ? dropMatch[1] : '';
  const safeHref = course.href && /^[/?#]/.test(course.href) ? course.href : '#';
  
  const cardBg = isDropped ? '#fef2f2' : '#f8fafc';
  const cardBorder = isDropped ? '#fecaca' : '#cbd5e1';
  const codeColor = isDropped ? '#991b1b' : '#0284c7';
  const sectionBg = isDropped ? '#fee2e2' : '#dbeafe';
  const sectionBorder = isDropped ? '#fca5a5' : '#0284c7';

  return (
    <div 
      className="border rounded-lg overflow-hidden transition-all hover:shadow-md shadow-sm"
      style={{
        backgroundColor: cardBg,
        borderColor: cardBorder,
        borderWidth: '1px'
      }}
    >
      <div className="flex items-start gap-2.5 px-3.5 pt-2.5 pb-2">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[11px] font-bold tracking-wide mb-0.5 uppercase" style={{ color: codeColor }}>
            <a href={safeHref} style={{ color: 'inherit', textDecoration: 'none' }}>{course.code}</a>
          </div>
          <div className={`text-[13px] font-semibold leading-snug ${isDropped ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
            {course.name}
          </div>
        </div>
        {course.section && (
          <div 
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[14px] font-extrabold border shadow-sm"
            style={{
              backgroundColor: sectionBg,
              borderColor: sectionBorder,
              borderWidth: '1.5px',
              color: isDropped ? '#991b1b' : '#0369a1'
            }}
          >
            {course.section}
          </div>
        )}
      </div>

      {course.schedules.length > 0 && (
        <div className="px-3.5 pb-2 flex flex-col gap-1.5">
          {course.schedules.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] flex-wrap">
              <span className={`text-[10px] py-0.5 px-2 rounded-md flex-shrink-0 ${schedTypeClass(s.type)}`}>
                {s.type || 'Time'}
              </span>
              <span className="text-slate-600">{s.time}</span>
              {s.room && <span className="ml-auto font-mono text-[10px] font-bold text-slate-500 whitespace-nowrap bg-white/60 px-1.5 py-0.5 rounded">{s.room}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-3.5 pt-2 pb-2.5 gap-2" style={{ borderTop: '1px solid rgba(203, 213, 225, 0.4)' }}>
        <span className="font-mono text-[10px] font-semibold text-slate-500">{course.credStr}</span>
        {isDropped && (
          <span className="inline-flex items-center gap-1 bg-rose-500 text-white rounded px-2 py-0.5 text-[10px] font-semibold">
            ⚠ Dropped {dropDetail}
          </span>
        )}
      </div>
    </div>
  );
}

function FeeRow({ item }) {
  const num = parseFloat(item.amt.replace(/,/g, ''));
  const isZero = !isNaN(num) && num === 0 && item.type === 'normal';
  const needsDivider = ['total', 'net-total', 'balance'].includes(item.type);

  const lblClass = {
    normal: isZero ? 'text-slate-300' : 'text-slate-600',
    total: 'font-semibold text-slate-900',
    'net-total': 'font-semibold text-slate-900',
    deduction: 'font-semibold text-slate-700',
    prev: 'font-semibold text-slate-700',
    paid: 'font-semibold text-slate-600',
    balance: 'font-semibold text-slate-900',
  }[item.type] || 'text-slate-600';

  const amtClass = {
    normal: isZero ? 'text-slate-300' : 'text-slate-700',
    total: 'font-bold text-blue-600 text-[13px]',
    'net-total': 'font-bold text-cyan-600 text-[13px]',
    deduction: 'font-semibold text-slate-700',
    prev: 'font-semibold text-slate-700',
    paid: 'font-semibold text-slate-600',
    balance: `font-bold text-[13px] ${num > 0 ? 'text-rose-600' : 'text-cyan-600'}`,
  }[item.type] || 'text-slate-700';

  return (
    <>
      {needsDivider && <div className="h-px bg-slate-200 my-1" />}
      <div className="flex items-center justify-between px-3.5 py-2 gap-2 hover:bg-slate-50/50 transition-colors">
        <span className={`text-[12px] ${lblClass}`}>{item.label}</span>
        <span className={`font-mono text-[12px] whitespace-nowrap ${amtClass}`}>{item.amt}</span>
      </div>
    </>
  );
}

function RegistrationView({ semOptions, printHref, creditItems, courses, fees, onSemChange }) {
  return (
    <div className="text-[13px] text-slate-800" style={{ boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
        <h2 className="text-[18px] font-bold text-slate-900 tracking-tight m-0">
          Course <span style={{ background: 'linear-gradient(135deg, #0284c7, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Registration</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {semOptions.length > 0 && (
            <select
              className="text-[12px] font-semibold text-slate-700 border border-slate-300 rounded-lg px-3 py-2 bg-white cursor-pointer outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all"
              onChange={(e) => onSemChange(e.target.value)}
              defaultValue={semOptions.find((o) => o.selected)?.val || ''}
            >
              {semOptions.map((o) => (
                <option key={o.val} value={o.val}>{o.text}</option>
              ))}
            </select>
          )}
          {printHref && (
            <a href={printHref} className="text-[11px] font-semibold text-white rounded-lg px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all no-underline whitespace-nowrap shadow-sm hover:shadow-md border border-blue-700">
              🖨 Print
            </a>
          )}
        </div>
      </div>

      {/* Credit chips */}
      {creditItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {creditItems.map(({ key, val }) => {
            const active = parseFloat(val) > 0;
            return (
              <span 
                key={key} 
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-all ${
                  active ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
              >
                <span className="font-bold text-[12px]">{val}</span>{key}
              </span>
            );
          })}
        </div>
      )}

      {/* Body: courses + fee panel */}
      <div className="grid gap-4" style={{ gridTemplateColumns: fees.length ? '1fr 270px' : '1fr' }}>
        <div className="flex flex-col gap-2.5">
          {courses.length > 0
            ? courses.map((c, i) => <CourseCard key={i} course={c} />)
            : <p className="text-slate-400 text-[13px] italic">No registered courses.</p>
          }
        </div>

        {fees.length > 0 && (
          <div 
            className="border rounded-lg overflow-hidden shadow-md" 
            style={{ 
              position: 'sticky', 
              top: 16, 
              alignSelf: 'start',
              backgroundColor: '#f8fafc',
              borderColor: '#cbd5e1',
              borderWidth: '1px'
            }}
          >
            <div 
              className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-blue-700 text-white"
              style={{ borderBottom: '1px solid #cbd5e1' }}
            >
              💰 Fees
            </div>
            <div className="py-1">
              {fees.map((item, i) => <FeeRow key={i} item={item} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Self-mount ───────────────────────────────────────────────────────────────

(function mount() {
  if (window.__aiubRegMounted) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function init() {
      const panel =
        document.querySelector('#main-content .margin5 .panel.panel-default') ||
        document.querySelector('#main-content .panel.panel-default');
      if (!panel) { setTimeout(init, 300); return; }

      const hasCourses = document.querySelector('.table-details');
      const hasFees = document.querySelector('#divAssesment');
      if (!hasCourses && !hasFees) { setTimeout(init, 400); return; }

      if (window.__aiubRegMounted) return;
      window.__aiubRegMounted = true;

      const origSelect = panel.querySelector('#SemesterDropDown');
      const semOptions = origSelect
        ? [...origSelect.querySelectorAll('option')].map((o) => ({
            val: o.value, text: o.textContent.trim(), selected: o.selected,
          }))
        : [];

      const printBtn = panel.querySelector('a.btn-danger');
      const printHref = printBtn ? printBtn.getAttribute('href') : null;
      const safeHref = printHref && /^[/?#]/.test(printHref) ? printHref : null;

      const creditTbl = panel.querySelector('.panel-body table');
      const creditItems = creditTbl ? parseCreditSummary(creditTbl) : [];

      const courseTbl = panel.querySelector('.table-details');
      const courses = courseTbl ? parseCourses(courseTbl) : [];

      const divAssesment = panel.querySelector('#divAssesment');
      const fees = divAssesment ? parseFees(divAssesment) : [];

      panel.style.cssText = 'border:none!important;box-shadow:none!important;background:transparent!important';
      const heading = panel.querySelector('.panel-heading');
      if (heading) heading.style.display = 'none';

      const panelBody = panel.querySelector('.panel-body');
      if (!panelBody) return;
      panelBody.style.cssText = 'padding:8px 0 0!important;background:transparent!important';
      panelBody.innerHTML = '';

      const root = document.createElement('div');
      panelBody.appendChild(root);
      createRoot(root).render(
        <RegistrationView
          semOptions={semOptions}
          printHref={safeHref}
          creditItems={creditItems}
          courses={courses}
          fees={fees}
          onSemChange={(val) => { if (val) window.location.href = val; }}
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
