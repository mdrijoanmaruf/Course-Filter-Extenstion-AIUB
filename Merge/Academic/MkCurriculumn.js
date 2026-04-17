(function () {
  'use strict';
  if (window.__aiubCurriculumEnhanced) return;
  window.__aiubCurriculumEnhanced = true;

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  const NIL_TOKENS = new Set(['', 'NIL', 'NILL', 'N/A', 'NA', '-']);
  let courseCatalog = [];
  const courseByCode = new Map();
  const courseByCodeAndName = new Map();

  function norm(v) {
    return String(v || '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function normCode(v) {
    return norm(v).replace(/\s+/g, '');
  }

  function buildCatalogIndex(items) {
    items.forEach(item => {
      const codeKey = normCode(item.course);
      const nameKey = norm(item.course_name);
      if (!courseByCode.has(codeKey)) courseByCode.set(codeKey, []);
      courseByCode.get(codeKey).push(item);
      courseByCodeAndName.set(`${codeKey}::${nameKey}`, item);
    });
  }

  function loadCourseCatalog() {
    return fetch(chrome.runtime.getURL('Academic/CSE.json'))
      .then(r => (r.ok ? r.json() : []))
      .then(items => {
        if (!Array.isArray(items)) return;
        courseCatalog = items;
        buildCatalogIndex(items);
      })
      .catch(() => {
        courseCatalog = [];
      });
  }

  function findCourseMeta(code, name) {
    const codeKey = normCode(code);
    const nameKey = norm(name);
    const exact = courseByCodeAndName.get(`${codeKey}::${nameKey}`);
    if (exact) return exact;

    const byCode = courseByCode.get(codeKey) || [];
    if (byCode.length === 1) return byCode[0];
    if (byCode.length > 1) {
      const contains = byCode.find(item => {
        const itemName = norm(item.course_name);
        return itemName === nameKey || itemName.includes(nameKey) || nameKey.includes(itemName);
      });
      if (contains) return contains;
      return byCode[0];
    }

    const fallback = courseCatalog.find(item => norm(item.course_name) === nameKey);
    return fallback || null;
  }

  function formatPrerequisite(meta) {
    if (!meta) return 'Nil';

    if (Array.isArray(meta.prerequisites) && meta.prerequisites.length > 0) {
      return meta.prerequisites.join(', ');
    }

    const raw = String(meta.prerequisite || '').trim();
    if (!raw || NIL_TOKENS.has(norm(raw))) return 'Nil';
    return raw;
  }

  function enhanceCurriculumTable(table) {
    if (table.dataset.curPrereqEnhanced === '1') return;

    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    const headerTexts = [...headerRow.querySelectorAll('th')].map(th => norm(th.textContent));
    const hasCode = headerTexts.some(t => t.includes('CODE'));
    const hasCourse = headerTexts.some(t => t.includes('COURSE'));
    const hasCredit = headerTexts.some(t => t.includes('CREDIT'));
    if (!hasCode || !hasCourse || !hasCredit) return;

    const hasPrereq = headerTexts.some(t => t.includes('PREREQ'));
    if (!hasPrereq) {
      const th = document.createElement('th');
      th.textContent = 'Prerequisite';
      th.style.width = '22%';
      const last = headerRow.lastElementChild;
      if (last) {
        headerRow.insertBefore(th, last);
      } else {
        headerRow.appendChild(th);
      }
    }

    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('td')];
      if (!cells.length) return;

      const rowText = norm(tr.textContent);
      if (rowText.includes('TOTAL CREDIT') || rowText.includes('GRAND TOTAL')) {
        return;
      }

      if (cells.length < 3) return;
      const code = cells[0].textContent.trim();
      const courseName = cells[1].textContent.trim();
      if (!code || !courseName) return;

      const meta = findCourseMeta(code, courseName);
      const existingPrereq = cells.length >= 4 ? cells[2].textContent.trim() : '';
      const prereqText = meta
        ? formatPrerequisite(meta)
        : (existingPrereq && !NIL_TOKENS.has(norm(existingPrereq)) ? existingPrereq : 'Nil');

      if (cells.length === 3) {
        const td = document.createElement('td');
        td.textContent = prereqText;
        tr.insertBefore(td, cells[2]);
      } else {
        cells[2].textContent = prereqText;
      }
    });

    table.dataset.curPrereqEnhanced = '1';
  }

  const CSS = `
.cur-root-panel > .panel-heading { display: none !important; }
.cur-root-panel { box-shadow: none !important; border: none !important; background: transparent !important; }
.cur-root-panel > .panel-body { background: transparent !important; padding: 8px 0 !important; }

.cur-root-panel .panel-body > h4 { display: none !important; }

.cur-page-header { margin-bottom: 20px; padding: 16px 20px; background: linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%); border-radius: 14px; border: 1.5px solid #e0e7ff; }
.cur-faculty { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 6px; }
.cur-degree { font-size: 19px; font-weight: 800; color: #111827; letter-spacing: -0.4px; }

.cur-card { border: none !important; border-radius: 14px !important; overflow: hidden; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.06) !important; }
.cur-card > .panel-body { padding: 0 !important; background: transparent !important; }
.cur-card > .panel-heading { padding: 14px 18px !important; border-bottom: none !important; display: flex !important; align-items: center !important; gap: 10px !important; }
.cur-card > .panel-heading b { font-size: 14px; font-weight: 700; flex: 1; }

.cur-card-core { background: #f0f9ff !important; }
.cur-card-core > .panel-heading { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important; }
.cur-card-core > .panel-heading b { color: #1e3a8a !important; }
.cur-card-core .cur-type-badge { background: #1d4ed8; color: #fff; }
.cur-card-core .cur-show-btn { background: linear-gradient(135deg, #2563eb, #1d4ed8) !important; color: #fff !important; }
.cur-card-core .cur-show-btn:hover { filter: brightness(1.1) !important; }

.cur-card-elective { background: #faf5ff !important; }
.cur-card-elective > .panel-heading { background: linear-gradient(135deg, #ede9fe 0%, #c4b5fd 100%) !important; }
.cur-card-elective > .panel-heading b { color: #4c1d95 !important; }
.cur-card-elective .cur-type-badge { background: #7c3aed; color: #fff; }
.cur-card-elective .cur-show-btn { background: linear-gradient(135deg, #7c3aed, #6d28d9) !important; color: #fff !important; }
.cur-card-elective .cur-show-btn:hover { filter: brightness(1.1) !important; }

.cur-type-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; flex-shrink: 0; }

.cur-card .curriculum-info { background: transparent !important; border: none !important; margin: 0 !important; }
.cur-card .curriculum-info tr { background: transparent !important; }
.cur-card .curriculum-info td { border: none !important; border-bottom: 1px solid rgba(0,0,0,0.05) !important; padding: 8px 18px !important; font-size: 13px; }
.cur-card .curriculum-info td:first-child { color: #6b7280; font-size: 12px; width: 42% !important; }
.cur-card .curriculum-info td:last-child { color: #111827; font-weight: 500; }
.cur-card .curriculum-info tr:last-child td { border-bottom: none !important; padding: 12px 18px !important; }
.cur-card table.table-bordered { border: none !important; }
.cur-card table.table-bordered td { border-left: none !important; border-right: none !important; }
.cur-card table.table-bordered tr:first-child td { border-top: none !important; }

.cur-show-btn { display: inline-flex !important; align-items: center !important; gap: 6px !important; padding: 8px 18px !important; border-radius: 8px !important; font-size: 13px !important; font-weight: 600 !important; border: none !important; cursor: pointer !important; box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important; transition: filter 0.15s, transform 0.1s !important; }
.cur-show-btn:hover { transform: translateY(-1px) !important; }

.cur-modal-dialog { max-width: 820px !important; width: 92vw !important; margin: 30px auto !important; }
.cur-modal-content { border-radius: 14px !important; border: none !important; box-shadow: 0 24px 60px rgba(0,0,0,0.18) !important; overflow: hidden; }
.cur-modal-body { padding: 0 !important; }
#divCurriculumCourses { height: auto !important; max-height: 72vh; overflow-y: auto; padding: 0; }

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

  function injectCSS() { }

  function getType(card) {
    for (const tr of card.querySelectorAll('.curriculum-info tr')) {
      const cells = tr.querySelectorAll('td');
      if (cells.length >= 2 && /Curriculum Type/i.test(cells[0].textContent)) {
        return cells[1].textContent.trim();
      }
    }
    return '';
  }

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

  function styleModalContent(div) {
    if (!div.innerHTML.trim() || div.innerHTML.trim() === 'Loading...') return;
    div.querySelectorAll('table').forEach(t => {
      enhanceCurriculumTable(t);
      t.classList.add('cur-modal-table');
      t.style.border = 'none';
    });

    if (div.querySelector('.cur-modal-inner')) return; // already wrapped

    const wrapper = document.createElement('div');
    wrapper.className = 'cur-modal-inner';
    while (div.firstChild) wrapper.appendChild(div.firstChild);
    div.appendChild(wrapper);
  }

  function styleModal() {
    const modal = document.getElementById('curriculumCoursesModal');
    if (!modal) return;
    modal.querySelector('.modal-dialog')?.classList.add('cur-modal-dialog');
    modal.querySelector('.modal-content')?.classList.add('cur-modal-content');
    modal.querySelector('.modal-body')?.classList.add('cur-modal-body');
  }

  function enhance() {
    const mainPanel = document.querySelector('#main-content .panel.panel-default');
    if (!mainPanel) return;
    mainPanel.classList.add('cur-root-panel');

    const panelBody = mainPanel.querySelector('.panel-body');
    if (!panelBody) return;

    injectPageHeader(panelBody);

    panelBody.querySelectorAll(':scope > .panel.panel-default').forEach(card => {
      card.classList.add('cur-card');
      const type = getType(card);
      card.classList.add(type === 'Elective' ? 'cur-card-elective' : 'cur-card-core');

      const heading = card.querySelector(':scope > .panel-heading');
      if (heading && !heading.querySelector('.cur-type-badge')) {
        const badge = document.createElement('span');
        badge.className = 'cur-type-badge';
        badge.textContent = type || 'Core';
        heading.appendChild(badge);
      }

      card.querySelector('.btnShowCurriculumCourses')?.classList.add('cur-show-btn');
    });

    styleModal();

    const divCourses = document.getElementById('divCurriculumCourses');
    if (divCourses) {
      const obs = new MutationObserver(() => styleModalContent(divCourses));
      obs.observe(divCourses, { childList: true });
    }
  }

  function init() {
    injectCSS();
    loadCourseCatalog().finally(() => {
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
    });
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
