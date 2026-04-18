import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import '../../content.css';

// ── Data extraction ────────────────────────────────────────────────────────────

function getSemesterOptions(panel) {
  const sel = panel.querySelector('#SemesterDropDown');
  if (!sel) return { options: [], current: '' };
  return {
    options: Array.from(sel.options).map((o) => ({
      value: o.value,
      text: o.textContent.trim(),
      selected: o.selected,
    })),
    current: sel.value,
  };
}

function parseCourses(panel) {
  const courses = [];
  panel.querySelectorAll('.StudentCourseList .panel.panel-primary').forEach((el) => {
    const body   = el.querySelector('.panel-body');
    const footer = el.querySelector('.panel-footer');
    if (!body) return;

    // Course name is a raw text node: "CODE - COURSE NAME [SECTION]"
    const nameNode = Array.from(body.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
    );
    const name = nameNode ? nameNode.textContent.trim() : '';

    // Status badges (.label elements)
    const labelEls = Array.from(body.querySelectorAll('.label'));
    const labels = labelEls.map((l) => ({
      text: l.textContent.trim(),
      type: l.classList.contains('label-success') ? 'success'
          : l.classList.contains('label-danger')  ? 'danger'
          : 'info',
    }));

    // Result line from the last <div>
    const divs = Array.from(body.querySelectorAll(':scope > div'));
    const resultText = (divs.find((d) => d.textContent.includes('Result'))?.textContent || '').trim();

    // Footer links (TSF, Notes, Notice)
    const links = footer
      ? Array.from(footer.querySelectorAll('a')).map((a) => ({
          text: a.textContent.trim(),
          href: a.getAttribute('href') || '#',
        }))
      : [];

    const isDropped = labels.some((lb) => lb.text.toLowerCase().includes('drop'));

    courses.push({ name, labels, resultText, links, isDropped });
  });
  return courses;
}

// ── Card colour palettes ───────────────────────────────────────────────────────

