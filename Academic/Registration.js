(function () {
  'use strict';

  if (window.location.pathname !== '/Student/Registration') return;
  if (window.__aiubRegEnhanced) return;
  window.__aiubRegEnhanced = true;

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function injectCSS() {
    if (document.getElementById('aiub-reg-css')) return;
    const s = document.createElement('style');
    s.id = 'aiub-reg-css';
    s.textContent = `
      .reg-root-panel > .panel-heading { display: none !important; }
      .reg-root-panel { box-shadow: none !important; border: none !important;
        background: transparent !important; margin-bottom: 0 !important; }
      .reg-root-panel > .panel-body { padding: 8px 0 0 !important; background: transparent !important; }

      .reg-wrap {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
        font-size: 13px; color: #1e293b;
      }

      .reg-top {
        display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 10px;
        margin-bottom: 16px; padding-bottom: 14px; border-bottom: 2px solid #f1f5f9;
      }
      .reg-title { font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -.3px; margin: 0; }
      .reg-title span { color: #2563eb; }
      .reg-top-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .reg-sem-select {
        font-size: 12px; font-weight: 600; color: #334155;
        border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px;
        background: #f8fafc; cursor: pointer; outline: none;
        transition: border-color .15s, box-shadow .15s;
      }
      .reg-sem-select:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59,130,246,.1); }
      .reg-print-btn {
        font-size: 11px; font-weight: 600; color: #475569; text-decoration: none;
        border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 13px; background: #f8fafc;
        transition: background .15s, color .15s, border-color .15s; white-space: nowrap;
      }
      .reg-print-btn:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; text-decoration: none; }

      .reg-credits { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 18px; }
      .reg-credit-chip {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
        background: #f1f5f9; border: 1px solid #e2e8f0; color: #94a3b8;
      }
      .reg-credit-chip.active { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
      .reg-credit-num { font-weight: 800; font-size: 13px; margin-right: 1px; }

      .reg-body { display: grid; grid-template-columns: 1fr 270px; gap: 16px; align-items: start; }

      .reg-course-list { display: flex; flex-direction: column; gap: 10px; }
      .reg-course-card {
        border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
        transition: box-shadow .15s, border-color .15s; background: #fff;
      }
      .reg-course-card:hover { box-shadow: 0 2px 8px rgba(37,99,235,.08); border-color: #bfdbfe; }
      .reg-course-card.dropped { border-color: #fca5a5; background: #fff5f5; }
      .reg-course-card.dropped:hover { border-color: #f87171; box-shadow: 0 2px 8px rgba(220,38,38,.08); }

      .reg-course-head { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px 8px; }
      .reg-course-info { flex: 1; min-width: 0; }
      .reg-course-code {
        font-family: 'Consolas', 'Cascadia Code', 'Courier New', monospace;
        font-size: 11px; font-weight: 600; color: #1e3a8a; margin-bottom: 3px; letter-spacing: .3px;
      }
      .reg-course-card.dropped .reg-course-code { color: #9ca3af; }
      .reg-course-name { font-size: 13px; font-weight: 600; color: #0f172a; line-height: 1.3; }
      .reg-course-card.dropped .reg-course-name { color: #9ca3af; text-decoration: line-through; }

      .reg-section-badge {
        flex-shrink: 0; width: 30px; height: 30px; border-radius: 8px;
        background: #eff6ff; border: 1px solid #bfdbfe;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 800; color: #1d4ed8; letter-spacing: 0;
      }
      .reg-course-card.dropped .reg-section-badge { background: #f3f4f6; border-color: #e5e7eb; color: #9ca3af; }

      .reg-schedule { padding: 0 14px 8px; display: flex; flex-direction: column; gap: 4px; }
      .reg-schedule-row { display: flex; align-items: center; gap: 7px; font-size: 11px; color: #64748b; flex-wrap: wrap; }
      .reg-sched-type {
        display: inline-block; padding: 1px 7px; border-radius: 4px;
        font-size: 10px; font-weight: 700; white-space: nowrap; flex-shrink: 0;
      }
      .reg-sched-th  { background: #eff6ff; color: #1d4ed8; }
      .reg-sched-lab { background: #f0fdf4; color: #166534; }
      .reg-sched-oth { background: #f1f5f9; color: #475569; }
      .reg-sched-time { color: #475569; }
      .reg-sched-room {
        margin-left: auto; font-size: 10px; font-weight: 700;
        color: #94a3b8; white-space: nowrap; font-family: 'Consolas', monospace;
      }

      .reg-course-footer {
        display: flex; align-items: center; justify-content: space-between;
        padding: 5px 14px 9px; gap: 8px;
      }
      .reg-credits-tag {
        font-size: 10px; color: #94a3b8; font-family: 'Consolas', monospace; font-weight: 600;
      }
      .reg-drop-badge {
        display: inline-flex; align-items: center; gap: 4px;
        background: #fee2e2; color: #dc2626; border-radius: 5px;
        padding: 2px 8px; font-size: 10px; font-weight: 700;
      }

      .reg-fee-panel {
        border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
        background: #fff; position: sticky; top: 16px;
      }
      .reg-fee-head {
        padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
        font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; color: #475569;
      }
      .reg-fee-list { padding: 4px 0; }
      .reg-fee-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 5px 14px; gap: 8px;
      }
      .reg-fee-row:hover { background: #f8fafc; }
      .reg-fee-lbl { font-size: 12px; color: #64748b; }
      .reg-fee-amt { font-size: 12px; font-weight: 600; color: #334155; white-space: nowrap; font-family: 'Consolas', monospace; }
      .reg-fee-row.zero .reg-fee-lbl { color: #cbd5e1; }
      .reg-fee-row.zero .reg-fee-amt { color: #e2e8f0; }
      .reg-fee-divider { height: 1px; background: #e2e8f0; margin: 4px 0; }

      .reg-fee-row.total .reg-fee-lbl { font-weight: 700; color: #0f172a; }
      .reg-fee-row.total .reg-fee-amt { font-weight: 800; color: #2563eb; font-size: 13px; }

      .reg-fee-row.deduction .reg-fee-lbl { color: #d97706; }
      .reg-fee-row.deduction .reg-fee-amt { color: #d97706; }
      .reg-fee-row.prev .reg-fee-lbl { color: #d97706; }
      .reg-fee-row.prev .reg-fee-amt { color: #d97706; }

      .reg-fee-row.net-total .reg-fee-lbl { font-weight: 700; color: #0f172a; }
      .reg-fee-row.net-total .reg-fee-amt { font-weight: 800; color: #059669; font-size: 13px; }

      .reg-fee-row.paid .reg-fee-lbl { color: #475569; font-weight: 600; }
      .reg-fee-row.paid .reg-fee-amt { color: #475569; }

      .reg-fee-row.balance .reg-fee-lbl { font-weight: 700; color: #0f172a; }
      .reg-fee-row.balance .reg-fee-amt { font-weight: 800; font-size: 14px; }
      .reg-fee-row.balance.owe .reg-fee-amt { color: #dc2626; }
      .reg-fee-row.balance.clear .reg-fee-amt { color: #059669; }

      @media (max-width: 900px) {
        .reg-body { grid-template-columns: 1fr; }
        .reg-fee-panel { position: static; }
      }
    `;
  }

  function parseCreditSummary(tbl) {
    const items = [];
    tbl.querySelectorAll('div[class*="col-"]').forEach(col => {
      const labels = [...col.children].filter(el => el.tagName === 'LABEL');
      if (labels.length >= 2) {
        const key = labels[0].textContent.replace(':', '').trim();
        const val = labels[1].textContent.trim();
        if (key) items.push({ key, val });
      }
    });
    return items;
  }

  function parseScheduleLine(text) {
    const typeMatch  = text.match(/^\(([^)]+)\)/);
    const type       = typeMatch ? typeMatch[1] : '';
    const afterType  = text.replace(/^\([^)]+\)\s*/, '');
    const roomIdx    = afterType.lastIndexOf('Room:');
    const timePart   = (roomIdx > 0 ? afterType.slice(0, roomIdx) : afterType).replace(/^Time:\s*/, '').trim();
    const room       = roomIdx > 0 ? afterType.slice(roomIdx + 5).trim() : '';
    return { type, time: timePart, room };
  }

  function parseCourses(table) {
    const courses = [];
    table.querySelectorAll('tbody tr').forEach(tr => {
      const tds = [...tr.querySelectorAll('td')];
      if (!tds.length) return;
      const firstTd = tds[0];
      const a = firstTd.querySelector('a');
      if (!a) return;

      const fullText     = a.textContent.trim();
      const sectionMatch = fullText.match(/\[([A-Z0-9]+)\]$/);
      const section      = sectionMatch ? sectionMatch[1] : '';
      const withoutSec   = fullText.replace(/\s*\[[A-Z0-9]+\]$/, '').trim();
      const dashIdx      = withoutSec.indexOf('-');
      const code         = dashIdx >= 0 ? withoutSec.slice(0, dashIdx).trim() : '';
      const name         = dashIdx >= 0 ? withoutSec.slice(dashIdx + 1).trim() : withoutSec;

      const schedules = [...firstTd.querySelectorAll('div')].reduce((acc, d) => {
        const span = d.querySelector('span');
        if (!span || span.style.color === 'red') return acc;
        const txt = span.textContent.trim();
        if (txt) acc.push(parseScheduleLine(txt));
        return acc;
      }, []);

      const dropSpan    = firstTd.querySelector('span[style*="color: red"]');
      const droppedText = dropSpan ? dropSpan.textContent.trim() : '';
      const credStr     = tds[1] ? tds[1].textContent.trim() : '';
      const href        = a.getAttribute('href') || '#';

      courses.push({ code, name, section, schedules, droppedText, credStr, href });
    });
    return courses;
  }

  function parseFees(div) {
    const items = [];
    div.querySelectorAll('li').forEach(li => {
      const badge = li.querySelector('.badge');
      if (!badge) return;
      const amt    = badge.textContent.trim();
      const clone  = li.cloneNode(true);
      clone.querySelector('.badge')?.remove();
      const label  = clone.textContent.trim();

      const si = li.querySelector('strong.text-info, label.text-info, .text-info');
      const sw = li.querySelector('label.text-warning, .text-warning');
      const ss = li.querySelector('label.text-success, .text-success');
      const st = li.querySelector('strong');

      let type = 'normal';
      if (si) {
        type = si.textContent.toLowerCase().includes('net') ? 'net-total' : 'total';
      } else if (sw) {
        type = label.toLowerCase().includes('prev') ? 'prev' : 'deduction';
      } else if (ss) {
        type = 'balance';
      } else if (st) {
        type = 'paid';
      }

      items.push({ label, amt, type });
    });
    return items;
  }

  function schedClass(type) {
    const t = type.toLowerCase();
    if (t === 'theory') return 'reg-sched-th';
    if (t === 'lab')    return 'reg-sched-lab';
    return 'reg-sched-oth';
  }

  function courseCardHTML(c) {
    const isDropped  = !!c.droppedText;
    const dropMatch  = c.droppedText.match(/\(([^)]+)\)/);
    const dropDetail = dropMatch ? dropMatch[1] : '';

    const safeHref = c.href && /^[/?#]/.test(c.href) ? c.href : '#';

    const schedHTML = c.schedules.map(s =>
      `<div class="reg-schedule-row">
        <span class="reg-sched-type ${schedClass(s.type)}">${esc(s.type || 'Time')}</span>
        <span class="reg-sched-time">${esc(s.time)}</span>
        ${s.room ? `<span class="reg-sched-room">${esc(s.room)}</span>` : ''}
      </div>`
    ).join('');

    return `
      <div class="reg-course-card${isDropped ? ' dropped' : ''}">
        <div class="reg-course-head">
          <div class="reg-course-info">
            <div class="reg-course-code">
              <a href="${esc(safeHref)}" style="color:inherit;text-decoration:none">${esc(c.code)}</a>
            </div>
            <div class="reg-course-name">${esc(c.name)}</div>
          </div>
          ${c.section ? `<div class="reg-section-badge">${esc(c.section)}</div>` : ''}
        </div>
        ${schedHTML ? `<div class="reg-schedule">${schedHTML}</div>` : ''}
        <div class="reg-course-footer">
          <span class="reg-credits-tag">${esc(c.credStr)}</span>
          ${isDropped ? `<span class="reg-drop-badge">&#9888; Dropped ${esc(dropDetail)}</span>` : ''}
        </div>
      </div>`;
  }

  function feePanelHTML(items) {
    if (!items.length) return '';
    const rowsHTML = items.map(item => {
      const num    = parseFloat(item.amt.replace(/,/g, ''));
      const isZero = !isNaN(num) && num === 0 && item.type === 'normal';
      let cls = item.type;
      if (item.type === 'balance') cls += num > 0 ? ' owe' : ' clear';

      const needsDivider = item.type === 'total' || item.type === 'net-total' || item.type === 'balance';
      const divider = needsDivider ? '<div class="reg-fee-divider"></div>' : '';
      return `${divider}
        <div class="reg-fee-row ${cls}${isZero ? ' zero' : ''}">
          <span class="reg-fee-lbl">${esc(item.label)}</span>
          <span class="reg-fee-amt">${esc(item.amt)}</span>
        </div>`;
    }).join('');
    return `
      <div class="reg-fee-panel">
        <div class="reg-fee-head">Fee Assessment</div>
        <div class="reg-fee-list">${rowsHTML}</div>
      </div>`;
  }

  function enhance() {
    const panel = document.querySelector('#main-content .margin5 .panel.panel-default') ||
                  document.querySelector('#main-content .panel.panel-default');
    if (!panel) return;

    panel.classList.add('reg-root-panel');

    const origSelect = panel.querySelector('#SemesterDropDown');
    const semOptions = origSelect
      ? [...origSelect.querySelectorAll('option')].map(o => ({
          val: o.value, text: o.textContent.trim(), selected: o.selected,
        }))
      : [];

    const printBtn  = panel.querySelector('a.btn-danger');
    const printHref = printBtn ? printBtn.getAttribute('href') : null;
    const safeHref  = printHref && /^[/?#]/.test(printHref) ? printHref : null;

    const creditTbl   = panel.querySelector('.panel-body table');
    const creditItems = creditTbl ? parseCreditSummary(creditTbl) : [];

    const courseTbl = panel.querySelector('.table-details');
    const courses   = courseTbl ? parseCourses(courseTbl) : [];

    const divAssesment = panel.querySelector('#divAssesment');
    const fees         = divAssesment ? parseFees(divAssesment) : [];

    const semOptsHTML = semOptions.map(o =>
      `<option value="${esc(o.val)}"${o.selected ? ' selected' : ''}>${esc(o.text)}</option>`
    ).join('');

    const creditChips = creditItems.map(({ key, val }) => {
      const active = parseFloat(val) > 0;
      return `<span class="reg-credit-chip${active ? ' active' : ''}">
        <span class="reg-credit-num">${esc(val)}</span>${esc(key)}
      </span>`;
    }).join('');

    const html = `
      <div class="reg-wrap">
        <div class="reg-top">
          <h2 class="reg-title">Course <span>Registration</span></h2>
          <div class="reg-top-right">
            ${semOptsHTML ? `<select class="reg-sem-select" id="reg-sem-select">${semOptsHTML}</select>` : ''}
            ${safeHref ? `<a class="reg-print-btn" href="${esc(safeHref)}">&#128438; Print</a>` : ''}
          </div>
        </div>
        <div class="reg-credits">${creditChips}</div>
        <div class="reg-body">
          <div class="reg-course-list">
            ${courses.length ? courses.map(courseCardHTML).join('') : '<p style="color:#94a3b8;font-size:13px;margin:0">No registered courses.</p>'}
          </div>
          ${feePanelHTML(fees)}
        </div>
      </div>`;

    const panelBody = panel.querySelector('.panel-body');
    if (panelBody) panelBody.innerHTML = html;

    const newSelect = panel.querySelector('#reg-sem-select');
    if (newSelect) {
      newSelect.addEventListener('change', function () {
        window.location.href = this.value;
      });
    }
  }

  function init() {
    const hasCourses = document.querySelector('.table-details');
    const hasFees    = document.querySelector('#divAssesment');
    if (!hasCourses && !hasFees) {
      setTimeout(init, 400);
      return;
    }
    injectCSS();
    enhance();
  }

  chrome.storage.sync.get({ extensionEnabled: true }, function (r) {
    if (!r.extensionEnabled) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });
})();
