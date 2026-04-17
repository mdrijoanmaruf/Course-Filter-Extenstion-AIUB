// Enhances the home page Registration panel with lightweight CSS overrides.
// The Angular-rendered course list is preserved; only visual styling is applied.

(function mount() {
  if (window.__aiubHomeRegMounted) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function applyStyles() {
      const panel = [...document.querySelectorAll('.panel-heading .panel-title')]
        .find((t) => t.textContent.trim() === 'Registration')
        ?.closest('.panel');

      if (!panel) { setTimeout(applyStyles, 300); return; }
      if (window.__aiubHomeRegMounted) return;
      window.__aiubHomeRegMounted = true;

      const style = document.createElement('style');
      style.id = 'aiub-home-reg-style';
      style.textContent = `
        .hom-reg-panel{border:none!important;box-shadow:none!important}
        .hom-reg-panel>.panel-heading{background:transparent!important;border:none!important;padding:0 0 8px!important}
        .hom-reg-panel>.panel-body{padding:0!important}
        .hom-reg-panel #SemesterDropDown{font-size:12px;font-weight:600;color:#334155;border:1px solid #cbd5e1!important;border-radius:8px!important;padding:6px 10px!important;background:#f8fafc!important}
        .StudentCourseList .panel.panel-primary{border:1px solid #e2e8f0!important;border-radius:10px!important;overflow:hidden!important;box-shadow:0 1px 4px rgba(0,0,0,.04)!important;margin-bottom:8px!important}
        .StudentCourseList .panel-primary>.panel-heading{display:none!important}
        .StudentCourseList .panel-primary>.panel-body{background:#fff!important;color:#374151!important;padding:12px 14px!important;font-size:13px!important;font-weight:600;height:auto!important;max-height:none!important}
        .StudentCourseList .panel-primary>.panel-body .label-info{background:#dbeafe!important;color:#1d4ed8!important;font-weight:600;border-radius:6px;padding:2px 8px}
        .StudentCourseList .panel-primary>.panel-body .label-success{background:#dcfce7!important;color:#166534!important;font-weight:600;border-radius:6px;padding:2px 8px}
        .StudentCourseList .panel-primary>.panel-body .label-danger{background:#fee2e2!important;color:#991b1b!important;font-weight:600;border-radius:6px;padding:2px 8px}
        .StudentCourseList .panel-footer{background:#f8fafc!important;border-top:1px solid #f1f5f9!important;padding:9px 14px!important}
        .StudentCourseList .panel-footer a{color:#4b5563!important;font-size:12px!important;font-weight:500!important;text-decoration:none!important;margin-right:12px}
        .StudentCourseList .panel-footer a:hover{color:#2563eb!important}
      `;
      document.head.appendChild(style);
      panel.classList.add('hom-reg-panel');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyStyles);
    } else {
      applyStyles();
    }
  });
})();
