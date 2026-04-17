(function () {
  'use strict';
  if (window.__aiubNavbarEnhanced) return;
  window.__aiubNavbarEnhanced = true;

  function loadCSS() {
    if (document.getElementById('navbar-style')) return;
    const link = document.createElement('link');
    link.id   = 'navbar-style';
    link.rel  = 'stylesheet';
    link.href = chrome.runtime.getURL('Shared/Navbar.css');
    document.head.appendChild(link);
  }

  function enhance() {
    loadCSS();

    const path = window.location.pathname;
    document.querySelectorAll('.navbar-nav.hidden-md.hidden-sm.hidden-xs > li > a').forEach(a => {
      try {
        const href = new URL(a.href).pathname;
        if (path.startsWith(href) && href !== '/Student') {
          a.closest('li').classList.add('active');
        }
      } catch (e) {}
    });
  }

  function tryEnhance() {
    if (document.querySelector('.topbar-container')) {
      enhance();
    } else {
      setTimeout(tryEnhance, 150);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryEnhance);
  } else {
    tryEnhance();
  }
})();
