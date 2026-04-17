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

    // First non-label text line is typically the course name
    const name = lines.find((l) => l.length > 2 && !labelEls.some((lb) => lb.textContent.trim() === l)) || '';

    courses.push({ name, lines, labels, links, el });
  });
  return courses;
}

function getSemesterLabel(panel) {
  const sel = panel.querySelector('#SemesterDropDown');
  if (!sel) return '';
  const opt = sel.options[sel.selectedIndex];
  return opt ? opt.textContent.trim() : '';
}

function LabelBadge({ type, text }) {
  const styles = {
    info:    'bg-blue-50 text-blue-700 border border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    danger:  'bg-red-50 text-red-700 border border-red-200',
  };
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${styles[type] || styles.info}`}>
      {text}
    </span>
  );
}

function CourseCard({ course }) {
  const infoLines = course.lines.filter(
    (l) => l !== course.name && !course.labels.some((lb) => lb.text === l)
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
      {/* Accent stripe */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0284c7,#06b6d4)' }} />

      <div className="p-3.5">
        {/* Course name */}
        {course.name && (
          <div className="font-bold text-[13px] text-slate-800 leading-tight mb-2">
            {course.name}
          </div>
        )}

        {/* Info lines */}
        {infoLines.slice(0, 4).map((line, i) => (
          <div key={i} className="text-[11.5px] text-slate-500 leading-snug mb-0.5 truncate">
            {line}
          </div>
        ))}

        {/* Status labels */}
        {course.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {course.labels.map((lb, i) => (
              <LabelBadge key={i} type={lb.type} text={lb.text} />
            ))}
          </div>
        )}
      </div>

      {/* Footer links */}
      {course.links.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 px-3.5 py-2.5 bg-slate-50 border-t border-slate-100">
          {course.links.map((lk, i) => (
            <a
              key={i}
              href={lk.href}
              className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors no-underline"
              style={{ textDecoration: 'none' }}
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-100">
        <div>
          <h3 className="text-[16px] font-bold text-slate-900 leading-tight m-0">
            Registered{' '}
            <span style={{ background: 'linear-gradient(135deg,#0284c7,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Courses
            </span>
          </h3>
          {semester && (
            <p className="text-[11px] text-slate-400 mt-0.5 m-0">{semester}</p>
          )}
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
          {courses.length} {courses.length === 1 ? 'course' : 'courses'}
        </span>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-[13px]">
          No registered courses found.
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
          {courses.map((c, i) => (
            <CourseCard key={i} course={c} />
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

      // Wait until panel AND at least one course card are present
      const hasCourses = regPanel?.querySelector('.StudentCourseList .panel.panel-primary');
      if (!regPanel || !hasCourses) {
        if (++attempts < 30) setTimeout(tryMount, 300);
        return;
      }

      if (window.__aiubHomeRegMounted) return;
      window.__aiubHomeRegMounted = true;

      const semester = getSemesterLabel(regPanel);
      const courses  = parseCourses(regPanel);

      // Hide original heading
      const heading = regPanel.querySelector('.panel-heading');
      if (heading) heading.style.display = 'none';
      regPanel.style.cssText = 'border:none!important;box-shadow:none!important;background:transparent!important';

      const panelBody = regPanel.querySelector('.panel-body');
      if (!panelBody) return;

      // Stash original content for the semester dropdown to keep working
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
