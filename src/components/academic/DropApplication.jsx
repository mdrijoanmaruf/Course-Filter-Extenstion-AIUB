import { createRoot } from 'react-dom/client';
import '../../content.css';

// Drop Application: Angular-rendered list is preserved.
// React renders a header with refund %; CSS overrides style the Angular list.

function DropHeader({ pct }) {
  const pctNum = parseFloat(pct);
  const isGood = pctNum > 0;

  return (
    <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4 pb-3 border-b-2 border-slate-100" style={{ boxSizing: 'border-box' }}>
      <h2 className="text-[16px] font-bold text-slate-900 m-0">
        Drop <span className="text-red-600">Application</span>
      </h2>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold bg-yellow-50 border border-yellow-300 text-yellow-800">
        Current Refund&nbsp;
        <span className={`text-[20px] font-extrabold leading-none ${isGood ? 'text-green-600' : 'text-red-600'}`}>{pct}</span>
      </div>
    </div>
  );
}

(function mount() {
  if (window.__aiubDropMounted) return;
  if (!window.location.href.includes('/Student/Adrop/DropApplication')) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function init() {
      const courses = document.querySelectorAll(
        '[ng-controller="DropApplicationController2"] [ng-repeat].ng-scope'
      );
      if (!courses.length) { setTimeout(init, 300); return; }
      if (window.__aiubDropMounted) return;
      window.__aiubDropMounted = true;

      // Inject CSS for Angular-rendered list styling
      const style = document.createElement('style');
      style.id = 'aiub-drop-style';
      style.textContent = `
        .portal-body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',Roboto,sans-serif}
        .alert.alert-warning{display:none!important}
        [data-target="#Rules"] .label.label-info{font-size:12px!important;padding:5px 16px!important;border-radius:6px!important;background:#eff6ff!important;color:#1d4ed8!important;border:1px solid #bfdbfe!important;font-weight:600!important;cursor:pointer;letter-spacing:0!important}
        #Rules .table{border-collapse:collapse!important;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0!important}
        #Rules .table th{background:#f8fafc!important;font-size:10px!important;text-transform:uppercase;letter-spacing:.6px;color:#64748b!important;font-weight:700!important;border-bottom:1px solid #e2e8f0!important;padding:8px 14px!important}
        #Rules .table td{font-size:12px!important;padding:7px 14px!important;color:#475569!important;border-color:#f1f5f9!important}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope{background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px!important;padding:0!important;overflow:hidden;transition:box-shadow .15s,border-color .15s}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope:hover{box-shadow:0 2px 8px rgba(37,99,235,.07);border-color:#bfdbfe}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope>.row{margin:0!important;padding:10px 14px!important;align-items:center}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-1>span[style*="steelblue"]{color:#1e3a8a!important;font-family:'Consolas',monospace!important;font-size:12px!important;font-weight:700!important;background:#eff6ff;padding:2px 8px;border-radius:5px;display:inline-block}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-6>span[style*="slateblue"]{color:#0f172a!important;font-size:13px!important;font-weight:600!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-6 small.ng-binding{display:inline-block;margin:3px 5px 0 0;font-size:11px!important;color:#475569!important;background:#f1f5f9;padding:1px 7px;border-radius:4px}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-2 span.ng-binding:not(.ng-hide){display:inline-flex!important;align-items:center!important;background:#fee2e2!important;color:#dc2626!important;font-size:10px!important;font-weight:700!important;padding:2px 8px!important;border-radius:5px!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] a.btn.btn-danger{font-size:11px!important;font-weight:600!important;background:#fee2e2!important;color:#dc2626!important;border:1px solid #fca5a5!important;border-radius:6px!important;padding:4px 10px!important;box-shadow:none!important;transition:background .15s!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] a.btn.btn-danger:hover{background:#fecaca!important;border-color:#f87171!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] .label.label-warning{background:#fef9c3!important;color:#854d0e!important;border-radius:5px!important;font-size:10px!important;padding:3px 8px!important}
        [ng-controller="DropApplicationController2"] h5.text-center{font-size:13px!important;font-weight:700!important;color:#0f172a!important}
        [ng-controller="DropApplicationController2"] .table-condensed th{font-size:10px!important;text-transform:uppercase;letter-spacing:.5px;color:#64748b!important;background:#f8fafc!important;border-bottom:1px solid #e2e8f0!important;padding:8px 10px!important}
        [ng-controller="DropApplicationController2"] .table-condensed td{font-size:12px!important;padding:7px 10px!important;color:#475569!important;border-color:#f1f5f9!important}
      `;
      document.head.appendChild(style);

      // Extract refund pct from alert
      const alert = document.querySelector('.alert.alert-warning');
      let pct = '0%';
      if (alert) {
        const badge = alert.querySelector('.label-danger b') || alert.querySelector('.label-danger');
        if (badge) pct = badge.textContent.trim();
      }

      // Mount React header before the Angular controller
      const target =
        document.querySelector('[ng-controller="DropApplicationController2"]') ||
        document.querySelector('.margin5');
      if (!target) return;

      const rulesRow = document.querySelector('.portal-body > .row');
      const insertBefore = rulesRow || target;
      const container = document.createElement('div');
      insertBefore.parentNode.insertBefore(container, insertBefore);
      createRoot(container).render(<DropHeader pct={pct} />);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });
})();
