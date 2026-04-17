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

  function injectGraphNavItem(sidebar) {
    if (!sidebar || sidebar.querySelector('.aiub-graph-nav-item')) return;
    let graphUrl = '';
    try { graphUrl = chrome.runtime.getURL('Grade/Graphs.html'); } catch (_) {}
    if (!graphUrl) return;

    const gradeLinks = Array.from(sidebar.querySelectorAll(
      '.list-group-item[href*="/Student/GradeReport/ByCurriculum"], .list-group-item[href*="/Student/GradeReport/BySemester"]'
    ));

    const link = document.createElement('a');
    link.className = 'list-group-item aiub-graph-nav-item';
    link.href = graphUrl;
    link.innerHTML = '<span class="glyphicon glyphicon-stats" aria-hidden="true"></span> Graph';

    if (gradeLinks.length) {
      const last = gradeLinks[gradeLinks.length - 1];
      const parent = last.parentElement;
      if (!parent) return;
      last.nextSibling ? parent.insertBefore(link, last.nextSibling) : parent.appendChild(link);
      return;
    }
    const fallback = sidebar.querySelector('.panel-collapse > div');
    if (fallback) fallback.appendChild(link);
  }

  function enhance() {
    const sidebar = document.getElementById('navigation-bar');
    if (!sidebar) return;

    loadCSS();
    injectGraphNavItem(sidebar);

    const name = getStudentName();
    const idEl = document.querySelector('.navbar-text .navbar-link small');
    const rawId = idEl ? idEl.textContent.trim() : '';
    const idMatch = rawId.match(/(\d{2}-\d{5}-\d+)/);
    const studentId = idMatch ? idMatch[1] : '';

    if (name) {
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
          a.classList.add('active');
          const collapse = a.closest('.panel-collapse');
          if (collapse) {
            collapse.classList.add('in');
            collapse.style.height = 'auto';
            const trigger = sidebar.querySelector('[href="#' + collapse.id + '"]');
            if (trigger) trigger.setAttribute('aria-expanded', 'true');
          }
        }
      } catch (_) {}
    });

    sidebar.querySelectorAll('.panel-group > .panel + .panel').forEach((panel) => {
      panel.insertAdjacentHTML('beforebegin', '<div class="nav-section-divider"></div>');
    });
  }

  function tryEnhance() {
    if (document.getElementById('navigation-bar')) enhance();
    else setTimeout(tryEnhance, 150);
  }

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryEnhance);
    } else {
      tryEnhance();
    }
  });
})();
