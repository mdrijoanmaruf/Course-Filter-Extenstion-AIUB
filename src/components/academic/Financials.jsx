import { createRoot } from 'react-dom/client';
import '../../content.css';

function parseAmount(text) {
  const n = parseFloat((text || '').replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

function fmtAmt(num) {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Enhanced table via DOM augmentation + React summary cards ────────────────

function SummaryCards({ totalDebit, totalCredit, finalBalance }) {
  return (
    <div style={{ boxSizing: 'border-box' }}>
      <div className="mb-6">
        <h1 className="text-[24px] font-extrabold text-slate-900 m-0 mb-2">
          Financial <span style={{ background: 'linear-gradient(135deg, #0284c7, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Dashboard</span>
        </h1>
        <p className="text-[13px] text-slate-500 m-0">View your tuition charges, payments, and current balance</p>
      </div>
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {/* Total Charged */}
        <div className="rounded-lg p-4 border transition-all hover:shadow-md" style={{
          background: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)',
          borderColor: '#fecaca',
          borderWidth: '1px'
        }}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-2">💰 Total Charged</div>
          <div className="text-[26px] font-extrabold text-red-600">৳{fmtAmt(totalDebit)}</div>
          <div className="text-[11px] text-red-500 mt-1">Cumulative charges</div>
        </div>

        {/* Total Paid */}
        <div className="rounded-lg p-4 border transition-all hover:shadow-md" style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)',
          borderColor: '#dcfce7',
          borderWidth: '1px'
        }}>
          <div className="text-[11px] font-bold uppercase tracking-wider text-green-700 mb-2">✓ Total Paid</div>
          <div className="text-[26px] font-extrabold text-green-600">৳{fmtAmt(totalCredit)}</div>
          <div className="text-[11px] text-green-500 mt-1">Payments received</div>
        </div>

        {/* Balance Due */}
        <div className="rounded-lg p-4 border transition-all hover:shadow-md" style={{
          background: finalBalance === 0 
            ? 'linear-gradient(135deg, #f0fdf4 0%, #f7fee7 100%)'
            : 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
          borderColor: finalBalance === 0 ? '#dcfce7' : '#fde047',
          borderWidth: '1px'
        }}>
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${finalBalance === 0 ? 'text-green-700' : 'text-amber-700'}`}>
            {finalBalance === 0 ? '✓ Balance Clear' : '⚠ Balance Due'}
          </div>
          <div className={`text-[26px] font-extrabold ${finalBalance === 0 ? 'text-green-600' : 'text-amber-600'}`}>
            ৳{fmtAmt(finalBalance)}
          </div>
          <div className={`text-[11px] mt-1 ${finalBalance === 0 ? 'text-green-500' : 'text-amber-500'}`}>
            {finalBalance === 0 ? 'No pending balance' : 'Please pay soon'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Self-mount: augments existing table, mounts summary above it ─────────────

(function mount() {
  if (window.__aiubFinanceMounted) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function init() {
      const panelBody = document.querySelector('#main-content .panel-body');
      const table = panelBody?.querySelector('table.table-details');
      if (!table) { setTimeout(init, 200); return; }

      if (window.__aiubFinanceMounted) return;
      window.__aiubFinanceMounted = true;

      const panel = panelBody.closest('.panel');
      if (panel) {
        panel.style.cssText = 'border:none!important;box-shadow:none!important';
        const heading = panel.querySelector('.panel-heading');
        if (heading) heading.style.display = 'none';
      }
      panelBody.style.cssText = 'background:transparent!important;border:none!important;box-shadow:none!important;padding:16px 4px!important';

      // Augment table with Tailwind-compatible inline styles
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:13px';

      let totalDebit = 0, totalCredit = 0, finalBalance = 0;

      table.querySelectorAll('tbody tr').forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (!cells.length) return;

        if (cells[0].hasAttribute('colspan') || row.textContent.toLowerCase().includes('total')) {
          row.style.background = 'linear-gradient(to right, #f1f5f9, #e0f2fe)';
          row.style.fontWeight = '700';
          if (cells.length >= 3) {
            const debCell = cells.length >= 4 ? cells[1] : cells[cells.length - 3];
            const credCell = cells.length >= 4 ? cells[2] : cells[cells.length - 2];
            const bCell = cells[cells.length - 1];

            totalDebit   = parseAmount(debCell.querySelector('label')?.textContent || debCell.textContent);
            totalCredit  = parseAmount(credCell.textContent);
            finalBalance = parseAmount(bCell.textContent);
          }
          return;
        }
        if (cells.length < 5) return;

        const dateCell = cells[0];
        const partCell = cells[1];
        const debitCell = cells[2];
        const creditCell = cells[3];
        const balCell = cells[cells.length - 1];

        dateCell.style.cssText = 'color:#1f2937!important;white-space:nowrap;font-size:13px!important;padding:12px 14px!important;border:none!important;border-bottom:1px solid #e5e7eb!important;background:#fff!important';
        partCell.style.cssText = 'max-width:320px;padding:12px 14px!important;border:none!important;border-bottom:1px solid #e5e7eb!important;vertical-align:middle;background:#fff!important;color:#1f2937!important';
        debitCell.style.cssText = 'text-align:right;white-space:nowrap;font-weight:700!important;padding:12px 14px!important;border:none!important;border-bottom:1px solid #e5e7eb!important;font-size:13px!important;background:#fff!important';
        creditCell.style.cssText = 'text-align:right;white-space:nowrap;font-weight:700!important;padding:12px 14px!important;border:none!important;border-bottom:1px solid #e5e7eb!important;font-size:13px!important;background:#fff!important';
        balCell.style.cssText = 'text-align:right;white-space:nowrap;font-weight:800!important;padding:12px 14px!important;border:none!important;border-bottom:1px solid #e5e7eb!important;font-size:13px!important;background:#fff!important';

        const dAmt = parseAmount(debitCell.textContent);
        const cAmt = parseAmount(creditCell.textContent);
        const bAmt = parseAmount(balCell.textContent);
        debitCell.style.color = dAmt === 0 ? '#d1d5db' : '#dc2626';
        creditCell.style.color = cAmt === 0 ? '#d1d5db' : '#16a34a';
        balCell.style.color = bAmt === 0 ? '#16a34a' : '#ea580c';

        const modalLink = partCell.querySelector('a[data-toggle="modal"]');
        if (modalLink) {
          row.style.background = '#f0f9ff!important';
          const badge = document.createElement('span');
          badge.style.cssText = 'display:inline-block;font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;margin-right:8px;background:#dbeafe;color:#0284c7;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap;border:1px solid #bfdbfe';
          badge.textContent = 'Assessment';
          modalLink.before(badge);
        } else if (partCell.textContent.trim().toLowerCase().includes('semester payment')) {
          row.style.background = '#f0fdf4!important';
          partCell.insertAdjacentHTML('afterbegin', '<span style="display:inline-block;font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;margin-right:8px;background:#d1fae5;color:#059669;text-transform:uppercase;white-space:nowrap;border:1px solid #a7f3d0;letter-spacing:.4px">Payment</span>');
        } else {
          row.style.background = '#fffbeb!important';
          partCell.insertAdjacentHTML('afterbegin', '<span style="display:inline-block;font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;margin-right:8px;background:#fef3c7;color:#b45309;text-transform:uppercase;white-space:nowrap;border:1px solid #fcd34d;letter-spacing:.4px">Fee</span>');
        }
      });

      // Style table header
      const thead = table.querySelector('thead');
      if (thead) {
        thead.style.background = 'linear-gradient(to right, #f1f5f9 0%, #e0f2fe 100%)';
        thead.querySelectorAll('th').forEach((th) => {
          th.style.cssText = 'padding:13px 14px!important;font-weight:700!important;font-size:11px!important;color:#0f172a!important;text-transform:uppercase;letter-spacing:.6px;border:none!important;white-space:nowrap;border-bottom:2px solid #cbd5e1!important;background:inherit!important';
        });
      }

      // Wrap table
      const wrap = document.createElement('div');
      wrap.style.cssText = 'overflow-x:auto;border-radius:12px;border:1.5px solid #e5e7eb;box-shadow:0 1px 6px rgba(0,0,0,.04)';
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);

      // Mount summary cards above wrap
      const summaryContainer = document.createElement('div');
      wrap.parentNode.insertBefore(summaryContainer, wrap);
      createRoot(summaryContainer).render(
        <SummaryCards totalDebit={totalDebit} totalCredit={totalCredit} finalBalance={finalBalance} />
      );

      // Style assessment modal
      const modal = document.getElementById('assesmentModal');
      if (modal) {
        const dialog = modal.querySelector('.modal-dialog');
        if (dialog) dialog.style.cssText = 'max-width:680px;margin:40px auto;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)';
        const content = modal.querySelector('.modal-content');
        if (content) content.style.cssText = 'border:none;border-radius:16px;box-shadow:none;overflow:hidden';
        const mHeader = modal.querySelector('.modal-header');
        if (mHeader) mHeader.style.cssText = 'background:linear-gradient(135deg, #0f172a 0%, #0284c7 100%);border:none;padding:20px 24px;border-radius:16px 16px 0 0';
        const mTitle = modal.querySelector('.modal-header h4');
        if (mTitle) mTitle.style.cssText = 'color:#fff;font-weight:700;margin:0;font-size:16px;letter-spacing:.3px';

        const divDetails = document.getElementById('divAssessmentDetails');
        if (divDetails) {
          new MutationObserver(() => {
            divDetails.querySelectorAll('table').forEach((t) => {
              t.style.cssText = 'width:100%!important;border-collapse:collapse!important;font-size:13px;margin-bottom:20px';
              t.querySelectorAll('thead th').forEach((th) => {
                th.style.cssText = 'padding:12px 14px;font-weight:700;font-size:12px;color:#1f2937;background:linear-gradient(to right, #f1f5f9, #e0f2fe);border:none;border-bottom:2px solid #cbd5e1;text-transform:uppercase;letter-spacing:.4px';
              });
              t.querySelectorAll('tbody td').forEach((td) => {
                td.style.cssText = 'padding:11px 14px;border-bottom:1px solid #e5e7eb;color:#374151;background:#fff';
              });
            });
          }).observe(divDetails, { childList: true, subtree: true });
        }
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });
})();
