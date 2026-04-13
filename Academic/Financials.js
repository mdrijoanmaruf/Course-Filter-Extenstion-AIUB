(function () {
  'use strict';
  if (window.__aiubFinanceEnhanced) return;
  window.__aiubFinanceEnhanced = true;

  const CSS = `<style id="fin-style">
.fin-root-panel { border: none !important; box-shadow: none !important; }
.fin-root-panel > .panel-heading { display: none !important; }
.fin-root-panel > .panel-body { background: transparent !important; border: none !important; box-shadow: none !important; padding: 16px 4px !important; }

.fin-page-header { margin-bottom: 14px; }
.fin-page-title { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 3px; }
.fin-page-sub { font-size: 13px; color: #6b7280; }

.fin-summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.fin-card {
  flex: 1; min-width: 150px;
  background: #fff; border-radius: 12px; padding: 14px 18px;
  border: 1.5px solid #e5e7eb; box-shadow: 0 1px 4px rgba(0,0,0,.05);
}
.fin-card-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 6px; }
.fin-card-value { font-size: 20px; font-weight: 700; }
.fin-card.fin-card-debit .fin-card-value { color: #dc2626; }
.fin-card.fin-card-credit .fin-card-value { color: #059669; }
.fin-card.fin-card-balance .fin-card-value { color: #d97706; }
.fin-card.fin-card-balance.fin-paid .fin-card-value { color: #059669; }

.fin-table-wrap { overflow-x: auto; border-radius: 12px; border: 1.5px solid #e5e7eb; box-shadow: 0 1px 6px rgba(0,0,0,.04); }

.fin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.fin-table thead tr { background: linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%); }
.fin-table thead th {
  padding: 12px 14px; font-weight: 600; font-size: 11px; color: #fff;
  text-transform: uppercase; letter-spacing: 0.5px;
  border: none !important; white-space: nowrap;
}
.fin-table thead th .fooicon { display: none; }
.fin-table tbody tr { border-bottom: 1px solid #f3f4f6; transition: background 0.12s; }
.fin-table tbody tr:last-child { border-bottom: none; }
.fin-table tbody tr:hover { background: #f9fafb !important; }
.fin-table tbody td { padding: 11px 14px; vertical-align: middle; border: none !important; }

.fin-assessment-row { background: #eff6ff; }
.fin-payment-row { background: #f0fdf4; }
.fin-misc-row { background: #fffbeb; }
.fin-total-row { background: #f1f5f9 !important; border-top: 2px solid #e2e8f0 !important; }
.fin-total-row td { padding: 13px 14px !important; font-weight: 700; }

.fin-badge {
  display: inline-block; font-size: 10px; font-weight: 700;
  padding: 2px 8px; border-radius: 999px; margin-right: 7px;
  vertical-align: middle; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;
}
.fin-badge-assessment { background: #dbeafe; color: #1d4ed8; }
.fin-badge-payment { background: #d1fae5; color: #059669; }
.fin-badge-misc { background: #fef3c7; color: #b45309; }

.fin-cell-particulars { max-width: 280px; }
.fin-assessment-row .fin-cell-particulars a { color: #1d4ed8 !important; font-weight: 600; text-decoration: none; }
.fin-assessment-row .fin-cell-particulars a:hover { text-decoration: underline; }

.fin-cell-date { color: #6b7280; white-space: nowrap; font-size: 12px; }
.fin-cell-debit { text-align: right; white-space: nowrap; font-weight: 600; color: #dc2626; }
.fin-cell-debit.fin-zero { color: #9ca3af; font-weight: 400; }
.fin-cell-credit { text-align: right; white-space: nowrap; font-weight: 600; color: #059669; }
.fin-cell-credit.fin-zero { color: #9ca3af; font-weight: 400; }
.fin-cell-vat { text-align: right; white-space: nowrap; color: #6b7280; }
.fin-cell-balance { text-align: right; white-space: nowrap; font-weight: 700; }
.fin-cell-balance.fin-positive { color: #dc2626; }
.fin-cell-balance.fin-zero { color: #059669; }
.fin-total-row .fin-cell-debit { color: #dc2626; }
.fin-total-row .fin-cell-credit { color: #059669; }

.fin-modal .modal-dialog {
  max-width: 620px; margin: 40px auto;
  border-radius: 14px; overflow: hidden;
}
.fin-modal .modal-content { border: none; border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,.18); }
.fin-modal .modal-header {
  background: linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%);
  border: none; padding: 18px 24px; border-radius: 14px 14px 0 0;
}
.fin-modal .modal-header h4 { color: #fff; font-weight: 700; margin: 0; font-size: 16px; }
.fin-modal .modal-header .close { color: #fff; opacity: 0.8; text-shadow: none; font-size: 22px; margin-top: -2px; }
.fin-modal .modal-header .close:hover { opacity: 1; }
.fin-modal .modal-body { padding: 22px 24px; }
.fin-modal-table { width: 100% !important; border-collapse: collapse !important; font-size: 13px; }
.fin-modal-table thead th {
  padding: 10px 12px; font-weight: 600; font-size: 12px; color: #374151;
  background: #f1f5f9; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.4px;
}
.fin-modal-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
.fin-modal-table tbody tr:last-child td { border-bottom: none; }
.fin-modal-table tbody tr:hover { background: #f9fafb; }
.fin-modal .modal-body h3,
.fin-modal .modal-body h4,
.fin-modal .modal-body h5 { color: #1d4ed8; font-weight: 700; margin: 0 0 12px; font-size: 15px; }
</style>`;

  function parseAmount(text) {
    const n = parseFloat((text || '').replace(/,/g, '').trim());
    return isNaN(n) ? 0 : n;
  }

  function fmtAmt(num) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function enhance() {
    const panelBody = document.querySelector('#main-content .panel-body');
    if (!panelBody) return;

    const table = panelBody.querySelector('table.table-details');
    if (!table) return;



    const panel = panelBody.closest('.panel');
    if (panel) panel.classList.add('fin-root-panel');

    const wrap = document.createElement('div');
    wrap.className = 'fin-table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
    table.classList.add('fin-table');

    let totalDebit = 0, totalCredit = 0, finalBalance = 0;

    table.querySelectorAll('tbody tr').forEach(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      if (!cells.length) return;

      if (cells[0].hasAttribute('colspan')) {
        row.classList.add('fin-total-row');
        if (cells.length >= 5) {
          totalDebit   = parseAmount(cells[1].querySelector('label')?.textContent || cells[1].textContent);
          totalCredit  = parseAmount(cells[2].textContent);
          finalBalance = parseAmount(cells[4].textContent);
          cells[1].classList.add('fin-cell-debit');
          cells[2].classList.add('fin-cell-credit');
          cells[3].classList.add('fin-cell-vat');
          cells[4].classList.add('fin-cell-balance');
          const balAmt = parseAmount(cells[4].textContent);
          cells[4].classList.add(balAmt === 0 ? 'fin-zero' : 'fin-positive');
        }
        return;
      }

      if (cells.length < 6) return;

      const [dateCell, particularsCell, debitCell, creditCell, vatCell, balanceCell] = cells;

      dateCell.classList.add('fin-cell-date');
      particularsCell.classList.add('fin-cell-particulars');
      debitCell.classList.add('fin-cell-debit');
      creditCell.classList.add('fin-cell-credit');
      vatCell.classList.add('fin-cell-vat');
      balanceCell.classList.add('fin-cell-balance');

      if (parseAmount(debitCell.textContent)  === 0) debitCell.classList.add('fin-zero');
      if (parseAmount(creditCell.textContent) === 0) creditCell.classList.add('fin-zero');
      const balAmt = parseAmount(balanceCell.textContent);
      balanceCell.classList.add(balAmt === 0 ? 'fin-zero' : 'fin-positive');

      const modalLink = particularsCell.querySelector('a[data-toggle="modal"]');
      if (modalLink) {
        row.classList.add('fin-assessment-row');
        const badge = document.createElement('span');
        badge.className = 'fin-badge fin-badge-assessment';
        badge.textContent = 'Assessment';
        modalLink.before(badge);
      } else if (particularsCell.textContent.trim().toLowerCase().includes('semester payment')) {
        row.classList.add('fin-payment-row');
        particularsCell.insertAdjacentHTML('afterbegin', '<span class="fin-badge fin-badge-payment">Payment</span>');
      } else {
        row.classList.add('fin-misc-row');
        particularsCell.insertAdjacentHTML('afterbegin', '<span class="fin-badge fin-badge-misc">Fee</span>');
      }
    });

    const summaryHTML = `
<div class="fin-page-header">
  <div class="fin-page-title">Financial Details</div>
  <div class="fin-page-sub">Your complete tuition and payment history</div>
</div>
<div class="fin-summary">
  <div class="fin-card fin-card-debit">
    <div class="fin-card-label">Total Charged</div>
    <div class="fin-card-value">&#2547;${fmtAmt(totalDebit)}</div>
  </div>
  <div class="fin-card fin-card-credit">
    <div class="fin-card-label">Total Paid</div>
    <div class="fin-card-value">&#2547;${fmtAmt(totalCredit)}</div>
  </div>
  <div class="fin-card fin-card-balance${finalBalance === 0 ? ' fin-paid' : ''}">
    <div class="fin-card-label">Balance Due</div>
    <div class="fin-card-value">&#2547;${fmtAmt(finalBalance)}</div>
  </div>
</div>`;
    wrap.insertAdjacentHTML('beforebegin', summaryHTML);

    const modal = document.getElementById('assesmentModal');
    if (modal) {
      modal.classList.add('fin-modal');
      const divDetails = document.getElementById('divAssessmentDetails');
      if (divDetails) {
        new MutationObserver(() => {
          divDetails.querySelectorAll('table:not(.fin-modal-table)').forEach(t => {
            t.classList.add('fin-modal-table');
          });
        }).observe(divDetails, { childList: true, subtree: true });
      }
    }
  }

  function tryEnhance() {
    if (document.querySelector('#main-content .panel-body table.table-details')) {
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
