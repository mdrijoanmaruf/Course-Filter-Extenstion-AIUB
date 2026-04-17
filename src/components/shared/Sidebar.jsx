(function () {
  if (window.__aiubSidebarEnhanced) return;
  window.__aiubSidebarEnhanced = true;

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function titleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getStudentName() {
    const el = document.querySelector('.navbar-text .navbar-link small') ||
               document.querySelector('.navbar-text .navbar-link');
    if (!el) return '';
    const raw = el.textContent.trim();
    const parts = raw.split(',').map((s) => s.trim());
    if (parts.length >= 2) return titleCase(parts[1]) + ' ' + titleCase(parts[0]);
    return titleCase(raw);
  }

  function loadCSS() {
    if (document.getElementById('aiub-sidebar-style')) return;
    const link = document.createElement('link');
    link.id = 'aiub-sidebar-style';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('Shared/Sidebar.css');
    document.head.appendChild(link);
  }

    function cleanup() {
    const styleEl = document.getElementById('aiub-sidebar-style');
    if (styleEl) styleEl.remove();

    const sidebar = document.getElementById('navigation-bar');
    if (!sidebar) return;

    sidebar.querySelectorAll('.nav-profile-block, .nav-section-divider, .aiub-graph-nav-item').forEach((el) => el.remove());

    sidebar.querySelectorAll('.aiub-active-item').forEach((a) => {
      a.classList.remove('active', 'aiub-active-item');
    });

    sidebar.querySelectorAll('.aiub-open-collapse').forEach((collapse) => {
      collapse.classList.remove('in', 'aiub-open-collapse');
    });

    sidebar.querySelectorAll('.aiub-expanded-trigger').forEach((trigger) => {
      trigger.classList.remove('aria-expanded-true', 'aiub-expanded-trigger');
      trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function enhance() {
    const sidebar = document.getElementById('navigation-bar');
    if (!sidebar) return;

    loadCSS();
    
    const name = getStudentName();
    const idEl = document.querySelector('.navbar-text .navbar-link small');
    const rawId = idEl ? idEl.textContent.trim() : '';
    const idMatch = rawId.match(/(\d{2}-\d{5}-\d+)/);
    const studentId = idMatch ? idMatch[1] : '';

    if (name && !sidebar.querySelector('.nav-profile-block')) {
      sidebar.insertAdjacentHTML('afterbegin',
        '<div class="nav-profile-block">' +
          '<div class="nav-profile-name">' + escHtml(name) + '</div>' +
          (studentId ? '<div class="nav-profile-id">' + escHtml(studentId) + '</div>' : '') +
        '</div>'
      );
    }

    const path = window.location.pathname;
    sidebar.querySelectorAll('.list-group-item').forEach((a) => {
      try {
        const href = new URL(a.href).pathname;
        if (path.startsWith(href) && href !== '/Student') {
          a.classList.add('active', 'aiub-active-item');
        }
      } catch (_) {}
    });

    sidebar.querySelectorAll('.panel-group > .panel + .panel').forEach((panel) => {
      const prev = panel.previousElementSibling;
      if (!prev || !prev.classList || !prev.classList.contains('nav-section-divider')) {
        panel.insertAdjacentHTML('beforebegin', '<div class="nav-section-divider"></div>');
      }
    });
  }

  function tryEnhance() {
    if (document.getElementById('navigation-bar')) enhance();
    else setTimeout(tryEnhance, 150);
  }

  function applyEnabledState(enabled) {
    if (!enabled) {
      cleanup();
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryEnhance, { once: true });
    } else {
      tryEnhance();
    }
  }

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    applyEnabledState(Boolean(r && r.extensionEnabled));
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes.extensionEnabled) return;
    applyEnabledState(Boolean(changes.extensionEnabled.newValue));
    if (!changes.extensionEnabled.newValue) {
      cleanup();
    }
  });
})();
