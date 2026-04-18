import { createRoot } from 'react-dom/client';
import '../../content.css';

function parseCourses(panel) {
  const courses = [];
  panel.querySelectorAll('.StudentCourseList .panel.panel-primary').forEach((el) => {
    const body = el.querySelector('.panel-body');
    const footer = el.querySelector('.panel-footer');
    if (!body) return;

    const lines = Array.from(body.childNodes)
      .map((n) => (n.textContent || '').trim())
      .filter(Boolean);

    const labelEls = Array.from(body.querySelectorAll('.label'));
    const labels = labelEls.map((l) => ({
      text: l.textContent.trim(),
      type: l.classList.contains('label-success')
        ? 'success'
        : l.classList.contains('label-danger')
        ? 'danger'
        : 'info',
    }));

    const links = footer
      ? Array.from(footer.querySelectorAll('a')).map((a) => ({
          text: a.textContent.trim(),
          href: a.getAttribute('href') || '#',
          onClick: a.getAttribute('ng-click') || a.getAttribute('onclick') || '',
        }))
      : [];

    const name = lines.find((l) => l.length > 2 && !labelEls.some((lb) => lb.textContent.trim() === l)) || '';
    
    // Check if course is dropped (has a 'Dropped' label)
    const isDropped = labels.some((lb) => lb.text.toLowerCase() === 'dropped' || lb.text.toLowerCase().includes('drop'));

    courses.push({ name, lines, labels, links, el, isDropped });
  });
  return courses;
}

function getSemesterLabel(panel) {
  const sel = panel.querySelector('#SemesterDropDown');
  if (!sel) return '';
  const opt = sel.options[sel.selectedIndex];
  return opt ? opt.textContent.trim() : '';
}

// Assign a soft gradient per card index for variety
const CARD_PALETTES = [
  { bg: 'linear-gradient(145deg, #fdf4ff 0%, #fae8ff 50%, #ede9fe 100%)', accent: 'linear-gradient(90deg, #a855f7, #8b5cf6)', border: '#e9d5ff', nameColor: '#3b0764', lineColor: '#6b21a8' },
  { bg: 'linear-gradient(145deg, #fff7ed 0%, #ffedd5 50%, #fef9c3 100%)', accent: 'linear-gradient(90deg, #f97316, #eab308)', border: '#fed7aa', nameColor: '#431407', lineColor: '#9a3412' },
  { bg: 'linear-gradient(145deg, #f0fdf4 0%, #dcfce7 50%, #d1fae5 100%)', accent: 'linear-gradient(90deg, #22c55e, #10b981)', border: '#bbf7d0', nameColor: '#052e16', lineColor: '#166534' },
  { bg: 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 50%, #e0f2fe 100%)', accent: 'linear-gradient(90deg, #3b82f6, #06b6d4)', border: '#bfdbfe', nameColor: '#1e3a5f', lineColor: '#1d4ed8' },
  { bg: 'linear-gradient(145deg, #fff1f2 0%, #ffe4e6 50%, #fce7f3 100%)', accent: 'linear-gradient(90deg, #f43f5e, #ec4899)', border: '#fecdd3', nameColor: '#4c0519', lineColor: '#be123c' },
  { bg: 'linear-gradient(145deg, #f0fdfa 0%, #ccfbf1 50%, #cffafe 100%)', accent: 'linear-gradient(90deg, #14b8a6, #06b6d4)', border: '#99f6e4', nameColor: '#042f2e', lineColor: '#0f766e' },
];

function LabelBadge({ type, text }) {
  const styles = {
    info:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    success: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    danger:  { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
  };
  const s = styles[type] || styles.info;
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 20,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      letterSpacing: '0.04em',
    }}>
      {text}
    </span>
  );
}