const PALETTES = [
  { bg: 'linear-gradient(145deg,#fdf4ff,#fae8ff,#ede9fe)', accent: 'linear-gradient(90deg,#a855f7,#8b5cf6)', border: '#e9d5ff', name: '#3b0764', sub: '#7e22ce' },
  { bg: 'linear-gradient(145deg,#fff7ed,#ffedd5,#fef9c3)', accent: 'linear-gradient(90deg,#f97316,#eab308)', border: '#fed7aa', name: '#431407', sub: '#9a3412' },
  { bg: 'linear-gradient(145deg,#f0fdf4,#dcfce7,#d1fae5)', accent: 'linear-gradient(90deg,#22c55e,#10b981)', border: '#bbf7d0', name: '#052e16', sub: '#166534' },
  { bg: 'linear-gradient(145deg,#eff6ff,#dbeafe,#e0f2fe)', accent: 'linear-gradient(90deg,#3b82f6,#06b6d4)', border: '#bfdbfe', name: '#1e3a5f', sub: '#1d4ed8' },
  { bg: 'linear-gradient(145deg,#fff1f2,#ffe4e6,#fce7f3)', accent: 'linear-gradient(90deg,#f43f5e,#ec4899)', border: '#fecdd3', name: '#4c0519', sub: '#be123c' },
  { bg: 'linear-gradient(145deg,#f0fdfa,#ccfbf1,#cffafe)', accent: 'linear-gradient(90deg,#14b8a6,#06b6d4)', border: '#99f6e4', name: '#042f2e', sub: '#0f766e' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function LabelBadge({ type, text }) {
  const s = {
    info:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    success: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    danger:  { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
  }[type] || { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };

  return (
    <span style={{
      display: 'inline-block', fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      letterSpacing: '0.04em',
    }}>
      {text}
    </span>
  );
}

function CourseCard({ course, index }) {
  const p = PALETTES[index % PALETTES.length];
  const { isDropped } = course;
  const bg     = isDropped ? 'linear-gradient(145deg,#f5f5f5,#eeeeee,#e8e8e8)' : p.bg;
  const border = isDropped ? '#d1d5db' : p.border;
  const accent = isDropped ? 'linear-gradient(90deg,#9ca3af,#6b7280)' : p.accent;

  return (
    <div
      style={{
        background: bg, border: `1.5px solid ${border}`, borderRadius: 14,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s,transform 0.2s',
        opacity: isDropped ? 0.72 : 1,
      }}
      onMouseEnter={e => {
        if (!isDropped) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; }
      }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
    >
      {/* Accent stripe */}
      <div style={{ height: 3, background: accent, flexShrink: 0 }} />

      <div style={{ padding: '13px 15px', flex: 1 }}>
        {/* Course name */}
        {course.name && (
          <div style={{
            fontWeight: 700, fontSize: 13, lineHeight: 1.45, marginBottom: 8,
            color: isDropped ? '#6b7280' : p.name,
            textDecoration: isDropped ? 'line-through' : 'none',
            textDecorationColor: '#9ca3af', textDecorationThickness: '2px',
          }}>
            {course.name}
          </div>
        )}

        {/* Result */}
        {course.resultText && (() => {
          const grade = course.resultText.replace(/^result\s*:\s*/i, '').trim();
          const hasGrade = grade && grade !== '-';
          const isPass = hasGrade && !['f', 'w', 'i', 'u'].includes(grade.toLowerCase());
          const isFail = hasGrade && grade.toLowerCase() === 'f';
          const style = isFail
            ? { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' }
            : isPass
            ? { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' }
            : { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Result</span>
              <span style={{
                fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 20,
                background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                letterSpacing: '0.03em',
              }}>
                {grade || '—'}
              </span>
            </div>
          );
        })()}

        {/* Status badges */}
        {course.labels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {course.labels.map((lb, i) => <LabelBadge key={i} type={lb.type} text={lb.text} />)}
          </div>
        )}
      </div>

      {/* Footer links */}
      {course.links.length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '3px 10px',
          padding: '9px 15px',
          background: isDropped ? 'rgba(107,114,128,0.07)' : 'rgba(255,255,255,0.55)',
          borderTop: `1px solid ${border}`,
        }}>
          {course.links.map((lk, i) => (
            <a key={i} href={lk.href} style={{
              fontSize: 11, fontWeight: 600, color: isDropped ? '#9ca3af' : p.sub,
              textDecoration: 'none', opacity: 0.85, transition: 'opacity 0.15s',
              pointerEvents: isDropped ? 'none' : 'auto',
            }}
              onMouseEnter={e => !isDropped && (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => !isDropped && (e.currentTarget.style.opacity = '0.85')}
            >
              {lk.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

function RegistrationView({ initialCourses, initialSemOpts, onSemChange, registerUpdater }) {
  const [courses, setCourses]   = useState(initialCourses);
  const [semOpts, setSemOpts]   = useState(initialSemOpts);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (registerUpdater) registerUpdater((newCourses, newSemOpts) => {
      setCourses(newCourses);
      if (newSemOpts) setSemOpts(newSemOpts);
      setLoading(false);
    });
  }, []);

  const total   = courses.length;
  const dropped = courses.filter((c) => c.isDropped).length;
  const active  = total - dropped;

  function handleSemChange(e) {
    const val = e.target.value;
    if (val && onSemChange) { setLoading(true); onSemChange(val); }
  }

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        marginBottom: 18, paddingBottom: 14, borderBottom: '2px solid #f1f5f9',
      }}>
        {/* Title + stats */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 4.5C4 3.12 5.12 2 6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5v-15z" stroke="#a855f7" strokeWidth="1.6"/>
              <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5H6.5A2.5 2.5 0 0 0 4 19.5z" stroke="#a855f7" strokeWidth="1.6"/>
              <path d="M8 7h8M8 11h5" stroke="#a855f7" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Registered Courses
            </h3>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, marginLeft: 29 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#fdf4ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}>
              {total} total
            </span>
            {active > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                {active} active
              </span>
            )}
            {dropped > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>
                {dropped} dropped
              </span>
            )}
          </div>
        </div>

        {/* Semester dropdown */}
        {semOpts.options.length > 0 && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <select
              defaultValue={semOpts.current}
              onChange={handleSemChange}
              style={{
                appearance: 'none', WebkitAppearance: 'none',
                padding: '7px 32px 7px 12px',
                fontSize: 12, fontWeight: 600, color: '#334155',
                background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
                border: '1.5px solid #cbd5e1', borderRadius: 10,
                cursor: 'pointer', outline: 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'border-color 0.2s,box-shadow 0.2s',
              }}
              onFocus={e => { e.target.style.borderColor = '#a855f7'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.12)'; }}
              onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
            >
              {semOpts.options.map((o, i) => (
                <option key={i} value={o.value}>{o.text}</option>
              ))}
            </select>
            {/* Chevron icon */}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <path d="M2 4l4 4 4-4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── Course grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
          Loading courses…
        </div>
      ) : courses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
          No registered courses found.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 13 }}>
          {courses.map((c, i) => <CourseCard key={i} course={c} index={i} />)}
        </div>
      )}
    </div>
  );
}

// ── Mount ──────────────────────────────────────────────────────────────────────

(function mount() {
  if (window.__aiubHomeRegMounted) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    let attempts = 0;
    let reactRoot = null;
    let originalSelect = null;
    let updateView = null; // callback to update React state

    function doMount(regPanel) {
      if (window.__aiubHomeRegMounted) return;
      window.__aiubHomeRegMounted = true;

      // Capture original select BEFORE hiding heading
      originalSelect = regPanel.querySelector('#SemesterDropDown');
      const semOpts = getSemesterOptions(regPanel);
      const courses = parseCourses(regPanel);

      // Hide heading only — keep panel-body DOM intact for AngularJS AJAX updates
      const heading = regPanel.querySelector('.panel-heading');
      if (heading) heading.style.display = 'none';
      regPanel.style.cssText = 'border:none!important;box-shadow:none!important;background:transparent!important';

      const panelBody = regPanel.querySelector('.panel-body');
      if (!panelBody) return;
      panelBody.style.cssText = 'padding:0!important;background:transparent!important;border:none!important';

      // Hide the original row content (don't remove — AngularJS needs #divCourseList in DOM)
      const originalRow = panelBody.querySelector('.row');
      if (originalRow) originalRow.style.display = 'none';

      // Insert our React container above the hidden original content
      const container = document.createElement('div');
      panelBody.insertBefore(container, panelBody.firstChild);

      function onSemesterChange(val) {
        if (!originalSelect) return;
        // Update original AngularJS select and trigger change event
        originalSelect.value = val;
        originalSelect.dispatchEvent(new Event('change', { bubbles: true }));

        // Watch #divCourseList for AngularJS DOM update, then refresh React
        const divCourseList = panelBody.querySelector('#divCourseList');
        if (!divCourseList) return;

        const observer = new MutationObserver(() => {
          observer.disconnect();
          // Keep original row hidden after Angular re-renders it
          if (originalRow) originalRow.style.display = 'none';
          const newCourses = parseCourses(regPanel);
          const newSemOpts = getSemesterOptions(regPanel);
          if (updateView) updateView(newCourses, newSemOpts);
        });
        observer.observe(divCourseList, { childList: true, subtree: true });
      }

      reactRoot = createRoot(container);
      reactRoot.render(
        <RegistrationView
          initialCourses={courses}
          initialSemOpts={semOpts}
          onSemChange={onSemesterChange}
          registerUpdater={(fn) => { updateView = fn; }}
        />
      );
    }

    function tryMount() {
      const mainContent = document.getElementById('main-content');
      if (!mainContent) {
        if (++attempts < 30) setTimeout(tryMount, 300);
        return;
      }

      let regPanel = null;
      mainContent.querySelectorAll('.panel-heading .panel-title').forEach((t) => {
        if (t.textContent.trim() === 'Registration') regPanel = t.closest('.panel');
      });

      const hasCourses = regPanel?.querySelector('.StudentCourseList .panel.panel-primary');
      if (!regPanel || !hasCourses) {
        if (++attempts < 30) setTimeout(tryMount, 300);
        return;
      }

      doMount(regPanel);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryMount);
    } else {
      tryMount();
    }
  });
})();
