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
      <div className="mb-3.5">
        <div className="text-[22px] font-bold text-slate-900">Financial Details</div>
        <div className="text-[13px] text-slate-500">Your complete tuition and payment history</div>
      </div>
      <div className="flex gap-3 flex-wrap mb-5">
        <div className="flex-1 min-w-[150px] bg-white rounded-xl p-3.5 border-[1.5px] border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Total Charged</div>
          <div className="text-[20px] font-bold text-red-600">৳{fmtAmt(totalDebit)}</div>
        </div>
        <div className="flex-1 min-w-[150px] bg-white rounded-xl p-3.5 border-[1.5px] border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Total Paid</div>
          <div className="text-[20px] font-bold text-green-600">৳{fmtAmt(totalCredit)}</div>
        </div>
        <div className="flex-1 min-w-[150px] bg-white rounded-xl p-3.5 border-[1.5px] border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Balance Due</div>
          <div className={`text-[20px] font-bold ${finalBalance === 0 ? 'text-green-600' : 'text-amber-600'}`}>
            ৳{fmtAmt(finalBalance)}
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

        if (cells[0].hasAttribute('colspan')) {
          row.style.background = '#f1f5f9';
          if (cells.length >= 5) {
            totalDebit   = parseAmount(cells[1].querySelector('label')?.textContent || cells[1].textContent);
            totalCredit  = parseAmount(cells[2].textContent);
            finalBalance = parseAmount(cells[4].textContent);
          }
          return;
        }
        if (cells.length < 6) return;

        const [dateCell, partCell, debitCell, creditCell,,balCell] = cells;
        dateCell.style.cssText = 'color:#6b7280;white-space:nowrap;font-size:12px;padding:11px 14px;border:none;border-bottom:1px solid #f3f4f6';
        partCell.style.cssText = 'max-width:280px;padding:11px 14px;border:none;border-bottom:1px solid #f3f4f6;vertical-align:middle';
        debitCell.style.cssText = 'text-align:right;white-space:nowrap;font-weight:600;padding:11px 14px;border:none;border-bottom:1px solid #f3f4f6';
        creditCell.style.cssText = 'text-align:right;white-space:nowrap;font-weight:600;padding:11px 14px;border:none;border-bottom:1px solid #f3f4f6';
        balCell.style.cssText = 'text-align:right;white-space:nowrap;font-weight:700;padding:11px 14px;border:none;border-bottom:1px solid #f3f4f6';

        const dAmt = parseAmount(debitCell.textContent);
        const cAmt = parseAmount(creditCell.textContent);
        const bAmt = parseAmount(balCell.textContent);
        debitCell.style.color = dAmt === 0 ? '#9ca3af' : '#dc2626';
        creditCell.style.color = cAmt === 0 ? '#9ca3af' : '#059669';
        balCell.style.color = bAmt === 0 ? '#059669' : '#dc2626';

        const modalLink = partCell.querySelector('a[data-toggle="modal"]');
        if (modalLink) {
          row.style.background = '#eff6ff';
          const badge = document.createElement('span');
          badge.style.cssText = 'display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;margin-right:7px;background:#dbeafe;color:#1d4ed8;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap';
          badge.textContent = 'Assessment';
          modalLink.before(badge);
        } else if (partCell.textContent.trim().toLowerCase().includes('semester payment')) {
          row.style.background = '#f0fdf4';
          partCell.insertAdjacentHTML('afterbegin', '<span style="display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;margin-right:7px;background:#d1fae5;color:#059669;text-transform:uppercase;white-space:nowrap">Payment</span>');
        } else {
          row.style.background = '#fffbeb';
          partCell.insertAdjacentHTML('afterbegin', '<span style="display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;margin-right:7px;background:#fef3c7;color:#b45309;text-transform:uppercase;white-space:nowrap">Fee</span>');
        }
      });

      // Style table header
      const thead = table.querySelector('thead');
      if (thead) {
        thead.style.background = 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)';
        thead.querySelectorAll('th').forEach((th) => {
          th.style.cssText = 'padding:12px 14px;font-weight:600;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:.5px;border:none;white-space:nowrap';
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
        if (dialog) dialog.style.cssText = 'max-width:620px;margin:40px auto;border-radius:14px;overflow:hidden';
        const content = modal.querySelector('.modal-content');
        if (content) content.style.cssText = 'border:none;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.18)';
        const mHeader = modal.querySelector('.modal-header');
        if (mHeader) mHeader.style.cssText = 'background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%);border:none;padding:18px 24px;border-radius:14px 14px 0 0';
        const mTitle = modal.querySelector('.modal-header h4');
        if (mTitle) mTitle.style.cssText = 'color:#fff;font-weight:700;margin:0;font-size:16px';

        const divDetails = document.getElementById('divAssessmentDetails');
        if (divDetails) {
          new MutationObserver(() => {
            divDetails.querySelectorAll('table').forEach((t) => {
              t.style.cssText = 'width:100%!important;border-collapse:collapse!important;font-size:13px';
              t.querySelectorAll('thead th').forEach((th) => {
                th.style.cssText = 'padding:10px 12px;font-weight:600;font-size:12px;color:#374151;background:#f1f5f9;border-bottom:2px solid #e2e8f0;text-transform:uppercase;letter-spacing:.4px';
              });
              t.querySelectorAll('tbody td').forEach((td) => {
                td.style.cssText = 'padding:9px 12px;border-bottom:1px solid #f3f4f6;color:#374151';
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
