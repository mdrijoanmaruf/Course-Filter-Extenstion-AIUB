(function () {
  'use strict';

  if (window.__aiubFilterInjected) return;
  if (localStorage.getItem('__aiubPortalEnabled') === '0') return;
  window.__aiubFilterInjected = true;

  let allCourses = [];
  let filteredCourses = [];
  let currentPage = 1;
  let rowsPerPage = 25;
  const SEARCH_DEBOUNCE = 300;
  let searchTimeout = null;
  let originalTablePanel = null;

  let selectedSections = [];
  let clashMap = {};

  const ROUTINE_COLORS = [
    { bg: '#e3f2fd', border: '#1565c0', text: '#0d47a1' },
    { bg: '#f3e5f5', border: '#7b1fa2', text: '#4a148c' },
    { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20' },
    { bg: '#fff3e0', border: '#ef6c00', text: '#e65100' },
    { bg: '#fce4ec', border: '#c62828', text: '#b71c1c' },
    { bg: '#e0f7fa', border: '#00838f', text: '#006064' },
    { bg: '#e8eaf6', border: '#283593', text: '#1a237e' },
    { bg: '#e0f2f1', border: '#00695c', text: '#004d40' },
  ];
  const courseColorCache = {};
  let courseColorIndex = 0;

  const ALL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  function waitForTable() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 60;

      const check = () => {
        const table = document.querySelector('table.footable');
        if (table && table.querySelector('tbody tr td')) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('FooTable rows not found after 30s'));
        } else {
          attempts++;
          setTimeout(check, 500);
        }
      };
      check();
    });
  }

  function parseRowElements(rows) {
    const courses = [];
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 3) return; // need at least classId, title, status

      const classId = cells[0].textContent.trim();
      if (!classId || !/^\d+$/.test(classId)) return; // Skip non-data rows

      const fullTitle = cells.length > 1 ? cells[1].textContent.trim() : '';
      const status = cells.length > 2 ? cells[2].textContent.trim() : '';
      const capacity = cells.length > 3 ? (parseInt(cells[3].textContent.trim(), 10) || 0) : 0;
      const count = cells.length > 4 ? (parseInt(cells[4].textContent.trim(), 10) || 0) : 0;

      const timeSlots = [];
      if (cells.length > 5) {
        const nestedRows = cells[5].querySelectorAll('table tbody tr');
        nestedRows.forEach(timeRow => {
          const timeCells = timeRow.querySelectorAll('td');
          if (timeCells.length >= 5) {
            timeSlots.push({
              classType: timeCells[0].textContent.trim(),
              day: timeCells[1].textContent.trim(),
              startTime: timeCells[2].textContent.trim(),
              endTime: timeCells[3].textContent.trim(),
              room: timeCells[4].textContent.trim()
            });
          } else if (timeCells.length >= 3) {
            timeSlots.push({
              classType: timeCells[0] ? timeCells[0].textContent.trim() : '',
              day: timeCells[1] ? timeCells[1].textContent.trim() : '',
              startTime: timeCells[2] ? timeCells[2].textContent.trim() : '',
              endTime: timeCells.length > 3 ? timeCells[3].textContent.trim() : '',
              room: timeCells.length > 4 ? timeCells[4].textContent.trim() : ''
            });
          }
        });
      }

      const sectionMatch = fullTitle.match(/\[([^\]]+)\]$/);
      const section = sectionMatch ? sectionMatch[1] : '';
      const title = fullTitle.replace(/\s*\[[^\]]+\]$/, '').trim();

      courses.push({
        classId, title, section, fullTitle, status,
        capacity, count, timeSlots
      });
    });
    return courses;
  }

  function whenDrawDone(result) {
    return new Promise(function (resolve) {
      if (!result) { setTimeout(resolve, 600); return; }
      if (typeof result.then === 'function') { result.then(resolve, resolve); return; }
      if (typeof result.done === 'function') { result.done(resolve).fail(resolve); return; }
      setTimeout(resolve, 600);
    });
  }

  async function getAllCourses() {
    const table = document.querySelector('table.footable');
    let courses = [];

    if (typeof FooTable !== 'undefined' && FooTable.get) {
      try {
        const ft = FooTable.get(table);
        if (ft && ft.rows && ft.rows.all && ft.rows.all.length > 0) {
          const hidden = [];
          ft.rows.all.forEach(function (row) {
            const el = row.$el && row.$el[0];
            if (el && el.style.display === 'none') {
              hidden.push(el);
              el.style.display = '';
            }
          });
          courses = parseRowElements(table.querySelectorAll('tbody > tr'));
          hidden.forEach(function (el) { el.style.display = 'none'; });
          console.log('[AIUB Filter] rows.all: ' + courses.length + ' courses');
          if (courses.length > 10) return courses;
        }
      } catch (e) {
        console.warn('[AIUB Filter] rows.all failed:', e);
      }

      try {
        const ft = FooTable.get(table);
        const paging = ft && ft.use && ft.use(FooTable.Paging);
        if (paging && paging.size != null) {
          const origSize = paging.size;
          const origCurrent = paging.current || 1;
          paging.size = 99999;
          await whenDrawDone(ft.draw());
          courses = parseRowElements(table.querySelectorAll('tbody > tr'));
          console.log('[AIUB Filter] After expand: ' + courses.length + ' courses');
          paging.size = origSize;
          paging.current = origCurrent;
          ft.draw();
          if (courses.length > origSize) return courses;
        }
      } catch (e) {
        console.warn('[AIUB Filter] expand failed:', e);
      }
    }

    courses = parseRowElements(table.querySelectorAll('tbody > tr'));
    console.log('[AIUB Filter] DOM fallback: ' + courses.length + ' courses');
    return courses;
  }

  function getUniqueStatuses(courses) {
    return [...new Set(courses.map(c => c.status))].filter(Boolean).sort();
  }

  function buildHourOptions(placeholder) {
    let s = '<option value="">' + placeholder + '</option>';
    for (let h = 8; h <= 18; h++) {
      const label = h < 12 ? h + ' AM' : h === 12 ? '12 PM' : (h - 12) + ' PM';
      s += '<option value="' + h + '">' + label + '</option>';
    }
    return s;
  }
  function buildMinOptions() {
    let s = '<option value="0">:00</option>';
    for (let m = 10; m <= 50; m += 10) {
      s += '<option value="' + m + '">' + ':' + (m < 10 ? '0' : '') + m + '</option>';
    }
    return s;
  }

  function injectLoadingPanel() {
    if (document.getElementById('aiub-filter-panel')) return;
    const mainContent = document.getElementById('main-content') || document.body;
    const loader = document.createElement('div');
    loader.id = 'aiub-filter-panel';
    loader.style.cssText = 'border:none;border-radius:10px;margin-bottom:18px;background:#fff;overflow:hidden;box-shadow:0 2px 18px rgba(0,0,0,0.14);';
    loader.innerHTML = [
      '<div style="background:linear-gradient(120deg,#1a2744 0%,#2c3e50 100%);color:#fff;padding:12px 18px;">',
      '  <strong>&#9203;&nbsp;Loading course data&hellip;</strong>',
      '</div>',
      '<div style="padding:14px 18px;color:#7f8c8d;font-size:13px;">',
      '  Fetching all available courses. This may take a few seconds.',
      '</div>'
    ].join('');
    const ref = mainContent.querySelector('.panel') ||
                mainContent.querySelector('table') ||
                mainContent.firstChild;
    if (ref) mainContent.insertBefore(loader, ref);
    else mainContent.appendChild(loader);
  }

  function injectFilterPanel(statuses) {
    const mainContent = document.getElementById('main-content') || document.body;

    const loader = document.getElementById('aiub-filter-panel');
    if (loader) loader.remove();

    originalTablePanel =
      mainContent.querySelector('.panel.panel-default') ||
      mainContent.querySelector('.panel.panel-primary') ||
      mainContent.querySelector('.panel') ||
      mainContent.querySelector('table.footable');
    const originalPanel = originalTablePanel;

    const filterPanel = document.createElement('div');
    filterPanel.id = 'aiub-filter-panel';
    filterPanel.className = 'panel panel-primary';

    filterPanel.innerHTML = `
      <div class="panel-heading">
        <div class="aiub-header-left">
          <h5 class="panel-title">&#9889;&nbsp;Advanced Course Filter
            <span id="aiub-total-count" class="aiub-badge-total"></span>
          </h5>
        </div>
        <div class="aiub-header-actions">
          <span id="aiub-filter-count" class="aiub-badge-results" style="display:none;"></span>
          <button id="aiub-reset-btn" type="button">&#8635;&nbsp;Reset</button>
        </div>
      </div>
      <div class="panel-body">

        <div class="aiub-filter-row">
          <div class="aiub-filter-col aiub-col-search">
            <span class="aiub-label">Search Course</span>
            <input type="text" id="aiub-search" class="form-control" placeholder="Course name or Class ID&hellip;">
          </div>
          <div class="aiub-filter-col aiub-col-status-row">
            <span class="aiub-label">Status</span>
            <div class="aiub-status-wrap">
              ${statuses.map(function(s) {
                const k = s.toLowerCase();
                const c = k.indexOf('open') !== -1 ? 'aiub-sb-green'
                  : k.indexOf('fresh') !== -1 ? 'aiub-sb-blue'
                  : k.indexOf('close') !== -1 || k.indexOf('cancel') !== -1 ? 'aiub-sb-red'
                  : k.indexOf('reserv') !== -1 ? 'aiub-sb-purple'
                  : 'aiub-sb-grey';
                const isOpen = k.indexOf('open') !== -1;
                const activeClass = isOpen ? ' active' : '';
                return '<button type="button" class="aiub-status-btn ' + c + activeClass + '" data-status="' + s + '">' + s + '</button>';
              }).join('')}
            </div>
          </div>
        </div>

        <hr class="aiub-filter-divider">

        <div class="aiub-filter-row">
          <div class="aiub-filter-col aiub-col-days">
            <span class="aiub-label">Day of Week</span>
            <div class="aiub-days-wrap">
              ${ALL_DAYS.map(d => `<button type="button" class="aiub-day-btn" data-day="${d}">${d}</button>`).join('')}
            </div>
          </div>
          <div class="aiub-filter-col aiub-col-time">
            <span class="aiub-label">Class Start Time</span>
            <div class="aiub-time-box">
              <div class="aiub-time-block">
                <span class="aiub-time-lbl">From</span>
                <div class="aiub-time-pair">
                  <select id="aiub-from-h" class="form-control"><option value="">Hr</option><option value="8" selected>8 AM</option><option value="9">9 AM</option><option value="10">10 AM</option><option value="11">11 AM</option><option value="12">12 PM</option><option value="13">1 PM</option><option value="14">2 PM</option><option value="15">3 PM</option><option value="16">4 PM</option><option value="17">5 PM</option><option value="18">6 PM</option></select>
                  <select id="aiub-from-m" class="form-control"><option value="0" selected>:00</option><option value="10">:10</option><option value="20">:20</option><option value="30">:30</option><option value="40">:40</option><option value="50">:50</option></select>
                </div>
              </div>
              <div class="aiub-time-arr">&rarr;</div>
              <div class="aiub-time-block">
                <span class="aiub-time-lbl">To</span>
                <div class="aiub-time-pair">
                  <select id="aiub-to-h" class="form-control"><option value="">Hr</option><option value="8">8 AM</option><option value="9">9 AM</option><option value="10">10 AM</option><option value="11">11 AM</option><option value="12">12 PM</option><option value="13">1 PM</option><option value="14">2 PM</option><option value="15">3 PM</option><option value="16">4 PM</option><option value="17">5 PM</option><option value="18" selected>6 PM</option></select>
                  <select id="aiub-to-m" class="form-control"><option value="0" selected>:00</option><option value="10">:10</option><option value="20">:20</option><option value="30">:30</option><option value="40">:40</option><option value="50">:50</option></select>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    if (originalPanel && originalPanel.parentNode === mainContent) {
      mainContent.insertBefore(filterPanel, originalPanel);
    } else {
      mainContent.insertBefore(filterPanel, mainContent.firstChild);
    }

    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'aiub-results-container';
    resultsContainer.style.display = 'none';
    if (originalPanel && originalPanel.parentNode === mainContent) {
      mainContent.insertBefore(resultsContainer, originalPanel);
    } else {
      filterPanel.insertAdjacentElement('afterend', resultsContainer);
    }

    const totalBadge = document.getElementById('aiub-total-count');
    totalBadge.textContent = allCourses.length + ' total courses loaded';

    attachFilterListeners();
  }

  function attachFilterListeners() {
    document.getElementById('aiub-search').addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyFilters, SEARCH_DEBOUNCE);
    });

    document.querySelectorAll('.aiub-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        applyFilters();
      });
    });
    ['aiub-from-h', 'aiub-from-m', 'aiub-to-h', 'aiub-to-m'].forEach(id => {
      document.getElementById(id).addEventListener('change', applyFilters);
    });

    document.querySelectorAll('.aiub-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        applyFilters();
      });
    });

    document.getElementById('aiub-reset-btn').addEventListener('click', resetFilters);
  }

  function applyFilters() {
    const searchVal = document.getElementById('aiub-search').value.trim().toLowerCase();
    const selectedStatuses = [...document.querySelectorAll('.aiub-status-btn.active')].map(b => b.dataset.status);
    const fromH = parseInt(document.getElementById('aiub-from-h').value, 10);
    const fromM = parseInt(document.getElementById('aiub-from-m').value, 10);
    const toH   = parseInt(document.getElementById('aiub-to-h').value, 10);
    const toM   = parseInt(document.getElementById('aiub-to-m').value, 10);
    const timeFrom = isNaN(fromH) ? NaN : fromH + (isNaN(fromM) ? 0 : fromM) / 60;
    const timeTo   = isNaN(toH)   ? NaN : toH   + (isNaN(toM)   ? 0 : toM)   / 60;

    const selectedDays = [];
    document.querySelectorAll('.aiub-day-btn.active').forEach(btn => {
      selectedDays.push(btn.dataset.day);
    });

    const hasFilters = searchVal || selectedStatuses.length > 0 ||
      !isNaN(timeFrom) || !isNaN(timeTo) || selectedDays.length > 0;

    if (!hasFilters) {
      resetFilters();
      return;
    }

    filteredCourses = allCourses.filter(course => {
      if (searchVal) {
        const matchesTitle = course.title.toLowerCase().includes(searchVal);
        const matchesFullTitle = course.fullTitle.toLowerCase().includes(searchVal);
        const matchesId = course.classId.includes(searchVal);
        if (!matchesTitle && !matchesFullTitle && !matchesId) return false;
      }

      if (selectedStatuses.length > 0 && !selectedStatuses.includes(course.status)) return false;

      if (selectedDays.length > 0 && course.timeSlots.length > 0) {
        const courseDays = course.timeSlots.map(ts => ts.day);
        const hasMatchingDay = selectedDays.some(d => courseDays.includes(d));
        if (!hasMatchingDay) return false;
      }

      if ((!isNaN(timeFrom) || !isNaN(timeTo)) && course.timeSlots.length > 0) {
        const hasMatchingTime = course.timeSlots.some(ts => {
          const startHour = parseTimeToHours(ts.startTime);
          if (startHour === null) return true; // can't parse → don't exclude
          if (!isNaN(timeFrom) && startHour < timeFrom) return false;
          if (!isNaN(timeTo) && startHour > timeTo) return false;
          return true;
        });
        if (!hasMatchingTime) return false;
      }

      return true;
    });

    currentPage = 1;
    renderFilteredResults();
  }

  function parseTimeToHours(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours + minutes / 60;
  }

  function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  function timeSlotsOverlap(slot1, slot2) {
    if (slot1.day !== slot2.day) return false;
    const start1 = timeToMinutes(slot1.startTime);
    const end1   = timeToMinutes(slot1.endTime);
    const start2 = timeToMinutes(slot2.startTime);
    const end2   = timeToMinutes(slot2.endTime);
    if (start1 === null || end1 === null || start2 === null || end2 === null) return false;
    return (start1 < end2 && start2 < end1);
  }

  function checkTimeClash(newCourse) {
    for (const selected of selectedSections) {
      for (const newSlot of newCourse.timeSlots) {
        for (const selSlot of selected.timeSlots) {
          if (timeSlotsOverlap(newSlot, selSlot)) {
            return {
              hasClash: true,
              clashWith: selected.fullTitle,
              details: newSlot.day + ' ' + newSlot.startTime + ' \u2013 ' + newSlot.endTime
                     + ' overlaps with '
                     + selSlot.day + ' ' + selSlot.startTime + ' \u2013 ' + selSlot.endTime
            };
          }
        }
      }
    }
    return { hasClash: false };
  }

  function recomputeClashMap() {
    clashMap = {};
    allCourses.forEach(function (course) {
      if (selectedSections.some(function (s) { return s.classId === course.classId; })) return;
      const clash = checkTimeClash(course);
      if (clash.hasClash) {
        clashMap[course.classId] = clash;
      }
    });
  }

  function getTimeSignature(course) {
    if (!course.timeSlots || course.timeSlots.length === 0) return '';
    return course.timeSlots
      .map(function (ts) { return ts.day + '|' + ts.startTime + '|' + ts.endTime + '|' + ts.classType; })
      .sort()
      .join(';;');
  }

  function autoSelectLinkedSections(course) {
    const timeSignature = getTimeSignature(course);
    const linkedSections = allCourses.filter(function (c) {
      return c.title === course.title &&
             c.classId !== course.classId &&
             getTimeSignature(c) === timeSignature;
    });
    course._linkedSections = linkedSections.map(function (s) {
      return {
        section: s.section, classId: s.classId, fullTitle: s.fullTitle,
        capacity: s.capacity, count: s.count, status: s.status, timeSlots: s.timeSlots
      };
    });
  }

  function getCourseColor(courseTitle) {
    if (!courseColorCache[courseTitle]) {
      courseColorCache[courseTitle] = ROUTINE_COLORS[courseColorIndex % ROUTINE_COLORS.length];
      courseColorIndex++;
    }
    return courseColorCache[courseTitle];
  }

  function handleSelectSection(classId) {
    const course = allCourses.find(function (c) { return c.classId === classId; });
    if (!course) return;
    if (selectedSections.some(function (s) { return s.classId === classId; })) return;
    if (selectedSections.some(function (s) { return s.title === course.title; })) return;
    const clash = checkTimeClash(course);
    if (clash.hasClash) return;

    selectedSections.push(course);
    autoSelectLinkedSections(course);
    recomputeClashMap();
    saveSelectedSections();
    renderFilteredResults();
    renderSelectedCoursesPanel();
  }

  function handleRemoveSection(classId) {
    const course = selectedSections.find(function (s) { return s.classId === classId; });
    if (!course) return;
    const courseTitle = course.title;
    selectedSections = selectedSections.filter(function (s) { return s.title !== courseTitle; });
    recomputeClashMap();
    saveSelectedSections();
    renderFilteredResults();
    renderSelectedCoursesPanel();
  }

  function clearAllSelections() {
    selectedSections = [];
    clashMap = {};
    localStorage.removeItem('aiub_selectedSections');
    localStorage.removeItem('aiub_selectedTimestamp');
    resetFilters();
    renderSelectedCoursesPanel();
  }

  function saveSelectedSections() {
    try {
      localStorage.setItem('aiub_selectedSections', JSON.stringify(selectedSections));
      localStorage.setItem('aiub_selectedTimestamp', new Date().toISOString());
    } catch (e) {
      console.warn('[AIUB Routine] Failed to save:', e);
    }
  }

  function loadSelectedSections() {
    try {
      const saved = localStorage.getItem('aiub_selectedSections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          selectedSections = parsed.filter(function (sec) {
            return allCourses.some(function (c) { return c.classId === sec.classId; });
          });
          if (selectedSections.length > 0) {
            selectedSections.forEach(function (sec) { autoSelectLinkedSections(sec); });
            recomputeClashMap();
            renderSelectedCoursesPanel();
          }
        }
      }
    } catch (e) {
      console.warn('[AIUB Routine] Failed to load:', e);
    }
  }

  function renderFilteredResults() {
    const container = document.getElementById('aiub-results-container');
    const originalPanel = originalTablePanel;

    if (originalPanel) originalPanel.style.display = 'none';
    container.style.display = 'block';

    const badge = document.getElementById('aiub-filter-count');
    badge.textContent = filteredCourses.length + ' results';
    badge.style.display = '';

    const totalPages = Math.ceil(filteredCourses.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredCourses.slice(start, end);

    container.innerHTML = `
      <div class="panel panel-default">
        <div class="panel-heading">
          <h5 class="panel-title">${filteredCourses.length} course(s) found</h5>
          <div class="aiub-rpp-wrap">
            Show
            <select id="aiub-rows-per-page">
              <option value="10" ${rowsPerPage===10?'selected':''}>10</option>
              <option value="25" ${rowsPerPage===25?'selected':''}>25</option>
              <option value="50" ${rowsPerPage===50?'selected':''}>50</option>
              <option value="100" ${rowsPerPage===100?'selected':''}>100</option>
            </select>
            per page
          </div>
        </div>
        <div class="panel-body" style="padding:0;">
          <table class="table table-bordered table-condensed table-striped"
                 style="margin-bottom:0;">
            <thead>
              <tr>
                <th style="width:70px;">Class ID</th>
                <th>Title</th>
                <th style="width:90px;">Status</th>
                <th style="width:70px;">Capacity</th>
                <th style="width:60px;">Count</th>
                <th style="width:80px;">Available</th>
                <th>Schedule</th>
                <th style="width:90px;text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${pageData.length === 0
                ? '<tr><td colspan="8" class="text-center text-muted" style="padding:20px;">No courses match your filters.</td></tr>'
                : pageData.map(c => renderCourseRow(c)).join('')}
            </tbody>
          </table>
        </div>
        ${totalPages > 1 ? renderPagination(totalPages) : ''}
      </div>
    `;

    attachResultListeners(totalPages);
  }

  function renderCourseRow(course) {
    const available = course.capacity - course.count;
    const isFull = available <= 0;
    const seatsHtml = isFull
      ? '<span class="aiub-seats-full">FULL</span>'
      : '<span class="aiub-seats-ok">' + available + ' seats</span>';

    const s = (course.status || '').toLowerCase();
    const statusClass = s.includes('freshman')  ? 'aiub-status aiub-status-freshman'
      : s.includes('sophomore') ? 'aiub-status aiub-status-sophomore'
      : s.includes('junior')    ? 'aiub-status aiub-status-junior'
      : s.includes('senior')    ? 'aiub-status aiub-status-senior'
      : 'aiub-status aiub-status-default';

    const scheduleHtml = course.timeSlots.map(ts =>
      '<span class="aiub-slot">' +
      '<span class="aiub-slot-day">' + ts.day + '</span> ' +
      ts.startTime + '&ndash;' + ts.endTime +
      ' <span class="aiub-slot-room">' + ts.room + '</span>' +
      '</span>'
    ).join('');

    let actionHtml = '';
    const isSelected = selectedSections.some(function (sel) { return sel.classId === course.classId; });
    const sameCoursePicked = selectedSections.some(function (sel) {
      return sel.title === course.title && sel.classId !== course.classId;
    });
    const clashInfo = clashMap[course.classId];

    if (isSelected) {
      actionHtml = '<button class="aiub-select-btn aiub-sel-done" disabled>&#10003; Selected</button>';
    } else if (clashInfo && clashInfo.hasClash) {
      actionHtml = '<button class="aiub-select-btn aiub-sel-clash" disabled title="Clashes with '
                 + clashInfo.clashWith + ' \u2014 ' + clashInfo.details
                 + '">&#10007; Clash</button>';
    } else if (sameCoursePicked) {
      actionHtml = '<button class="aiub-select-btn aiub-sel-added" disabled>Course Added</button>';
    } else {
      var selClass = course.count >= 35 ? 'aiub-sel-high' : 'aiub-sel-pick';
      actionHtml = '<button class="aiub-select-btn ' + selClass + '" data-classid="'
                 + course.classId + '">&#43; Select</button>';
    }

    const countClass = course.count >= 35 ? ' aiub-count-high' : '';

    return `
      <tr>
        <td style="font-weight:600;color:#2c3e50;">${course.classId}</td>
        <td>${course.fullTitle}</td>
        <td><span class="${statusClass}">${course.status}</span></td>
        <td class="text-center">${course.capacity}</td>
        <td class="text-center${countClass}">${course.count}</td>
        <td class="text-center">${seatsHtml}</td>
        <td>${scheduleHtml}</td>
        <td class="text-center">${actionHtml}</td>
      </tr>
    `;
  }

  function renderPagination(totalPages) {
    let pages = '';
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    pages += '<li class="' + (currentPage === 1 ? 'disabled' : '') + '">' +
      '<a href="#" data-page="1">\u00AB</a></li>';
    pages += '<li class="' + (currentPage === 1 ? 'disabled' : '') + '">' +
      '<a href="#" data-page="' + (currentPage - 1) + '">\u2039</a></li>';

    for (let i = startPage; i <= endPage; i++) {
      pages += '<li class="' + (i === currentPage ? 'active' : '') + '">' +
        '<a href="#" data-page="' + i + '">' + i + '</a></li>';
    }

    pages += '<li class="' + (currentPage === totalPages ? 'disabled' : '') + '">' +
      '<a href="#" data-page="' + (currentPage + 1) + '">\u203A</a></li>';
    pages += '<li class="' + (currentPage === totalPages ? 'disabled' : '') + '">' +
      '<a href="#" data-page="' + totalPages + '">\u00BB</a></li>';

    return `
      <div class="panel-footer">
        <ul class="pagination">${pages}</ul>
        <span class="aiub-page-label">Page ${currentPage} of ${totalPages}</span>
      </div>
    `;
  }

  function attachResultListeners(totalPages) {
    document.querySelectorAll('#aiub-results-container .pagination a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(link.dataset.page, 10);
        if (page >= 1 && page <= totalPages && page !== currentPage) {
          currentPage = page;
          renderFilteredResults();
        }
      });
    });

    const rppSelect = document.getElementById('aiub-rows-per-page');
    if (rppSelect) {
      rppSelect.addEventListener('change', () => {
        rowsPerPage = parseInt(rppSelect.value, 10);
        currentPage = 1;
        renderFilteredResults();
      });
    }

    document.querySelectorAll('.aiub-sel-pick, .aiub-sel-high').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleSelectSection(btn.dataset.classid);
      });
    });
  }

  function renderSelectedCoursesPanel() {
    let panel = document.getElementById('aiub-selected-panel');

    if (selectedSections.length === 0) {
      if (panel) panel.remove();
      const routineOverlay = document.getElementById('aiub-routine-overlay');
      if (routineOverlay) routineOverlay.remove();
      return;
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'aiub-selected-panel';
      panel.className = 'panel panel-primary';
      const filterPanel = document.getElementById('aiub-filter-panel');
      if (filterPanel) {
        filterPanel.insertAdjacentElement('afterend', panel);
      } else {
        const mainContent = document.getElementById('main-content') || document.body;
        mainContent.appendChild(panel);
      }
    }

    const cards = selectedSections.map(function (sec) {
      const color = getCourseColor(sec.title);
      const available = sec.capacity - sec.count;
      const scheduleLines = sec.timeSlots.map(function (ts) {
        return ts.classType + ': ' + ts.day + ' ' + ts.startTime + '\u2013' + ts.endTime;
      });

      let altHtml = '';
      if (sec._linkedSections && sec._linkedSections.length > 0) {
        const altRows = sec._linkedSections.map(function (ls) {
          const altAvail = ls.capacity - ls.count;
          const isFull = altAvail <= 0;
          const schedText = ls.timeSlots.length
            ? ls.timeSlots.map(function (ts) { return ts.day + ' ' + ts.startTime + '\u2013' + ts.endTime; }).join(' &bull; ')
            : 'No schedule';
          return '<div class="aiub-sc-alt-row">'
            + '<span class="aiub-sc-alt-sec">' + (ls.section || ls.classId) + '</span>'
            + '<span class="aiub-sc-alt-sched">' + schedText + '</span>'
            + '<span class="aiub-sc-alt-seats' + (isFull ? ' aiub-sc-alt-full' : '') + '">'
            + (isFull ? 'Full' : altAvail + ' seats') + '</span>'
            + '</div>';
        }).join('');
        altHtml = '<div class="aiub-sc-alt-box">'
          + '<div class="aiub-sc-alt-header">All sections &mdash; ' + (sec._linkedSections.length + 1) + ' total</div>'
          + '<div class="aiub-sc-alt-selected-row">'
          + '<span class="aiub-sc-alt-sec aiub-sc-alt-current">' + (sec.section || sec.classId) + ' &#10003;</span>'
          + '<span class="aiub-sc-alt-sched">'
          + (sec.timeSlots.length ? sec.timeSlots.map(function (ts) { return ts.day + ' ' + ts.startTime + '\u2013' + ts.endTime; }).join(' &bull; ') : 'No schedule')
          + '</span>'
          + '<span class="aiub-sc-alt-seats">' + available + ' seats</span>'
          + '</div>'
          + altRows
          + '</div>';
      }

      return '<div class="aiub-selected-card" style="border-left:4px solid ' + color.border + ';">'
        + '<div class="aiub-sc-title">' + sec.fullTitle + '</div>'
        + '<div class="aiub-sc-schedule">'
        + scheduleLines.map(function (l) { return '<span>' + l + '</span>'; }).join('')
        + '</div>'
        + '<div class="aiub-sc-info">'
        + '<span class="aiub-sc-status">' + sec.status + '</span>'
        + '<span class="aiub-sc-seats">' + available + ' seats</span>'
        + '</div>'
        + altHtml
        + '<button class="aiub-sc-remove" data-classid="' + sec.classId + '" title="Remove ' + sec.fullTitle + '">&#10005;</button>'
        + '</div>';
    }).join('');

    panel.innerHTML = '<div class="panel-heading">'
      + '<h5 class="panel-title">&#128203;&nbsp;Selected Courses '
      + '<span class="aiub-badge-total">' + selectedSections.length + ' course(s)</span>'
      + '</h5>'
      + '<div class="aiub-header-actions">'
      + '<button id="aiub-clear-all-btn" type="button">&#10005; Clear All</button>'
      + '</div>'
      + '</div>'
      + '<div class="panel-body">'
      + '<div class="aiub-selected-cards">' + cards + '</div>'
      + '</div>';

    attachSelectedPanelListeners();
  }

  function attachSelectedPanelListeners() {
    document.querySelectorAll('.aiub-sc-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        handleRemoveSection(btn.dataset.classid);
      });
    });

    var clearBtn = document.getElementById('aiub-clear-all-btn');
    if (clearBtn) clearBtn.addEventListener('click', clearAllSelections);
  }

  function resetFilters() {
    document.getElementById('aiub-search').value = '';
    document.querySelectorAll('.aiub-status-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.aiub-status-btn').forEach(btn => {
      if (btn.dataset.status.toLowerCase().indexOf('open') !== -1) {
        btn.classList.add('active');
      }
    });
    document.getElementById('aiub-from-h').value = '8';
    document.getElementById('aiub-from-m').value = '0';
    document.getElementById('aiub-to-h').value = '18';
    document.getElementById('aiub-to-m').value = '0';
    document.querySelectorAll('.aiub-day-btn.active').forEach(btn => btn.classList.remove('active'));

    const container = document.getElementById('aiub-results-container');
    container.style.display = 'none';
    container.innerHTML = '';
    if (originalTablePanel) originalTablePanel.style.display = '';

    const badge = document.getElementById('aiub-filter-count');
    badge.textContent = '';
    badge.style.display = 'none';

    filteredCourses = [];
    currentPage = 1;
  }

  async function init() {
    try {
      await waitForTable();
      injectLoadingPanel();
      allCourses = await getAllCourses();
      console.log('[AIUB Filter] Parsed ' + allCourses.length + ' courses');

      if (allCourses.length === 0) {
        console.error('[AIUB Filter] No courses found!');
        return;
      }

      const statuses = getUniqueStatuses(allCourses);
      injectFilterPanel(statuses);

      loadSelectedSections();

      console.log('[AIUB Filter] Filter panel injected');
    } catch (err) {
      console.error('[AIUB Filter] Init failed:', err);
    }
  }

  init();
})();
