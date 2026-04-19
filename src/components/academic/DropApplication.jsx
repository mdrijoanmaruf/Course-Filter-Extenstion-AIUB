import { createRoot } from 'react-dom/client';
import { useEffect, useRef } from 'react';
import '../../content.css';

// Drop Application: Angular-rendered list is preserved.
// React renders a header with refund %; CSS overrides style the Angular list.

function DropView({ pct, angularNode, rulesNode }) {
  const pctNum = parseFloat(pct);
  const isGood = pctNum > 0;
  const mainRef = useRef(null);

  useEffect(() => {
    if (!mainRef.current) return;
    if (rulesNode) mainRef.current.appendChild(rulesNode);
    if (angularNode) mainRef.current.appendChild(angularNode);
  }, [angularNode, rulesNode]);

  return (
    <div className="text-[13px] text-slate-800" style={{ boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid #e2e8f0' }}>
        <h2 className="text-[18px] font-bold text-slate-900 tracking-tight m-0">
          Course <span style={{ background: 'linear-gradient(135deg, #e11d48, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Drop</span>
        </h2>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 270px', alignItems: 'start' }}>
        {/* Main Column for Angular List and Rules */}
        <div className="flex flex-col gap-3 min-w-0" ref={mainRef}></div>

        {/* Side Panel — mirrors Fee panel in Registration */}
        <div
          className="border rounded-lg overflow-hidden shadow-md"
          style={{
            position: 'sticky',
            top: 16,
            alignSelf: 'start',
            backgroundColor: '#f8fafc',
            borderColor: '#cbd5e1',
            borderWidth: '1px',
          }}
        >
          <div
            className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white"
            style={{
              background: isGood
                ? 'linear-gradient(to right, #16a34a, #15803d)'
                : 'linear-gradient(to right, #e11d48, #be123c)',
              borderBottom: '1px solid #cbd5e1',
            }}
          >
            💰 Refund Status
          </div>

          <div className="p-5 flex flex-col items-center justify-center bg-white" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <span className="text-[36px] font-extrabold leading-none mb-2" style={{ color: isGood ? '#166534' : '#991b1b' }}>
              {pct}
            </span>
            <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${isGood ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
              {isGood ? '✓ Eligible' : '✗ Not Eligible'}
            </span>
          </div>

          <div className="py-1">
            <div className="flex items-center justify-between px-3.5 py-2 gap-2">
              <span className="text-[12px] text-slate-600">Refund %</span>
              <span className={`font-mono text-[13px] font-bold whitespace-nowrap ${isGood ? 'text-green-600' : 'text-rose-600'}`}>{pct}</span>
            </div>
            <div className="h-px bg-slate-200 my-1" />
            <div className="flex items-start gap-2 px-3.5 py-2.5">
              <span className="text-slate-400 text-[12px] mt-0.5">ℹ</span>
              <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
                Verify refund deadlines before submitting. Drops may affect your credit limit and financial status.
              </p>
            </div>
          </div>
        </div>
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
        [data-target="#Rules"] .label.label-info{font-size:12px!important;padding:6px 14px!important;border-radius:6px!important;background:#dbeafe!important;color:#0284c7!important;border:1px solid #bfdbfe!important;font-weight:600!important;cursor:pointer!important}
        #Rules .table{border-collapse:collapse!important;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0!important;background:#fff!important}
        #Rules .table th{background:linear-gradient(to right, #f8fafc, #f1f5f9)!important;font-size:11px!important;text-transform:uppercase;letter-spacing:.6px;color:#64748b!important;font-weight:700!important;border-bottom:1px solid #e2e8f0!important;padding:11px 14px!important}
        #Rules .table td{font-size:12px!important;padding:9px 14px!important;color:#475569!important;border-color:#f1f5f9!important}
        #Rules .table tbody tr:hover{background:#f8fafc!important}
        [ng-controller="DropApplicationController2"] .ng-scope>[ng-repeat]{display:none!important}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope{background:linear-gradient(135deg,#f8fbff 0%,#eff6ff 50%,#dbeafe 100%);border:1px solid #bfdbfe;border-radius:8px;margin-bottom:12px!important;padding:0!important;overflow:hidden;transition:all .2s ease;box-shadow:0 1px 2px 0 rgb(0 0 0 / 0.05)}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope:hover{box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);border-color:#93c5fd;transform:translateY(-1px)}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope:has(.col-md-2 span.ng-binding:not(.ng-hide)){background:linear-gradient(135deg,#fff8f8 0%,#fff1f2 50%,#ffe4e6 100%)!important;border-color:#fecdd3!important}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope:has(.col-md-2 span.ng-binding:not(.ng-hide)):hover{border-color:#fca5a5!important}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope:has(.col-md-2 span.ng-binding:not(.ng-hide)) .col-md-6>span[style*="slateblue"]{text-decoration:line-through!important;color:#94a3b8!important}
        [ng-controller="DropApplicationController2"] [ng-repeat].ng-scope>.row{margin:0!important;padding:12px 14px!important;align-items:flex-start;display:flex!important;gap:12px}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-1{flex:0 0 auto!important;padding:0!important;width:auto!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-6{flex:1 1 auto!important;padding:0!important;min-width:0}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-2{flex:0 0 auto!important;padding:0!important;text-align:right!important;display:flex!important;flex-direction:column!important;align-items:flex-end!important;justify-content:center!important;min-height:48px}
        
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-1>span[style*="steelblue"]{color:#0284c7!important;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace!important;font-size:11px!important;font-weight:700!important;letter-spacing:0.025em;text-transform:uppercase;background:transparent!important;padding:0!important;display:block!important;margin-bottom:2px!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-6>span[style*="slateblue"]{color:#0f172a!important;font-size:13px!important;font-weight:600!important;line-height:1.375!important;display:block!important;margin-bottom:6px!important}
        
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-6 small.ng-binding{display:inline-flex!important;align-items:center!important;margin:0 6px 4px 0!important;font-size:10px!important;color:#475569!important;background:#f1f5f9!important;padding:2px 8px!important;border-radius:6px!important;font-weight:600!important;letter-spacing:0.025em!important}
        
        [ng-controller="DropApplicationController2"] [ng-repeat] .col-md-2 span.ng-binding:not(.ng-hide){display:inline-flex!important;align-items:center!important;background:#fef2f2!important;color:#991b1b!important;font-size:10px!important;font-weight:600!important;padding:2px 8px!important;border-radius:4px!important;margin-bottom:8px!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] a.btn.btn-danger{font-size:11px!important;font-weight:600!important;background:#fee2e2!important;color:#991b1b!important;border:1px solid #fca5a5!important;border-radius:6px!important;padding:6px 14px!important;box-shadow:0 1px 2px 0 rgb(0 0 0 / 0.05)!important;transition:all .15s ease!important;cursor:pointer!important;text-transform:uppercase!important;letter-spacing:0.025em!important;display:inline-block!important;margin-top:auto!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] a.btn.btn-danger:hover{background:#fecaca!important;border-color:#f87171!important;box-shadow:0 4px 6px -1px rgb(239 68 68 / 0.1)!important}
        [ng-controller="DropApplicationController2"] [ng-repeat] .label.label-warning{background:#fef3c7!important;color:#92400e!important;border-radius:5px!important;font-size:11px!important;padding:4px 10px!important;font-weight:700!important}
        [ng-controller="DropApplicationController2"] h5.text-center{font-size:14px!important;font-weight:700!important;color:#1e293b!important;margin:12px 0!important}
        [ng-controller="DropApplicationController2"] .table-condensed th{font-size:11px!important;text-transform:uppercase;letter-spacing:.6px;color:#64748b!important;background:linear-gradient(to right, #f8fafc, #f1f5f9)!important;border-bottom:1px solid #e2e8f0!important;padding:10px 12px!important;font-weight:700!important}
        [ng-controller="DropApplicationController2"] .table-condensed td{font-size:12px!important;padding:9px 12px!important;color:#475569!important;border-color:#f1f5f9!important}
        [ng-controller="DropApplicationController2"] .table-condensed tbody tr:hover{background:#eff6ff!important}
      `;
      document.head.appendChild(style);

      // Extract refund pct from alert
      const alert = document.querySelector('.alert.alert-warning');
      let pct = '0%';
      if (alert) {
        const badge = alert.querySelector('.label-danger b') || alert.querySelector('.label-danger');
        if (badge) pct = badge.textContent.trim();
      }

      // Mount React layout wrapping Angular controller and rules
      const target = document.querySelector('[ng-controller="DropApplicationController2"]');
      const rulesRow = document.querySelector('.portal-body > .row');
      
      const insertBefore = rulesRow || target;
      if (!insertBefore) return;

      const container = document.createElement('div');
      insertBefore.parentNode.insertBefore(container, insertBefore);
      createRoot(container).render(
        <DropView pct={pct} angularNode={target} rulesNode={rulesRow} />
      );
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });
})();
