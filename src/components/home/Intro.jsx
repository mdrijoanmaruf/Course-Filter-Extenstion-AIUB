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
      borderBottom: '2px solid #dbeafe',
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

function applyIntroCardDesign(contentWrap) {
  const teamsAlert = contentWrap.querySelector('.alert.alert-success');
  if (teamsAlert) {
    teamsAlert.style.cssText = `
      background: linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%) !important;
      border: 1px solid rgba(37, 99, 235, 0.24) !important;
      border-left: 4px solid #2563eb !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 10px rgba(30, 58, 138, 0.08) !important;
      padding: 16px !important;
      color: #1f2937 !important;
      margin-bottom: 14px !important;
    `;

    const lead = teamsAlert.querySelector(':scope > b');
    if (lead) {
      lead.style.cssText = `
        display: block !important;
        color: #1e3a8a !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        margin-bottom: 12px !important;
      `;
    }

    const teamsTable = teamsAlert.querySelector('table.table');
    if (teamsTable) {
      teamsTable.style.cssText = `
        margin-bottom: 0 !important;
        border: 1px solid #dbeafe !important;
        border-radius: 10px !important;
        overflow: hidden !important;
        background: rgba(255, 255, 255, 0.9) !important;
      `;
      teamsTable.querySelectorAll('td').forEach((td, idx) => {
        const isValue = idx % 3 === 2;
        td.style.cssText = `
          border-color: #e2e8f0 !important;
          padding: 10px 12px !important;
          color: ${isValue ? '#0f172a' : '#1e3a8a'} !important;
          font-size: 13px !important;
          font-weight: ${isValue ? '700' : '600'} !important;
          background: transparent !important;
        `;
      });
    }

    const thumbnail = teamsAlert.querySelector('.thumbnail');
    if (thumbnail) {
      thumbnail.style.cssText = `
        margin-bottom: 0 !important;
        border-radius: 10px !important;
        border: 1px solid #dbeafe !important;
        background: rgba(255, 255, 255, 0.88) !important;
        box-shadow: none !important;
        padding: 10px 12px !important;
      `;
      const caption = thumbnail.querySelector('.caption');
      if (caption) {
        caption.style.cssText = `
          color: #1e3a8a !important;
          font-size: 13px !important;
          margin-bottom: 10px !important;
        `;
      }
    }

    const downloadBtn = teamsAlert.querySelector('a.btn');
    if (downloadBtn) {
      downloadBtn.style.cssText = `
        border: none !important;
        border-radius: 8px !important;
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%) !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        padding: 8px 14px !important;
        text-decoration: none !important;
      `;
    }
  }

  const warningAlert = contentWrap.querySelector('.alert.alert-warning');
  if (warningAlert) {
    warningAlert.style.cssText = `
      background: linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%) !important;
      border: 1px solid rgba(59, 130, 246, 0.24) !important;
      border-left: 4px solid #2563eb !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 10px rgba(30, 58, 138, 0.06) !important;
      color: #1f2937 !important;
      padding: 14px 16px !important;
      margin-bottom: 14px !important;
    `;
    warningAlert.querySelectorAll('b').forEach((b) => {
      b.style.color = '#1f2937';
      b.style.fontWeight = '600';
    });
    warningAlert.querySelectorAll('a').forEach((a) => {
      a.style.color = '#1d4ed8';
      a.style.fontWeight = '700';
      a.style.textDecoration = 'underline';
    });
  }

  const actionPanel = contentWrap.querySelector('.panel.panel-default');
  if (actionPanel) {
    actionPanel.style.cssText = `
      background: linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%) !important;
      border: 1px solid rgba(37, 99, 235, 0.2) !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 10px rgba(30, 58, 138, 0.07) !important;
      overflow: hidden !important;
      margin-bottom: 14px !important;
    `;

    const panelBody = actionPanel.querySelector('.panel-body');
    if (panelBody) {
      panelBody.style.cssText = 'padding: 16px !important; background: transparent !important;';
    }

    const actionsWrap = actionPanel.querySelector('.text-center');
    if (actionsWrap) {
      actionsWrap.style.cssText = 'display: flex !important; flex-wrap: wrap !important; gap: 10px !important; justify-content: center !important;';
    }

    actionPanel.querySelectorAll('.text-center a.btn').forEach((btn, i) => {
      const primary = i === 0;
      btn.style.cssText = `
        border: none !important;
        border-radius: 8px !important;
        background: ${primary ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)'} !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        font-size: 12.5px !important;
        padding: 9px 14px !important;
        text-decoration: none !important;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2) !important;
      `;
    });
  }
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
      applyIntroCardDesign(contentWrap);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryMount);
    } else {
      tryMount();
    }
  });
})();
