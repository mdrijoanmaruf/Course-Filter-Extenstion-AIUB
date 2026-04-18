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
    <div style={{
      marginBottom: 20,
      paddingBottom: 16,
      borderBottom: '2px solid #f1f5f9',
      fontFamily: 'system-ui,-apple-system,sans-serif',
    }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.3 }}>
        {getGreeting()},{' '}
        <span style={{
          background: 'linear-gradient(135deg,#0284c7,#06b6d4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {firstName}
        </span>!
      </h2>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{dateStr}</p>
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
