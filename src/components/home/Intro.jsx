import { createRoot } from 'react-dom/client';
import '../../content.css';

function getStudentName() {
  const el =
    document.querySelector('.navbar-text .navbar-link small') ||
    document.querySelector('.navbar-text .navbar-link');
  if (!el) return '';
  const raw = el.textContent.trim();
  const parts = raw.split(',').map((s) => s.trim());
  const tc = (s) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  if (parts.length >= 2) return tc(parts[1]) + ' ' + tc(parts[0]);
  return tc(raw);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function IntroHeader({ name }) {
  const firstName = name.split(' ')[0] || 'Student';
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mb-4 pb-3 border-b-2 border-slate-100">
      <h2 className="text-[22px] font-bold text-slate-900 mb-1 leading-tight">
        {getGreeting()},{' '}
        <span className="text-blue-600">{firstName}</span>!
      </h2>
      <p className="text-[13px] text-slate-500">{dateStr}</p>
    </div>
  );
}

(function mount() {
  if (window.__aiubIntroMounted) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function tryMount() {
      const mainContent = document.getElementById('main-content');
      if (!mainContent) { setTimeout(tryMount, 200); return; }
      if (window.__aiubIntroMounted) return;
      window.__aiubIntroMounted = true;

      const contentWrap =
        mainContent.querySelector('.row > .col-sm-12') ||
        mainContent.querySelector('.row > .col-xs-12') ||
        mainContent.querySelector('.row > [class*="col-"]');
      if (!contentWrap) return;

      const container = document.createElement('div');
      container.id = 'aiub-intro-root';
      contentWrap.insertBefore(container, contentWrap.firstChild);
      createRoot(container).render(<IntroHeader name={getStudentName()} />);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryMount);
    } else {
      tryMount();
    }
  });
})();
