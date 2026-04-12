(function () {
  'use strict';
  if (window.__aiubCurriculumEnhanced) return;
  window.__aiubCurriculumEnhanced = true;

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── CSS ──────────────────────────────────────────────────────── */
  const CSS = `
/* Sidebar fix */
.cur-root-panel > .panel-heading { display: none !important; }
.cur-root-panel { box-shadow: none !important; border: none !important; background: transparent !important; }
.cur-root-panel > .panel-body { background: transparent !important; padding: 8px 0 !important; }

/* Suppress original h4s — replaced by .cur-page-header */
.cur-root-panel .panel-body > h4 { display: none !important; }

/* Page header */
.cur-page-header { margin-bottom: 20px; padding: 16px 20px; background: linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%); border-radius: 14px; border: 1.5px solid #e0e7ff; }
.cur-faculty { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 6px; }
.cur-degree { font-size: 19px; font-weight: 800; color: #111827; letter-spacing: -0.4px; }

/* Curriculum cards */
.cur-card { border: none !important; border-radius: 14px !important; overflow: hidden; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06) !important; }
.cur-card > .panel-body { padding: 0 !important; background: transparent !important; }
.cur-card > .panel-heading { padding: 14px 18px !important; border-bottom: none !important; display: flex !important; align-items: center !important; gap: 10px !important; }
.cur-card > .panel-heading b { font-size: 14px; font-weight: 700; flex: 1; }

/* Core — blue */
.cur-card-core { background: #f0f9ff !important; }
.cur-card-core > .panel-heading { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important; }
.cur-card-core > .panel-heading b { color: #1e3a8a !important; }
.cur-card-core .cur-type-badge { background: #1d4ed8; color: #fff; }
.cur-card-core .cur-show-btn { background: linear-gradient(135deg, #2563eb, #1d4ed8) !important; color: #fff !important; }
.cur-card-core .cur-show-btn:hover { filter: brightness(1.1) !important; }

/* Elective — purple */
.cur-card-elective { background: #faf5ff !important; }
.cur-card-elective > .panel-heading { background: linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%) !important; }
.cur-card-elective > .panel-heading b { color: #4c1d95 !important; }
.cur-card-elective .cur-type-badge { background: #7c3aed; color: #fff; }
.cur-card-elective .cur-show-btn { background: linear-gradient(135deg, #7c3aed, #6d28d9) !important; color: #fff !important; }
.cur-card-elective .cur-show-btn:hover { filter: brightness(1.1) !important; }

/* Type badge */
.cur-type-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; flex-shrink: 0; }

/* Info table — remove inner box borders */
.cur-card .curriculum-info { background: transparent !important; border: none !important; margin: 0 !important; }
.cur-card .curriculum-info tr { background: transparent !important; }
.cur-card .curriculum-info td { border: none !important; border-bottom: 1px solid rgba(0,0,0,0.05) !important; padding: 8px 18px !important; font-size: 13px; }
.cur-card .curriculum-info td:first-child { color: #6b7280; font-size: 12px; width: 42% !important; }
.cur-card .curriculum-info td:last-child { color: #111827; font-weight: 500; }
.cur-card .curriculum-info tr:last-child td { border-bottom: none !important; padding: 12px 18px !important; }
.cur-card table.table-bordered { border: none !important; }
.cur-card table.table-bordered td { border-left: none !important; border-right: none !important; }
.cur-card table.table-bordered tr:first-child td { border-top: none !important; }

/* Show Curriculum button */
.cur-show-btn { display: inline-flex !important; align-items: center !important; gap: 6px !important; padding: 8px 18px !important; border-radius: 8px !important; font-size: 13px !important; font-weight: 600 !important; border: none !important; cursor: pointer !important; box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important; transition: filter 0.15s, transform 0.1s !important; }
.cur-show-btn:hover { transform: translateY(-1px) !important; }

/* Modal sizing */
.cur-modal-dialog { max-width: 820px !important; width: 92vw !important; margin: 30px auto !important; }
.cur-modal-content { border-radius: 14px !important; border: none !important; box-shadow: 0 24px 60px rgba(0,0,0,0.18) !important; overflow: hidden; }
.cur-modal-body { padding: 0 !important; }
#divCurriculumCourses { height: auto !important; max-height: 72vh; overflow-y: auto; padding: 0; }

/* Modal inner content */
.cur-modal-inner { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; }
.cur-modal-inner h3, .cur-modal-inner h4, .cur-modal-inner h5 {
  margin: 0 !important; padding: 10px 20px !important;
  font-size: 13px !important; font-weight: 700 !important;
  background: linear-gradient(135deg, #dbeafe, #eff6ff) !important;
  color: #1e3a8a !important; border-bottom: 1px solid #bfdbfe !important;
  border-top: 1px solid #bfdbfe !important;
}
.cur-modal-inner h3:first-child, .cur-modal-inner h4:first-child { border-top: none !important; }
.cur-modal-inner p { padding: 6px 20px; color: #6b7280; font-style: italic; font-size: 12px; }
.cur-modal-table { width: 100% !important; border-collapse: collapse !important; margin: 0 !important; }
.cur-modal-table thead th { background: #f8fafc !important; color: #475569 !important; font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; padding: 9px 16px !important; border: none !important; border-bottom: 2px solid #e2e8f0 !important; }
.cur-modal-table tbody td { padding: 8px 16px !important; border: none !important; border-bottom: 1px solid #f1f5f9 !important; color: #374151 !important; font-size: 13px !important; }
.cur-modal-table tbody tr:hover td { background: #f0f9ff !important; }
.cur-modal-table tbody tr:last-child td { border-bottom: none !important; }
.cur-modal-table .label { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
`;

  /* ── Inject CSS ──────────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('cur-style')) return;
    const s = document.createElement('style');
    s.id = 'cur-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ── Get curriculum type from card ──────────────────────────── */
  function getType(card) {
    for (const tr of card.querySelectorAll('.curriculum-info tr')) {
      const cells = tr.querySelectorAll('td');
      if (cells.length >= 2 && /Curriculum Type/i.test(cells[0].textContent)) {
        return cells[1].textContent.trim();
      }
    }
    return '';
  }

  /* ── Insert styled page header above h4s ────────────────────── */
  function injectPageHeader(panelBody) {
    const h4s = [...panelBody.querySelectorAll(':scope > h4')];
    if (!h4s.length) return;
    const faculty = h4s[0]?.textContent.trim() || '';
    const degree  = h4s[1]?.textContent.trim() || '';
    const div = document.createElement('div');
    div.className = 'cur-page-header';
    div.innerHTML =
      (faculty ? `<div class="cur-faculty">${esc(faculty)}</div>` : '') +
      (degree  ? `<div class="cur-degree">${esc(degree)}</div>`  : '');
    panelBody.insertBefore(div, h4s[0]);
  }

  /* ── Style modal content after AJAX load ────────────────────── */
  function styleModalContent(div) {
    if (!div.innerHTML.trim() || div.innerHTML.trim() === 'Loading...') return;
    if (div.querySelector('.cur-modal-inner')) return; // already styled

    div.querySelectorAll('table').forEach(t => {
      t.classList.add('cur-modal-table');
      // remove Bootstrap table-bordered inline borders
      t.style.border = 'none';
    });

    // Wrap everything in a styled container
    const wrapper = document.createElement('div');
    wrapper.className = 'cur-modal-inner';
    while (div.firstChild) wrapper.appendChild(div.firstChild);
    div.appendChild(wrapper);
  }

  /* ── Style the modal shell ───────────────────────────────────── */
  function styleModal() {
    const modal = document.getElementById('curriculumCoursesModal');
    if (!modal) return;
    modal.querySelector('.modal-dialog')?.classList.add('cur-modal-dialog');
    modal.querySelector('.modal-content')?.classList.add('cur-modal-content');
    modal.querySelector('.modal-body')?.classList.add('cur-modal-body');
  }

  /* ── Main enhancement ────────────────────────────────────────── */
  function enhance() {
    const mainPanel = document.querySelector('#main-content .panel.panel-default');
    if (!mainPanel) return;
    mainPanel.classList.add('cur-root-panel');

    const panelBody = mainPanel.querySelector('.panel-body');
    if (!panelBody) return;

    injectPageHeader(panelBody);

    // Style each curriculum card
    panelBody.querySelectorAll(':scope > .panel.panel-default').forEach(card => {
      card.classList.add('cur-card');
      const type = getType(card);
      card.classList.add(type === 'Elective' ? 'cur-card-elective' : 'cur-card-core');

      // Type badge in heading
      const heading = card.querySelector(':scope > .panel-heading');
      if (heading && !heading.querySelector('.cur-type-badge')) {
        const badge = document.createElement('span');
        badge.className = 'cur-type-badge';
        badge.textContent = type || 'Core';
        heading.appendChild(badge);
      }

      // Style the button
      card.querySelector('.btnShowCurriculumCourses')?.classList.add('cur-show-btn');
    });

    styleModal();

    // Watch for modal AJAX content
    const divCourses = document.getElementById('divCurriculumCourses');
    if (divCourses) {
      const obs = new MutationObserver(() => styleModalContent(divCourses));
      obs.observe(divCourses, { childList: true });
    }
  }

  /* ── Boot ────────────────────────────────────────────────────── */
  function init() {
    injectCSS();
    if (document.querySelector('#main-content .panel.panel-default')) {
      enhance();
    } else {
      const obs = new MutationObserver(() => {
        if (document.querySelector('#main-content .panel.panel-default')) {
          obs.disconnect();
          enhance();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
