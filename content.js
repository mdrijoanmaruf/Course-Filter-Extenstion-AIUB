(function () {
  'use strict';

  // Prevent double-injection if the script runs twice
  if (window.__aiubFilterInjected) return;
  window.__aiubFilterInjected = true;

  let allCourses = [];
  let filteredCourses = [];
  let currentPage = 1;
  let rowsPerPage = 10;
  const SEARCH_DEBOUNCE = 300;
  let searchTimeout = null;

  // ── Wait for FooTable to render ──────────────────────────────
  function waitForTable() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 60; // 30 seconds max (500ms interval)

      const check = () => {
        const rows = document.querySelectorAll('table.footable tbody tr');
        if (rows.length > 0) {
          resolve(rows);
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

  // ── Parse all course rows from the DOM ───────────────────────
  function parseAllCourses() {
    const rows = document.querySelectorAll('table.footable tbody tr');
    const courses = [];

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 6) return;

      const classId = cells[0].textContent.trim();
      const fullTitle = cells[1].textContent.trim();
      const status = cells[2].textContent.trim();
      const capacity = parseInt(cells[3].textContent.trim(), 10) || 0;
      const count = parseInt(cells[4].textContent.trim(), 10) || 0;

      // Parse time slots from nested table in cell 5
      const timeSlots = [];
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
        }
      });

      // Extract section from title like "COURSE NAME [A1]"
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

  // ── Extract unique values for dropdown options ───────────────
  function getUniqueStatuses(courses) {
    return [...new Set(courses.map(c => c.status))].filter(Boolean).sort();
  }

  function getUniqueDays(courses) {
    const days = new Set();
    courses.forEach(c => {
      c.timeSlots.forEach(ts => {
        if (ts.day) days.add(ts.day);
      });
    });
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayOrder.filter(d => days.has(d));
  }

  // ── Build & inject the filter panel HTML ─────────────────────
  function injectFilterPanel(statuses, days) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const originalPanel = mainContent.querySelector('.panel.panel-default');
    if (!originalPanel) return;

    const filterPanel = document.createElement('div');
    filterPanel.id = 'aiub-filter-panel';
    filterPanel.className = 'panel panel-primary';

    filterPanel.innerHTML = `
      <div class="panel-heading">
        <h5 class="panel-title">
          <i class="glyphicon glyphicon-filter"></i>&nbsp;
          Advanced Course Filter
          <span id="aiub-filter-count" class="badge" style="margin-left:10px;"></span>
        </h5>
      </div>
      <div class="panel-body">
        <!-- Row 1: Search + Status + Seats + Time -->
        <div class="row" style="margin-bottom:10px;">
          <div class="col-md-4">
            <label>Search (Name / Class ID)</label>
            <input type="text" id="aiub-search" class="form-control"
                   placeholder="e.g. Data Structure or 00123">
          </div>
          <div class="col-md-3">
            <label>Status</label>
            <select id="aiub-status" class="form-control">
              <option value="">All Statuses</option>
              ${statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-3">
            <label>Seat Availability</label>
            <select id="aiub-seats" class="form-control">
              <option value="">All</option>
              <option value="available">Available (has seats)</option>
              <option value="full">Full (no seats)</option>
            </select>
          </div>
          <div class="col-md-2">
            <label>Time Slot</label>
            <select id="aiub-timeslot" class="form-control">
              <option value="">All Times</option>
              <option value="morning">Morning (8AM–12PM)</option>
              <option value="afternoon">Afternoon (12PM–4PM)</option>
              <option value="evening">Evening (4PM–9PM)</option>
            </select>
          </div>
        </div>
        <!-- Row 2: Day checkboxes + Reset -->
        <div class="row">
          <div class="col-md-10">
            <label>Days:</label>&nbsp;
            ${days.map(d => `
              <label class="checkbox-inline">
                <input type="checkbox" class="aiub-day-checkbox" value="${d}"> ${d}
              </label>
            `).join('')}
          </div>
          <div class="col-md-2">
            <button id="aiub-reset-btn" class="btn btn-warning btn-sm btn-block"
                    style="margin-top:2px;">
              <i class="glyphicon glyphicon-refresh"></i> Reset All
            </button>
          </div>
        </div>
      </div>
    `;

    // Insert before the original table panel
    mainContent.insertBefore(filterPanel, originalPanel);

    // Create results container (hidden initially)
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'aiub-results-container';
    resultsContainer.style.display = 'none';
    mainContent.insertBefore(resultsContainer, originalPanel);

    // Attach event listeners
    attachFilterListeners();
  }

  // ── Event listeners ──────────────────────────────────────────
  function attachFilterListeners() {
    document.getElementById('aiub-search').addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyFilters, SEARCH_DEBOUNCE);
    });

    document.getElementById('aiub-status').addEventListener('change', applyFilters);
    document.getElementById('aiub-seats').addEventListener('change', applyFilters);
    document.getElementById('aiub-timeslot').addEventListener('change', applyFilters);

    document.querySelectorAll('.aiub-day-checkbox').forEach(cb => {
      cb.addEventListener('change', applyFilters);
    });

    document.getElementById('aiub-reset-btn').addEventListener('click', resetFilters);
  }

  // ── Core filter logic ────────────────────────────────────────
  function applyFilters() {
    const searchVal = document.getElementById('aiub-search').value.trim().toLowerCase();
    const statusVal = document.getElementById('aiub-status').value;
    const seatsVal = document.getElementById('aiub-seats').value;
    const timeslotVal = document.getElementById('aiub-timeslot').value;

    const selectedDays = [];
    document.querySelectorAll('.aiub-day-checkbox:checked').forEach(cb => {
      selectedDays.push(cb.value);
    });

    const hasFilters = searchVal || statusVal || seatsVal || timeslotVal || selectedDays.length > 0;

    if (!hasFilters) {
      resetFilters();
      return;
    }

    filteredCourses = allCourses.filter(course => {
      // 1. Search filter (title or classId)
      if (searchVal) {
        const matchesTitle = course.title.toLowerCase().includes(searchVal);
        const matchesFullTitle = course.fullTitle.toLowerCase().includes(searchVal);
        const matchesId = course.classId.includes(searchVal);
        if (!matchesTitle && !matchesFullTitle && !matchesId) return false;
      }

      // 2. Status filter
      if (statusVal && course.status !== statusVal) return false;

      // 3. Seat availability filter
      if (seatsVal === 'available' && course.count >= course.capacity) return false;
      if (seatsVal === 'full' && course.count < course.capacity) return false;

      // 4. Day filter
      if (selectedDays.length > 0) {
        const courseDays = course.timeSlots.map(ts => ts.day);
        const hasMatchingDay = selectedDays.some(d => courseDays.includes(d));
        if (!hasMatchingDay) return false;
      }

      // 5. Time slot filter
      if (timeslotVal) {
        const hasMatchingTime = course.timeSlots.some(ts => {
          const startHour = parseTimeToHours(ts.startTime);
          if (startHour === null) return false;
          switch (timeslotVal) {
            case 'morning':   return startHour >= 8 && startHour < 12;
            case 'afternoon': return startHour >= 12 && startHour < 16;
            case 'evening':   return startHour >= 16 && startHour < 21;
            default: return true;
          }
        });
        if (!hasMatchingTime) return false;
      }

      return true;
    });

    currentPage = 1;
    renderFilteredResults();
  }

  // ── Time parsing helper ──────────────────────────────────────
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

  // ── Render filtered results table ────────────────────────────
  function renderFilteredResults() {
    const container = document.getElementById('aiub-results-container');
    const originalPanel = document.querySelector('#main-content > .panel.panel-default');

    if (originalPanel) originalPanel.style.display = 'none';
    container.style.display = 'block';

    const badge = document.getElementById('aiub-filter-count');
    badge.textContent = filteredCourses.length + ' results';

    const totalPages = Math.ceil(filteredCourses.length / rowsPerPage);
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredCourses.slice(start, end);

    container.innerHTML = `
      <div class="panel panel-default">
        <div class="panel-heading">
          <div class="row">
            <div class="col-md-6">
              <h5 class="panel-title">
                Filtered Results — ${filteredCourses.length} course(s) found
              </h5>
            </div>
            <div class="col-md-6 text-right">
              <label style="font-weight:normal;margin-bottom:0;">
                Show
                <select id="aiub-rows-per-page" class="form-control input-sm"
                        style="display:inline-block;width:auto;margin:0 5px;">
                  <option value="10" ${rowsPerPage===10?'selected':''}>10</option>
                  <option value="25" ${rowsPerPage===25?'selected':''}>25</option>
                  <option value="50" ${rowsPerPage===50?'selected':''}>50</option>
                  <option value="100" ${rowsPerPage===100?'selected':''}>100</option>
                </select>
                per page
              </label>
            </div>
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
              </tr>
            </thead>
            <tbody>
              ${pageData.length === 0
                ? '<tr><td colspan="7" class="text-center text-muted" style="padding:20px;">No courses match your filters.</td></tr>'
                : pageData.map(c => renderCourseRow(c)).join('')}
            </tbody>
          </table>
        </div>
        ${totalPages > 1 ? renderPagination(totalPages) : ''}
      </div>
    `;

    attachResultListeners(totalPages);
  }

  // ── Render a single course row ───────────────────────────────
  function renderCourseRow(course) {
    const available = course.capacity - course.count;
    const isFull = available <= 0;
    const availableClass = isFull ? 'text-danger' : 'text-success';
    const availableText = isFull ? 'FULL' : available + ' seats';

    const scheduleHtml = course.timeSlots.map(ts =>
      '<div><small><strong>' + ts.classType + '</strong> ' +
      ts.day + ' ' + ts.startTime + '\u2013' + ts.endTime +
      ' (' + ts.room + ')</small></div>'
    ).join('');

    return `
      <tr>
        <td>${course.classId}</td>
        <td>${course.fullTitle}</td>
        <td><span class="label label-info">${course.status}</span></td>
        <td class="text-center">${course.capacity}</td>
        <td class="text-center">${course.count}</td>
        <td class="text-center ${availableClass}"><strong>${availableText}</strong></td>
        <td>${scheduleHtml}</td>
      </tr>
    `;
  }

  // ── Pagination component ─────────────────────────────────────
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
      <div class="panel-footer text-center">
        <ul class="pagination" style="margin:5px 0;">${pages}</ul>
        <span class="label label-default">${currentPage} of ${totalPages}</span>
      </div>
    `;
  }

  // ── Result listeners (pagination + rows per page) ────────────
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
  }

  // ── Reset filters ────────────────────────────────────────────
  function resetFilters() {
    document.getElementById('aiub-search').value = '';
    document.getElementById('aiub-status').value = '';
    document.getElementById('aiub-seats').value = '';
    document.getElementById('aiub-timeslot').value = '';
    document.querySelectorAll('.aiub-day-checkbox').forEach(cb => cb.checked = false);

    const container = document.getElementById('aiub-results-container');
    const originalPanel = document.querySelector('#main-content > .panel.panel-default');
    container.style.display = 'none';
    if (originalPanel) originalPanel.style.display = '';

    const badge = document.getElementById('aiub-filter-count');
    badge.textContent = '';

    filteredCourses = [];
    currentPage = 1;
  }

  // ── Main initialization ──────────────────────────────────────
  async function init() {
    try {
      await waitForTable();
      allCourses = parseAllCourses();
      console.log('[AIUB Filter] Parsed ' + allCourses.length + ' courses');

      const statuses = getUniqueStatuses(allCourses);
      const days = getUniqueDays(allCourses);

      injectFilterPanel(statuses, days);
      console.log('[AIUB Filter] Filter panel injected');
    } catch (err) {
      console.error('[AIUB Filter] Init failed:', err);
    }
  }

  init();
})();
