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

  // ── Time dropdown option generator ────────────────────────────
  function generateTimeOptions(placeholder) {
    let opts = '<option value="">' + placeholder + '</option>';
    for (let h = 7.5; h <= 21.5; h += 0.5) {
      const totalMins = Math.round(h * 60);
      const h24 = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      const period = h24 < 12 ? 'AM' : 'PM';
      const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
      const label = h12 + ':' + (m === 0 ? '00' : '30') + ' ' + period;
      opts += '<option value="' + h + '">' + label + '</option>';
    }
    return opts;
  }

  // ── Show loading indicator while data is being fetched ────────
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
          &#9889;&nbsp;Advanced Course Filter
          <span id="aiub-total-count" class="aiub-badge-total"></span>
        </h5>
        <div class="aiub-header-actions">
          <span id="aiub-filter-count" class="aiub-badge-results" style="display:none;"></span>
          <button id="aiub-reset-btn" type="button">&#8635; Reset</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="row">
          <div class="col-md-5 col-sm-12" style="margin-bottom:12px;">
            <span class="aiub-label">Search Course</span>
            <div class="aiub-search-wrap">
              <input type="text" id="aiub-search" class="form-control" placeholder="Course name or Class ID&hellip;">
            </div>
          </div>
          <div class="col-md-3 col-sm-6" style="margin-bottom:12px;">
            <span class="aiub-label">Status</span>
            <select id="aiub-status" class="form-control">
              <option value="">All Statuses</option>
              ${statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-4 col-sm-6" style="margin-bottom:12px;">
            <span class="aiub-label">Seat Availability</span>
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
        </div>
        <hr class="aiub-filter-divider">
        <div class="row">
          <div class="col-md-4 col-sm-12" style="margin-bottom:12px;">
            <span class="aiub-label">Class Start Time &mdash; From / To</span>
            <div class="aiub-time-range">
              <select id="aiub-time-from" class="form-control">${generateTimeOptions('From (any)')}</select>
              <span class="aiub-time-sep">&rarr;</span>
              <select id="aiub-time-to" class="form-control">${generateTimeOptions('To (any)')}</select>
            </div>
          </div>
          <div class="col-md-8 col-sm-12">
            <span class="aiub-label">Day of Week</span>
            <div class="aiub-days-wrap">
              ${ALL_DAYS.map(d => `<button type="button" class="aiub-day-btn" data-day="${d}">${d}</button>`).join('')}
            </div>
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
    document.getElementById('aiub-time-from').addEventListener('change', applyFilters);
    document.getElementById('aiub-time-to').addEventListener('change', applyFilters);

    document.querySelectorAll('.aiub-day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        applyFilters();
      });
    });

    document.getElementById('aiub-reset-btn').addEventListener('click', resetFilters);
  }

  // ── Core filter logic ────────────────────────────────────────
  function applyFilters() {
    const searchVal = document.getElementById('aiub-search').value.trim().toLowerCase();
    const statusVal = document.getElementById('aiub-status').value;
    const seatsVal = document.getElementById('aiub-seats').value;
    const timeFrom = parseFloat(document.getElementById('aiub-time-from').value);
    const timeTo = parseFloat(document.getElementById('aiub-time-to').value);

    const selectedDays = [];
    document.querySelectorAll('.aiub-day-btn.active').forEach(btn => {
      selectedDays.push(btn.dataset.day);
    });

    const hasFilters = searchVal || statusVal || seatsVal ||
      !isNaN(timeFrom) || !isNaN(timeTo) || selectedDays.length > 0;

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

      // 5. Time range filter (matches course start time)
      if (!isNaN(timeFrom) || !isNaN(timeTo)) {
        const hasMatchingTime = course.timeSlots.some(ts => {
          const startHour = parseTimeToHours(ts.startTime);
          if (startHour === null) return false;
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

    return `
      <tr>
        <td style="font-weight:600;color:#2c3e50;">${course.classId}</td>
        <td>${course.fullTitle}</td>
        <td><span class="${statusClass}">${course.status}</span></td>
        <td class="text-center">${course.capacity}</td>
        <td class="text-center">${course.count}</td>
        <td class="text-center">${seatsHtml}</td>
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
      <div class="panel-footer">
        <ul class="pagination">${pages}</ul>
        <span class="aiub-page-label">Page ${currentPage} of ${totalPages}</span>
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
    document.getElementById('aiub-time-from').value = '';
    document.getElementById('aiub-time-to').value = '';
    document.querySelectorAll('.aiub-day-btn.active').forEach(btn => btn.classList.remove('active'));

    const container = document.getElementById('aiub-results-container');
    const originalPanel = originalTablePanel;
    container.style.display = 'none';
    if (originalPanel) originalPanel.style.display = '';

    const badge = document.getElementById('aiub-filter-count');
    badge.textContent = '';
    badge.style.display = 'none';

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
