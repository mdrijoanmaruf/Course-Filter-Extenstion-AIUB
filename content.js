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
  let originalTablePanel = null;

  // Static day list — always show these regardless of data
  const ALL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

  // ── Wait for FooTable to render ──────────────────────────────
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

  // ── Parse row elements into course objects ───────────────────
  function parseRowElements(rows) {
    const courses = [];
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 6) return;

      const classId = cells[0].textContent.trim();
      if (!classId || !/^\d+$/.test(classId)) return; // Skip non-data rows

      const fullTitle = cells[1].textContent.trim();
      const status = cells[2].textContent.trim();
      const capacity = parseInt(cells[3].textContent.trim(), 10) || 0;
      const count = parseInt(cells[4].textContent.trim(), 10) || 0;

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

  // ── Resolve FooTable draw() which may return jQuery or native Promise ──
  function whenDrawDone(result) {
    return new Promise(function (resolve) {
      if (!result) { setTimeout(resolve, 600); return; }
      if (typeof result.then === 'function') { result.then(resolve, resolve); return; }
      if (typeof result.done === 'function') { result.done(resolve).fail(resolve); return; }
      setTimeout(resolve, 600);
    });
  }

  // ── Extract all courses using FooTable API (world:MAIN gives direct access) ──
  async function getAllCourses() {
    const table = document.querySelector('table.footable');
    let courses = [];

    if (typeof FooTable !== 'undefined' && FooTable.get) {
      // ── Method 1: ft.rows.all holds every row in memory regardless of page ──
      try {
        const ft = FooTable.get(table);
        if (ft && ft.rows && ft.rows.all && ft.rows.all.length > 0) {
          const hidden = [];
          // Temporarily make hidden rows accessible for DOM parsing
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

      // ── Method 2: expand FooTable pagination to render all rows in DOM ──
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
          // Restore original pagination
          paging.size = origSize;
          paging.current = origCurrent;
          ft.draw();
          if (courses.length > origSize) return courses;
        }
      } catch (e) {
        console.warn('[AIUB Filter] expand failed:', e);
      }
    }

    // ── Fallback: parse whatever rows are currently in the DOM ──
    courses = parseRowElements(table.querySelectorAll('tbody > tr'));
    console.log('[AIUB Filter] DOM fallback: ' + courses.length + ' courses');
    return courses;
  }

  // ── Get unique statuses from data ────────────────────────────
  function getUniqueStatuses(courses) {
    return [...new Set(courses.map(c => c.status))].filter(Boolean).sort();
  }

  // ── Show loading indicator while data is being fetched ────────
  function injectLoadingPanel() {
    if (document.getElementById('aiub-filter-panel')) return;
    const mainContent = document.getElementById('main-content') || document.body;
    const loader = document.createElement('div');
    loader.id = 'aiub-filter-panel';
    loader.style.cssText = 'border:2px solid #2c3e50;border-radius:4px;margin-bottom:15px;background:#fff;';
    loader.innerHTML = [
      '<div style="background:#2c3e50;color:#fff;padding:10px 15px;border-radius:3px 3px 0 0;">',
      '  <strong>&#9203; AIUB Course Filter &mdash; Loading all course data&hellip;</strong>',
      '</div>',
      '<div style="padding:10px 15px;color:#666;font-size:13px;">',
      '  Please wait while all courses are being fetched. This may take a few seconds.',
      '</div>'
    ].join('');
    const ref = mainContent.querySelector('.panel') ||
                mainContent.querySelector('table') ||
                mainContent.firstChild;
    if (ref) mainContent.insertBefore(loader, ref);
    else mainContent.appendChild(loader);
  }

  // ── Build & inject the filter panel HTML ─────────────────────
  function injectFilterPanel(statuses) {
    const mainContent = document.getElementById('main-content') || document.body;

    // Remove loading indicator if present
    const loader = document.getElementById('aiub-filter-panel');
    if (loader) loader.remove();

    // Portal may use panel-primary or panel-default — try all
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
        <h5 class="panel-title">
          <i class="glyphicon glyphicon-filter"></i>&nbsp;
          Advanced Course Filter
          <span id="aiub-filter-count" class="badge" style="margin-left:10px;"></span>
          <span id="aiub-total-count" class="badge" style="margin-left:5px;background:#5cb85c;"></span>
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
              <option value="available">Available (any seats)</option>
              <option value="full">Full (0 seats)</option>
              <option value="5">5+ seats</option>
              <option value="10">10+ seats</option>
              <option value="15">15+ seats</option>
              <option value="20">20+ seats</option>
              <option value="25">25+ seats</option>
              <option value="30">30+ seats</option>
              <option value="35">35+ seats</option>
            </select>
          </div>
          <div class="col-md-2">
            <label>Time Slot</label>
            <select id="aiub-timeslot" class="form-control">
              <option value="">All Times</option>
              <option value="morning">Morning (8AM\u201312PM)</option>
              <option value="afternoon">Afternoon (12PM\u20134PM)</option>
              <option value="evening">Evening (4PM\u20139PM)</option>
            </select>
          </div>
        </div>
        <!-- Row 2: Day checkboxes + Reset -->
        <div class="row">
          <div class="col-md-10">
            <label>Days:</label>&nbsp;
            ${ALL_DAYS.map(d => `
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

    // Insert before the original course panel (or prepend to mainContent)
    if (originalPanel && originalPanel.parentNode === mainContent) {
      mainContent.insertBefore(filterPanel, originalPanel);
    } else {
      mainContent.insertBefore(filterPanel, mainContent.firstChild);
    }

    // Create results container (hidden initially)
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'aiub-results-container';
    resultsContainer.style.display = 'none';
    if (originalPanel && originalPanel.parentNode === mainContent) {
      mainContent.insertBefore(resultsContainer, originalPanel);
    } else {
      filterPanel.insertAdjacentElement('afterend', resultsContainer);
    }

    // Show total course count
    const totalBadge = document.getElementById('aiub-total-count');
    totalBadge.textContent = allCourses.length + ' total courses loaded';

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
      if (seatsVal) {
        const available = course.capacity - course.count;
        if (seatsVal === 'available' && available <= 0) return false;
        if (seatsVal === 'full' && available > 0) return false;
        // Numeric threshold: "5", "10", "15", etc.
        const threshold = parseInt(seatsVal, 10);
        if (!isNaN(threshold) && available < threshold) return false;
      }

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
    const originalPanel = originalTablePanel;

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
                Filtered Results \u2014 ${filteredCourses.length} course(s) found
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
    const originalPanel = originalTablePanel;
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
      injectLoadingPanel();   // show immediately while data loads
      allCourses = await getAllCourses();
      console.log('[AIUB Filter] Parsed ' + allCourses.length + ' courses');

      if (allCourses.length === 0) {
        console.error('[AIUB Filter] No courses found!');
        return;
      }

      const statuses = getUniqueStatuses(allCourses);
      injectFilterPanel(statuses);
      console.log('[AIUB Filter] Filter panel injected');
    } catch (err) {
      console.error('[AIUB Filter] Init failed:', err);
    }
  }

  init();
})();
