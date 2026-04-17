(function () {
  'use strict';
  if (window.__aiubIntroEnhanced) return;
  window.__aiubIntroEnhanced = true;

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function titleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  function getStudentName() {
    const el = document.querySelector('.navbar-text .navbar-link small') ||
               document.querySelector('.navbar-text .navbar-link');
    if (!el) return '';
    const raw = el.textContent.trim();
    const parts = raw.split(',').map(s => s.trim());
    if (parts.length >= 2) return titleCase(parts[1]) + ' ' + titleCase(parts[0]);
    return titleCase(raw);
  }
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  function loadCSS() {
    if (document.getElementById('intro-style')) return;
    const link = document.createElement('link');
    link.id   = 'intro-style';
    link.rel  = 'stylesheet';
    link.href = chrome.runtime.getURL('Home/Intro.css');
    document.head.appendChild(link);
  }

  function enhance() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    loadCSS();

    const regBtn = mainContent.querySelector('.text-center .btn-danger');
    if (regBtn) {
      const panel = regBtn.closest('.panel');
      if (panel) panel.classList.add('intro-actions');
    }
  }

  function tryEnhance() {
    if (document.getElementById('main-content')) {
      enhance();
    } else {
      setTimeout(tryEnhance, 200);
    }
  }

  chrome.storage.sync.get({ extensionEnabled: true }, function (r) {
    if (!r.extensionEnabled) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryEnhance);
    } else {
      tryEnhance();
    }
  });
})();