function CourseCard({ course, index }) {
  const palette = CARD_PALETTES[index % CARD_PALETTES.length];
  const { isDropped } = course;

  const infoLines = course.lines.filter(
    (l) => l !== course.name && !course.labels.some((lb) => lb.text === l)
  );

  return (
    <div
      style={{
        background: isDropped 
          ? 'linear-gradient(145deg, #f5f5f5 0%, #eeeeee 50%, #e8e8e8 100%)'
          : palette.bg,
        border: `1.5px solid ${isDropped ? '#d1d5db' : palette.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: isDropped 
          ? '0 2px 8px rgba(0,0,0,0.04)' 
          : '0 2px 8px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s, transform 0.2s',
        display: 'flex',
        flexDirection: 'column',
        opacity: isDropped ? 0.7 : 1,
      }}
      onMouseEnter={e => { 
        if (!isDropped) {
          e.currentTarget.style.transform = 'translateY(-2px)'; 
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; 
        }
      }}
      onMouseLeave={e => { 
        e.currentTarget.style.transform = 'translateY(0)'; 
        e.currentTarget.style.boxShadow = isDropped 
          ? '0 2px 8px rgba(0,0,0,0.04)' 
          : '0 2px 8px rgba(0,0,0,0.05)'; 
      }}
    >
      {/* Accent stripe */}
      <div style={{ 
        height: 3, 
        background: isDropped 
          ? 'linear-gradient(90deg, #9ca3af, #6b7280)' 
          : palette.accent,
        flexShrink: 0 
      }} />

      <div style={{ padding: '14px 16px', flex: 1 }}>
        {/* Course name — strikethrough for dropped */}
        {course.name && (
          <div style={{
            fontWeight: 700,
            fontSize: 13.5,
            color: isDropped ? '#6b7280' : palette.nameColor,
            lineHeight: 1.4,
            marginBottom: 8,
            letterSpacing: '-0.01em',
            textDecoration: isDropped ? 'line-through' : 'none',
            textDecorationColor: isDropped ? '#9ca3af' : 'transparent',
            textDecorationThickness: '2px',
            textUnderlineOffset: '3px',
          }}>
            {course.name}
          </div>
        )}

        {/* Info lines — faded for dropped */}
        {infoLines.slice(0, 4).map((line, i) => (
          <div key={i} style={{
            fontSize: 11.5,
            color: isDropped ? '#9ca3af' : palette.lineColor,
            lineHeight: 1.5,
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            opacity: isDropped ? 0.6 : 0.8,
          }}>
            {line}
          </div>
        ))}

        {/* Status labels */}
        {course.labels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {course.labels.map((lb, i) => (
              <LabelBadge key={i} type={lb.type} text={lb.text} />
            ))}
          </div>
        )}
      </div>

      {/* Footer links — disabled for dropped */}
      {course.links.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 12px',
          padding: '10px 16px',
          background: isDropped
            ? 'rgba(107,114,128,0.08)'
            : 'rgba(255,255,255,0.55)',
          borderTop: `1px solid ${isDropped ? '#d1d5db' : palette.border}`,
        }}>
          {course.links.map((lk, i) => (
            <a
              key={i}
              href={isDropped ? '#' : lk.href}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isDropped ? '#9ca3af' : palette.lineColor,
                textDecoration: 'none',
                opacity: isDropped ? 0.5 : 0.85,
                transition: 'opacity 0.15s',
                cursor: isDropped ? 'default' : 'pointer',
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

function RegistrationView({ courses, semester }) {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 14,
        borderBottom: '2px solid #f1f5f9',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Book icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 4.5C4 3.12 5.12 2 6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5v-15z" stroke="#a855f7" strokeWidth="1.6"/>
              <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5H6.5A2.5 2.5 0 0 0 4 19.5z" stroke="#a855f7" strokeWidth="1.6"/>
              <path d="M8 7h8M8 11h5" stroke="#a855f7" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Registered Courses
            </h3>
          </div>
          {semester && (
            <p style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3, marginBottom: 0, marginLeft: 32 }}>
              {semester}
            </p>
          )}
        </div>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          padding: '4px 12px',
          borderRadius: 20,
          background: '#fdf4ff',
          color: '#7e22ce',
          border: '1px solid #e9d5ff',
        }}>
          {courses.length} {courses.length === 1 ? 'course' : 'courses'}
        </span>
      </div>

      {courses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 13 }}>
          No registered courses found.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
        }}>
          {courses.map((c, i) => (
            <CourseCard key={i} course={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mount ─────────────────────────────────────────────────────────────────────

(function mount() {
  if (window.__aiubHomeRegMounted) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    let attempts = 0;

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

      if (window.__aiubHomeRegMounted) return;
      window.__aiubHomeRegMounted = true;

      const semester = getSemesterLabel(regPanel);
      const courses  = parseCourses(regPanel);

      const heading = regPanel.querySelector('.panel-heading');
      if (heading) heading.style.display = 'none';
      regPanel.style.cssText = 'border:none!important;box-shadow:none!important;background:transparent!important';

      const panelBody = regPanel.querySelector('.panel-body');
      if (!panelBody) return;

      const originalContent = panelBody.innerHTML;
      panelBody.style.cssText = 'padding:0!important;background:transparent!important;border:none!important';
      panelBody.innerHTML = '';

      const container = document.createElement('div');
      panelBody.appendChild(container);
      createRoot(container).render(
        <RegistrationView courses={courses} semester={semester} />
      );
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryMount);
    } else {
      tryMount();
    }
  });
})();