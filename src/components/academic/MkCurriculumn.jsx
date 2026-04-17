import '../../content.css';

// Curriculum: enhances existing portal panels with CSS + prerequisite data.
// Uses chrome.runtime.getURL to load CSE.json for prerequisite lookup.

const NIL_TOKENS = new Set(['', 'NIL', 'NILL', 'N/A', 'NA', '-']);
let courseCatalog = [];
const courseByCode = new Map();
const courseByCodeAndName = new Map();

function norm(v) { return String(v || '').replace(/\s+/g, ' ').trim().toUpperCase(); }
function normCode(v) { return norm(v).replace(/\s+/g, ''); }

function buildCatalogIndex(items) {
  items.forEach((item) => {
    const codeKey = normCode(item.course);
    const nameKey = norm(item.course_name);
    if (!courseByCode.has(codeKey)) courseByCode.set(codeKey, []);
    courseByCode.get(codeKey).push(item);
    courseByCodeAndName.set(`${codeKey}::${nameKey}`, item);
  });
}

function loadCourseCatalog() {
  return fetch(chrome.runtime.getURL('Academic/CSE.json'))
    .then((res) => (res.ok ? res.json() : []))
    .then((items) => {
      if (!Array.isArray(items)) return;
      courseCatalog = items;
      buildCatalogIndex(items);
    })
    .catch(() => { courseCatalog = []; });
}

