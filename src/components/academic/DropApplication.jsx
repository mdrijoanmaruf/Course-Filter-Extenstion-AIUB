import { createRoot } from 'react-dom/client';
import '../../content.css';

// Drop Application: Angular-rendered list is preserved.
// React renders a header with refund %; CSS overrides style the Angular list.

function DropHeader({ pct }) {
  const pctNum = parseFloat(pct);
  const isGood = pctNum > 0;

  return (
    <div className="mb-6" style={{ boxSizing: 'border-box' }}>
      {/* Title Section */}
      <div className="mb-5">
        <h1 className="text-[24px] font-extrabold text-slate-900 m-0 mb-1">
          Course <span style={{ background: 'linear-gradient(135deg, #0284c7, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Drop</span>
        </h1>
        <p className="text-[13px] text-slate-500 m-0">Request to drop courses with real-time refund information</p>
      </div>

      {/* Info Cards Grid */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Refund Card */}
        <div className="rounded-lg border p-4 transition-all hover:shadow-md" style={{ 
          backgroundColor: isGood ? '#f0fdf4' : '#fef2f2',
          borderColor: isGood ? '#dcfce7' : '#fecaca'
        }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: isGood ? '#166534' : '#991b1b' }}>
            💰 Current Refund
          </div>
          <div className="flex items-end gap-2">
            <span className="text-[28px] font-extrabold" style={{ color: isGood ? '#166534' : '#991b1b' }}>
              {pct}
            </span>
            <span className="text-[11px] font-semibold mb-1" style={{ color: isGood ? '#22c55e' : '#f43f5e' }}>
              {isGood ? '✓ Eligible' : '✗ Not Eligible'}
            </span>
          </div>
        </div>

        {/* Notice Card */}
        <div className="rounded-lg border p-4 bg-gradient-to-br from-blue-50 to-cyan-50" style={{ borderColor: '#bfdbfe' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900 mb-2">
            ℹ️ Important
          </div>
          <p className="text-[12px] text-blue-800 m-0 leading-snug font-medium">
            Check refund deadline before submitting
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }} />
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
        [data-target="#Rules"] .label.label-info{font-size:12px!important;padding:6px 14px!important;border-radius:6px!important;background:#dbeafe!important;color:#0284c7!important;border:1px solid #bfdbfe!important;font-weight:600!important;cursor:pointer!important}
        #Rules .table{border-collapse:collapse!important;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0!important;background:#fff!important}
        #Rules .table th{background:linear-gradient(to right, #f8fafc, #f1f5f9)!important;font-size:11px!important;text-transform:uppercase;letter-spacing:.6px;color:#64748b!important;font-weight:700!important;border-bottom:1px solid #e2e8f0!important;padding:11px 14px!important}
        #Rules .table td{font-size:12px!important;padding:9px 14px!important;color:#475569!important;border-color:#f1f5f9!important}
        #Rules .table tbody tr:hover{background:#f8fafc!important}
        [ng-controller="DropApplicationController2"] .ng-scope>[ng-repeat]{display:none!important}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope{background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:12px!important;padding:0!important;overflow:hidden;transition:all .25s ease;box-shadow:0 1px 3px rgba(0,0,0,.05)}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope:hover{box-shadow:0 8px 16px rgba(2,132,199,.12);border-color:#7dd3fc;transform:translateY(-2px)}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope>.row{margin:0!important;padding:14px 16px!important;align-items:center;display:flex!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-1{flex:0 0 auto!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-6{flex:1 1 auto!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-2{flex:0 0 auto!important;text-align:right!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-1>span[style*="steelblue"]{color:#0284c7!important;font-family:'Fira Code','JetBrains Mono',monospace!important;font-size:12px!important;font-weight:700!important;background:#dbeafe;padding:4px 8px;border-radius:5px;display:inline-block!important;letter-spacing:.3px}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-6>span[style*="slateblue"]{color:#1e293b!important;font-size:14px!important;font-weight:700!important;display:block!important;margin-bottom:4px}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-6 small.ng-binding{display:inline-block;margin:2px 6px 0 0;font-size:11px!important;color:#64748b!important;background:#e2e8f0;padding:3px 9px;border-radius:4px;font-weight:500}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-2 span.ng-binding:not(.ng-hide){display:inline-flex!important;align-items:center!important;background:#fee2e2!important;color:#991b1b!important;font-size:11px!important;font-weight:700!important;padding:4px 10px!important;border-radius:5px!important;gap:4px}
        [ng-controller="DropApplicationController2"] [ng-repeat] a.btn.btn-danger{font-size:12px!important;font-weight:600!important;background:linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)!important;color:#991b1b!important;border:1.5px solid #fca5a5!important;border-radius:7px!important;padding:6px 12px!important;box-shadow:0 2px 4px rgba(153,27,27,.1)!important;transition:all .2s ease!important;cursor:pointer!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] a.btn.btn-danger:hover{background:linear-gradient(135deg, #fecaca 0%, #f87171 100%)!important;border-color:#f87171!important;box-shadow:0 4px 12px rgba(220,38,38,.2)!important;transform:translateY(-1px)!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] .label.label-warning{background:#fef3c7!important;color:#92400e!important;border-radius:5px!important;font-size:11px!important;padding:4px 10px!important;font-weight:700!important}
        [ng-controller="DropApplicationController2"] h5.text-center{font-size:14px!important;font-weight:700!important;color:#1e293b!important;margin:12px 0!important}
        [ng-controller="DropApplicationController2"] .table-condensed th{font-size:11px!important;text-transform:uppercase;letter-spacing:.6px;color:#64748b!important;background:linear-gradient(to right, #f8fafc, #f1f5f9)!important;border-bottom:1px solid #e2e8f0!important;padding:10px 12px!important;font-weight:700!important}
        [ng-controller="DropApplicationController2"] .table-condensed td{font-size:12px!important;padding:9px 12px!important;color:#475569!important;border-color:#f1f5f9!important}
        [ng-controller="DropApplicationController2"] .table-condensed tbody tr:hover{background:#f8fafc!important}
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