function findCourseMeta(code, name) {
  const codeKey = normCode(code);
  const nameKey = norm(name);
  const exact = courseByCodeAndName.get(`${codeKey}::${nameKey}`);
  if (exact) return exact;
  const byCode = courseByCode.get(codeKey) || [];
  if (byCode.length === 1) return byCode[0];
  if (byCode.length > 1) {
    const match = byCode.find((item) => {
      const n = norm(item.course_name);
      return n === nameKey || n.includes(nameKey) || nameKey.includes(n);
    });
    return match || byCode[0];
  }
  return courseCatalog.find((item) => norm(item.course_name) === nameKey) || null;
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

  const headerTexts = [...headerRow.querySelectorAll('th')].map((th) => norm(th.textContent));
  if (!headerTexts.some((t) => t.includes('CODE')) || !headerTexts.some((t) => t.includes('COURSE'))) return;

  const hasPrereq = headerTexts.some((t) => t.includes('PREREQ'));
  if (!hasPrereq) {
    const th = document.createElement('th');
    th.textContent = 'Prerequisite';
    th.style.width = '22%';
    const last = headerRow.lastElementChild;
    if (last) headerRow.insertBefore(th, last);
    else headerRow.appendChild(th);
  }

  table.querySelectorAll('tbody tr').forEach((tr) => {
    const cells = [...tr.querySelectorAll('td')];
    if (!cells.length || cells.length < 3) return;
    const rowText = norm(tr.textContent);
    if (rowText.includes('TOTAL CREDIT') || rowText.includes('GRAND TOTAL')) return;

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
  const degree = h4s[1]?.textContent.trim() || '';

  const div = document.createElement('div');
  div.style.cssText = 'margin-bottom:20px;padding:16px 20px;background:linear-gradient(135deg,#f0f9ff 0%,#faf5ff 100%);border-radius:14px;border:1.5px solid #e0e7ff';
  div.innerHTML =
    (faculty ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6366f1;margin-bottom:6px">${faculty}</div>` : '') +
    (degree ? `<div style="font-size:19px;font-weight:800;color:#111827;letter-spacing:-.4px">${degree}</div>` : '');
  panelBody.insertBefore(div, h4s[0]);
}

function styleModalContent(div) {
  if (!div.innerHTML.trim() || div.innerHTML.trim() === 'Loading...') return;
  div.querySelectorAll('table:not([data-cur-modal])').forEach((t) => {
    enhanceCurriculumTable(t);
    t.setAttribute('data-cur-modal', '1');
    t.style.cssText = 'width:100%!important;border-collapse:collapse!important;margin:0!important;font-size:13px';
    t.querySelectorAll('thead th').forEach((th) => {
      th.style.cssText = 'background:#f8fafc!important;color:#475569!important;font-size:11px!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:.5px!important;padding:9px 16px!important;border:none!important;border-bottom:2px solid #e2e8f0!important';
    });
    t.querySelectorAll('tbody td').forEach((td) => {
      td.style.cssText = 'padding:8px 16px!important;border:none!important;border-bottom:1px solid #f1f5f9!important;color:#374151!important;font-size:13px!important';
    });
  });
}

function enhance() {
  const mainPanel = document.querySelector('#main-content .panel.panel-default');
  if (!mainPanel) return;

  mainPanel.style.cssText = 'box-shadow:none!important;border:none!important;background:transparent!important';
  const heading = mainPanel.querySelector(':scope > .panel-heading');
  if (heading) heading.style.display = 'none';
  const panelBody = mainPanel.querySelector('.panel-body');
  if (!panelBody) return;
  panelBody.style.cssText = 'background:transparent!important;padding:8px 0!important';
  const innerH4 = panelBody.querySelector(':scope > h4');
  // Don't hide h4 yet — used for header extraction
  injectPageHeader(panelBody);
  if (innerH4) innerH4.style.display = 'none';

  panelBody.querySelectorAll(':scope > .panel.panel-default').forEach((card) => {
    const type = getType(card);
    const isElective = type === 'Elective';
    const bgColor = isElective ? '#faf5ff' : '#f0f9ff';
    const headGrad = isElective
      ? 'linear-gradient(135deg,#ede9fe 0%,#c4b5fd 100%)'
      : 'linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%)';
    const badgeBg = isElective ? '#7c3aed' : '#1d4ed8';

    card.style.cssText = `border:none!important;border-radius:14px!important;overflow:hidden;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,.06)!important;background:${bgColor}!important`;

    const cardHeading = card.querySelector(':scope > .panel-heading');
    if (cardHeading) {
      cardHeading.style.cssText = `padding:14px 18px!important;border-bottom:none!important;display:flex!important;align-items:center!important;gap:10px!important;background:${headGrad}!important`;
      const titleEl = cardHeading.querySelector('b');
      if (titleEl) titleEl.style.cssText = 'font-size:14px;font-weight:700;flex:1;color:' + (isElective ? '#4c1d95' : '#1e3a8a');

      if (!cardHeading.querySelector('[data-type-badge]')) {
        const badge = document.createElement('span');
        badge.setAttribute('data-type-badge', '1');
        badge.textContent = type || 'Core';
        badge.style.cssText = `display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;background:${badgeBg};color:#fff`;
        cardHeading.appendChild(badge);
      }
    }

    const showBtn = card.querySelector('.btnShowCurriculumCourses');
    if (showBtn) {
      const btnGrad = isElective
        ? 'linear-gradient(135deg,#7c3aed,#6d28d9)'
        : 'linear-gradient(135deg,#2563eb,#1d4ed8)';
      showBtn.style.cssText = `display:inline-flex!important;align-items:center!important;gap:6px!important;padding:8px 18px!important;border-radius:8px!important;font-size:13px!important;font-weight:600!important;border:none!important;cursor:pointer!important;box-shadow:0 2px 6px rgba(0,0,0,.15)!important;background:${btnGrad}!important;color:#fff!important`;
    }

    const cardBody = card.querySelector(':scope > .panel-body');
    if (cardBody) {
      cardBody.style.cssText = 'padding:0!important;background:transparent!important';
      cardBody.querySelectorAll('.curriculum-info td').forEach((td, i) => {
        td.style.cssText = 'border:none!important;border-bottom:1px solid rgba(0,0,0,.05)!important;padding:8px 18px!important;font-size:13px';
        if (i % 2 === 0) td.style.color = '#6b7280';
        else { td.style.color = '#111827'; td.style.fontWeight = '500'; }
      });
    }
  });

  // Style modal
  const modal = document.getElementById('curriculumCoursesModal');
  if (modal) {
    const dialog = modal.querySelector('.modal-dialog');
    if (dialog) dialog.style.cssText = 'max-width:820px!important;width:92vw!important;margin:30px auto!important';
    const content = modal.querySelector('.modal-content');
    if (content) content.style.cssText = 'border-radius:14px!important;border:none!important;box-shadow:0 24px 60px rgba(0,0,0,.18)!important;overflow:hidden';
    const mBody = modal.querySelector('.modal-body');
    if (mBody) mBody.style.padding = '0';
    const divCourses = document.getElementById('divCurriculumCourses');
    if (divCourses) {
      divCourses.style.cssText = 'height:auto!important;max-height:72vh;overflow-y:auto;padding:0';
      new MutationObserver(() => styleModalContent(divCourses)).observe(divCourses, { childList: true });
    }
  }
}

(function mount() {
  if (window.__aiubCurriculumMounted) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function init() {
      if (window.__aiubCurriculumMounted) return;
      window.__aiubCurriculumMounted = true;
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

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });
})();
