# AIUB Course Filter Extension — Complete Build Guide

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Understanding the Target Page](#3-understanding-the-target-page)
4. [Architecture & Approach](#4-architecture--approach)
5. [File Structure](#5-file-structure)
6. [Step-by-Step Build Process](#6-step-by-step-build-process)
   - [6.1 manifest.json](#61-manifestjson)
   - [6.2 content.js](#62-contentjs)
   - [6.3 styles.css](#63-stylescss)
   - [6.4 popup.html](#64-popuphtml)
   - [6.5 popup.js](#65-popupjs)
   - [6.6 popup.css](#66-popupcss)
7. [Filter Logic Deep Dive](#7-filter-logic-deep-dive)
8. [Installation & Testing](#8-installation--testing)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Problem Statement

**Target URL:** `https://portal.aiub.edu/Student/Section/Offered?q=mxPlMMGCoVQ%3D`

The AIUB student portal's "Offered Courses" page has these limitations:

- Shows **2300+ course sections** across **232 paginated pages** (10 rows per page).
- The ONLY filter available is a basic **text search bar** (provided by FooTable library).
- **No way to filter by:**
  - Student status (Freshman, Sophomore, Junior, Senior)
  - Seat availability (seats left vs full)
  - Day of the week (Sunday, Monday, etc.)
  - Time of day (morning, afternoon, evening)
- Students waste significant time scrolling through 232+ pages to find suitable courses.

---

## 2. Solution Overview

Build a Chrome Extension (Manifest V3) that:

1. **Auto-injects** onto the Offered Courses page (no user action needed).
2. **Parses all ~2300 rows** from the DOM in one pass (FooTable loads everything client-side).
3. **Injects an Advanced Filter Panel** above the existing table with:
   - Course name / Class ID text search
   - Status dropdown filter
   - Seat availability filter (Available / Full)
   - Day-of-week checkboxes
   - Time slot dropdown (Morning / Afternoon / Evening)
4. **Hides the original table** and shows a **custom filtered results table** with its own pagination.
5. **Restores the original table** when all filters are cleared.

---

## 3. Understanding the Target Page

### 3.1 Page Layout (DOM Structure)

The page has this hierarchy:

```
<div class="portal-body">
  <div class="row">
    <div id="navigation-bar" class="col-md-3">  ← Left sidebar (nav links)
    <div id="main-content" class="col-md-9">     ← Main content area
      <div class="panel panel-default">           ← The course table panel
        <div class="panel-heading">               ← "Offered Sections - 2025-2026, Summer"
        <div class="panel-body">
          <table class="table footable ...">      ← FooTable-powered table
            <thead>
              <tr class="footable-filtering">     ← Search bar row
              <tr class="footable-header">        ← Column headers
            </thead>
            <tbody>
              <tr>...</tr>                        ← Course rows (ALL ~2300 loaded)
              <tr>...</tr>
              ...
            </tbody>
            <tfoot>
              <tr class="footable-paging">        ← Pagination (232 pages)
            </tfoot>
          </table>
```

### 3.2 Table Columns

Each course row (`<tr>`) has **6 `<td>` cells**:

| Cell Index | Column Name | Example Value | CSS Visibility | data-breakpoints |
|:---:|:---|:---|:---|:---|
| 0 | Class ID | `00001` | Hidden on xs | `xs` |
| 1 | Title | `INTRODUCTION TO BUSINESS [A1]` | Always visible | — |
| 2 | Status | `Freshman` | Always visible | — |
| 3 | Capacity | `40` | Hidden on xs | `xs` |
| 4 | Count | `0` | Hidden on sm | `sm` |
| 5 | Time | Nested `<table>` | Hidden on xs,sm | `xs sm` |

### 3.3 Time Cell Structure (Nested Table)

The 6th cell (index 5) contains a **nested table** with schedule rows:

```html
<td>
  <table class="table table-condensed table-bordered">
    <tbody>
      <tr>
        <td>Theory </td>
        <td>Monday </td>
        <td>1:00 PM </td>
        <td>2:30 PM </td>
        <td>5101 </td>
      </tr>
      <tr>
        <td>Theory </td>
        <td>Wednesday </td>
        <td>1:00 PM </td>
        <td>2:30 PM </td>
        <td>5101 </td>
      </tr>
    </tbody>
  </table>
</td>
```

Each nested row has 5 cells: **Class Type | Day | Start Time | End Time | Room**

### 3.4 Key Observations

- **FooTable** handles pagination client-side. ALL rows are in the DOM, just hidden by CSS.
- FooTable toggles `display: none` on `<tr>` elements for pagination — the data is always accessible.
- The page uses **Bootstrap 3** (panels, grid, buttons, glyphicons, Font Awesome).
- The `footable-toggle fooicon-plus` span in column 1 is FooTable's row-expand icon.
- The search bar lives inside `<tr class="footable-filtering">` in the `<thead>`.

---

## 4. Architecture & Approach

### 4.1 High-Level Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Chrome Extension                          │
├──────────────────────────────────────────────────────────────┤
│  manifest.json   → Declares content_scripts auto-injection   │
│  content.js      → Parses DOM, builds UI, handles filtering  │
│  styles.css      → Styles for the injected filter panel      │
│  popup.html/css/js → Small popup with extension info          │
└──────────────────────────────────────────────────────────────┘
         │
         │ content_scripts (auto-injected on page match)
         ▼
┌──────────────────────────────────────────────────────────────┐
│         AIUB Portal — Offered Courses Page                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  INJECTED: Advanced Filter Panel                       │  │
│  │  [Search...] [Status ▾] [Seats ▾] [☐Days] [TimeSlot ▾]│  │
│  │  [Reset All]                                           │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Original FooTable panel (hidden when filters active)  │  │
│  │  — OR —                                                │  │
│  │  Custom results table with our own pagination          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Why This Approach?

| Decision | Reasoning |
|:---|:---|
| **Content script** (not popup-driven) | Filter panel must live on the page itself, not in a popup |
| **Parse all rows upfront** | FooTable loads everything into DOM; parsing once is instant (~50ms for 2300 rows) |
| **Hide original + show custom table** | Fighting FooTable's internal state would cause race conditions |
| **Use Bootstrap classes** | The portal already loads Bootstrap 3 — our UI blends in naturally |
| **No external API calls** | Everything runs locally; no network requests, no privacy concerns |
| **Auto-apply filters** | Dropdowns/checkboxes apply instantly; search uses 300ms debounce |

### 4.3 Data Model

Each parsed course becomes a JavaScript object:

```javascript
{
  classId: "00001",
  title: "INTRODUCTION TO BUSINESS",
  section: "A1",
  fullTitle: "INTRODUCTION TO BUSINESS [A1]",
  status: "Freshman",
  capacity: 40,           // number
  count: 0,               // number
  timeSlots: [
    {
      classType: "Theory",
      day: "Monday",
      startTime: "1:00 PM",
      endTime: "2:30 PM",
      room: "5101"
    },
    {
      classType: "Theory",
      day: "Wednesday",
      startTime: "1:00 PM",
      endTime: "2:30 PM",
      room: "5101"
    }
  ]
}
```

---

## 5. File Structure

```
AIUB_Course_Web_Scrabber_Extension/
├── manifest.json                      # Chrome extension config (Manifest V3)
├── content.js                         # Core logic: parse, inject UI, filter, render
├── styles.css                         # CSS for injected filter panel & results table
├── popup.html                         # Small popup shown when clicking extension icon
├── popup.js                           # Popup logic (minimal — just status display)
├── popup.css                          # Popup styles
├── logo.svg                           # Extension icon
├── README.md                          # User-facing readme
└── AIUB_Course_Filter_Extenstion.md   # This build guide
```

---

## 6. Step-by-Step Build Process

---

### 6.1 manifest.json

This is the Chrome Extension configuration file using **Manifest V3**.

**What to configure:**
- `content_scripts` — auto-inject `content.js` and `styles.css` on the target URL
- `matches` — only `https://portal.aiub.edu/Student/Section/Offered*`
- `run_at: "document_idle"` — inject after the page fully loads (so FooTable has rendered)
- `permissions` — only `activeTab` is needed (no storage, no network)

```json
{
  "manifest_version": 3,
  "name": "AIUB Course Filter",
  "version": "1.0",
  "description": "Advanced filtering for AIUB Portal Offered Courses — filter by status, seat availability, day, and time slot",
  "permissions": [
    "activeTab"
  ],
  "host_permissions": [
    "https://portal.aiub.edu/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://portal.aiub.edu/Student/Section/Offered*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "logo.svg",
      "48": "logo.svg",
      "128": "logo.svg"
    }
  },
  "icons": {
    "16": "logo.svg",
    "48": "logo.svg",
    "128": "logo.svg"
  }
}
```

**Key points:**
- `run_at: "document_idle"` ensures the DOM is fully built before our script runs.
- We match the URL with a wildcard `*` at the end because the `?q=` parameter varies per student.
- `host_permissions` is required for content script injection on the portal domain.

---

### 6.2 content.js

This is the core file. It does everything: parse, build UI, filter, render. Below is the complete logic broken into sections.

#### 6.2.1 IIFE Wrapper & State Variables

Wrap everything in an IIFE to avoid polluting the global scope:

```javascript
(function () {
  'use strict';

  // Prevent double-injection if the script runs twice
  if (window.__aiubFilterInjected) return;
  window.__aiubFilterInjected = true;

  let allCourses = [];           // All parsed course objects
  let filteredCourses = [];      // Currently filtered subset
  let currentPage = 1;           // Pagination state
  let rowsPerPage = 10;          // Configurable
  const SEARCH_DEBOUNCE = 300;   // ms
  let searchTimeout = null;

  // ... rest of the code
})();
```

#### 6.2.2 Wait for FooTable to Render

FooTable might not have rendered rows yet when our script runs. Poll for rows:

```javascript
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
```

#### 6.2.3 Parse All Course Rows

Extract data from every `<tr>` in the tbody. Each row has 6 `<td>` cells:

```javascript
function parseAllCourses() {
  const rows = document.querySelectorAll('table.footable tbody tr');
  const courses = [];

  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 6) return; // Skip malformed rows

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
```

**Important notes:**
- `cells[5]` contains the nested schedule table. We query `table tbody tr` inside it.
- Some cells have trailing spaces (e.g., `"Theory "`) — `trim()` handles this.
- `capacity` and `count` must be parsed as integers for numeric comparisons.

#### 6.2.4 Extract Unique Values for Dropdown Options

Dynamically build dropdown options from the actual data:

```javascript
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
  // Return in calendar order
  const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return dayOrder.filter(d => days.has(d));
}
```

#### 6.2.5 Build & Inject the Filter Panel HTML

Create the filter panel using Bootstrap 3 classes (already loaded on the portal page):

```javascript
function injectFilterPanel(statuses, days) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const originalPanel = mainContent.querySelector('.panel.panel-default');
  if (!originalPanel) return;

  // Create filter panel container
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

      <!-- Row 1: Search + Status + Seats -->
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
```

**Why `panel-primary`?** It gives the filter panel a distinct blue header, differentiating it from the white `panel-default` of the original table.

#### 6.2.6 Event Listeners

```javascript
function attachFilterListeners() {
  // Search: debounced
  document.getElementById('aiub-search').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(applyFilters, SEARCH_DEBOUNCE);
  });

  // Dropdowns: instant
  document.getElementById('aiub-status').addEventListener('change', applyFilters);
  document.getElementById('aiub-seats').addEventListener('change', applyFilters);
  document.getElementById('aiub-timeslot').addEventListener('change', applyFilters);

  // Day checkboxes: instant
  document.querySelectorAll('.aiub-day-checkbox').forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });

  // Reset button
  document.getElementById('aiub-reset-btn').addEventListener('click', resetFilters);
}
```

#### 6.2.7 Filter Logic

This is the core filtering function. All filters are combined with **AND** logic:

```javascript
function applyFilters() {
  const searchVal = document.getElementById('aiub-search').value.trim().toLowerCase();
  const statusVal = document.getElementById('aiub-status').value;
  const seatsVal = document.getElementById('aiub-seats').value;
  const timeslotVal = document.getElementById('aiub-timeslot').value;

  // Collect checked days
  const selectedDays = [];
  document.querySelectorAll('.aiub-day-checkbox:checked').forEach(cb => {
    selectedDays.push(cb.value);
  });

  // Check if any filter is active
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

    // 4. Day filter (course must have at least one time slot on ANY selected day)
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
```

#### 6.2.8 Time Parsing Helper

Convert "1:00 PM" → 13.0 (decimal hours):

```javascript
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
```

#### 6.2.9 Render Filtered Results Table

Build a custom results table and pagination:

```javascript
function renderFilteredResults() {
  const container = document.getElementById('aiub-results-container');
  const originalPanel = document.querySelector('#main-content > .panel.panel-default');

  // Hide original, show ours
  if (originalPanel) originalPanel.style.display = 'none';
  container.style.display = 'block';

  // Update count badge
  const badge = document.getElementById('aiub-filter-count');
  badge.textContent = `${filteredCourses.length} results`;

  // Pagination
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

  // Attach pagination & rows-per-page listeners
  attachResultListeners(totalPages);
}
```

#### 6.2.10 Render a Single Course Row

```javascript
function renderCourseRow(course) {
  const available = course.capacity - course.count;
  const isFull = available <= 0;
  const availableClass = isFull ? 'text-danger' : 'text-success';
  const availableText = isFull ? 'FULL' : `${available} seats`;

  const scheduleHtml = course.timeSlots.map(ts =>
    `<div><small><strong>${ts.classType}</strong> ${ts.day} ${ts.startTime}–${ts.endTime} (${ts.room})</small></div>`
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
```

#### 6.2.11 Pagination Component

```javascript
function renderPagination(totalPages) {
  let pages = '';
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  pages += `<li class="${currentPage===1?'disabled':''}">
    <a href="#" data-page="1">«</a></li>`;
  pages += `<li class="${currentPage===1?'disabled':''}">
    <a href="#" data-page="${currentPage-1}">‹</a></li>`;

  for (let i = startPage; i <= endPage; i++) {
    pages += `<li class="${i===currentPage?'active':''}">
      <a href="#" data-page="${i}">${i}</a></li>`;
  }

  pages += `<li class="${currentPage===totalPages?'disabled':''}">
    <a href="#" data-page="${currentPage+1}">›</a></li>`;
  pages += `<li class="${currentPage===totalPages?'disabled':''}">
    <a href="#" data-page="${totalPages}">»</a></li>`;

  return `
    <div class="panel-footer text-center">
      <ul class="pagination" style="margin:5px 0;">${pages}</ul>
      <span class="label label-default">${currentPage} of ${totalPages}</span>
    </div>
  `;
}
```

#### 6.2.12 Result Listeners (Pagination + Rows Per Page)

```javascript
function attachResultListeners(totalPages) {
  // Pagination links
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

  // Rows per page dropdown
  const rppSelect = document.getElementById('aiub-rows-per-page');
  if (rppSelect) {
    rppSelect.addEventListener('change', () => {
      rowsPerPage = parseInt(rppSelect.value, 10);
      currentPage = 1;
      renderFilteredResults();
    });
  }
}
```

#### 6.2.13 Reset Filters

```javascript
function resetFilters() {
  // Clear all inputs
  document.getElementById('aiub-search').value = '';
  document.getElementById('aiub-status').value = '';
  document.getElementById('aiub-seats').value = '';
  document.getElementById('aiub-timeslot').value = '';
  document.querySelectorAll('.aiub-day-checkbox').forEach(cb => cb.checked = false);

  // Hide custom results, show original table
  const container = document.getElementById('aiub-results-container');
  const originalPanel = document.querySelector('#main-content > .panel.panel-default');
  container.style.display = 'none';
  if (originalPanel) originalPanel.style.display = '';

  // Clear badge
  const badge = document.getElementById('aiub-filter-count');
  badge.textContent = '';

  filteredCourses = [];
  currentPage = 1;
}
```

#### 6.2.14 Main Initialization

```javascript
async function init() {
  try {
    await waitForTable();
    allCourses = parseAllCourses();
    console.log(`[AIUB Filter] Parsed ${allCourses.length} courses`);

    const statuses = getUniqueStatuses(allCourses);
    const days = getUniqueDays(allCourses);

    injectFilterPanel(statuses, days);
    console.log('[AIUB Filter] Filter panel injected');
  } catch (err) {
    console.error('[AIUB Filter] Init failed:', err);
  }
}

init();
```

---

### 6.3 styles.css

Custom styles for the injected filter panel. Complement Bootstrap (don't override):

```css
/* Filter Panel */
#aiub-filter-panel {
  margin-bottom: 15px;
}

#aiub-filter-panel .panel-heading {
  background: #2c3e50;
  color: white;
  border: none;
}

#aiub-filter-panel .panel-body {
  background: #f8f9fa;
}

#aiub-filter-panel label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 3px;
  color: #555;
}

#aiub-filter-panel .checkbox-inline {
  font-weight: normal;
  margin-right: 15px;
}

/* Results Table */
#aiub-results-container .table th {
  background: #2c3e50;
  color: white;
  font-size: 12px;
  white-space: nowrap;
}

#aiub-results-container .table td {
  font-size: 13px;
  vertical-align: middle;
}

#aiub-results-container .text-success {
  color: #27ae60 !important;
}

#aiub-results-container .text-danger {
  color: #e74c3c !important;
}

#aiub-results-container .pagination {
  margin: 5px 0;
}

#aiub-results-container .pagination > li > a {
  color: #2c3e50;
  padding: 4px 10px;
  font-size: 13px;
}

#aiub-results-container .pagination > .active > a {
  background: #2c3e50;
  border-color: #2c3e50;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  #aiub-filter-panel .col-md-4,
  #aiub-filter-panel .col-md-3,
  #aiub-filter-panel .col-md-2 {
    margin-bottom: 8px;
  }
}
```

---

### 6.4 popup.html

A simple popup shown when clicking the extension icon. It's informational only — the real work happens in the content script:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIUB Course Filter</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>AIUB Course Filter</h1>
    <div class="info">
      <p>This extension adds advanced filters to the AIUB Portal's
         Offered Courses page.</p>
      <p><strong>Filters available:</strong></p>
      <ul>
        <li>Course name / Class ID search</li>
        <li>Status (Freshman, Sophomore, etc.)</li>
        <li>Seat availability</li>
        <li>Day of week</li>
        <li>Time slot (Morning / Afternoon / Evening)</li>
      </ul>
    </div>
    <div id="status" class="status"></div>
    <div class="footer">
      <p>Developed By
         <a href="https://rijoan.com" target="_blank" rel="noopener noreferrer">
           Md Rijoan Maruf</a></p>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

---

### 6.5 popup.js

Check if the user is on the correct page and show status:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url && tab.url.includes('portal.aiub.edu/Student/Section/Offered')) {
      statusDiv.className = 'status active';
      statusDiv.textContent = 'Filter panel is active on this page.';
    } else {
      statusDiv.className = 'status inactive';
      statusDiv.textContent = 'Navigate to the Offered Courses page to use filters.';
    }
  } catch (e) {
    statusDiv.className = 'status inactive';
    statusDiv.textContent = 'Unable to detect current page.';
  }
});
```

---

### 6.6 popup.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 320px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f8f9fa;
  color: #333;
}

.container {
  padding: 16px;
}

h1 {
  color: #2c3e50;
  font-size: 18px;
  margin-bottom: 12px;
  text-align: center;
}

.info {
  background: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  border: 1px solid #e9ecef;
  font-size: 13px;
  line-height: 1.5;
}

.info ul {
  margin: 6px 0 0 18px;
  padding: 0;
}

.info li {
  margin-bottom: 2px;
}

.status {
  padding: 10px;
  border-radius: 6px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}

.status.active {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status.inactive {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
}

.footer {
  text-align: center;
  font-size: 11px;
  color: #888;
}

.footer a {
  color: #2c3e50;
  text-decoration: none;
}
```

---

## 7. Filter Logic Deep Dive

### 7.1 Filter Combination

All filters use **AND** logic:

```
A course passes IF:
  (matches search OR no search entered)
  AND (matches status OR no status selected)
  AND (matches seat filter OR no seat filter selected)
  AND (has a time slot on at least one selected day OR no days selected)
  AND (has a time slot in the selected time range OR no time range selected)
```

### 7.2 Search Behavior

- **Case-insensitive** — "data structure" matches "DATA STRUCTURE"
- Matches against **title**, **full title** (with section), and **class ID**
- **Debounced 300ms** — doesn't fire until the user stops typing

### 7.3 Seat Availability Logic

```
Available = count < capacity   (at least 1 seat left)
Full      = count >= capacity  (no seats left)
```

### 7.4 Day Filter Logic

- Multiple days can be checked simultaneously.
- A course matches if it has **at least one time slot on ANY of the selected days**.
- Example: if Sunday + Tuesday are checked, a course with [Sunday, Tuesday] sessions matches; a course with only [Monday, Wednesday] does not.

### 7.5 Time Slot Ranges

| Slot | Start (inclusive) | End (exclusive) |
|:---|:---|:---|
| Morning | 8:00 AM (8.0) | 12:00 PM (12.0) |
| Afternoon | 12:00 PM (12.0) | 4:00 PM (16.0) |
| Evening | 4:00 PM (16.0) | 9:00 PM (21.0) |

The filter checks the **start time** of each time slot. A course matches if **any** of its time slots start within the selected range.

---

## 8. Installation & Testing

### 8.1 Install in Chrome (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** ON (top-right corner)
3. Click **Load unpacked**
4. Select the extension folder (`AIUB_Course_Web_Scrabber_Extension/`)
5. The extension icon appears in the toolbar

### 8.2 Test It

1. Log into AIUB Portal: `https://portal.aiub.edu`
2. Navigate to **Academics → Offered Courses**
3. The **Advanced Course Filter** panel should appear above the course table automatically
4. Test each filter:
   - Type a course name in the search box → results update after 300ms
   - Select a status from the dropdown → instant update
   - Select "Available" in seats → only courses with free seats shown
   - Check a day checkbox → only courses on that day shown
   - Select a time slot → only courses in that time range shown
5. Click **Reset All** → original FooTable restored

### 8.3 Debugging

- Open **DevTools** (F12) on the portal page
- Check **Console** for messages starting with `[AIUB Filter]`
- The init log shows how many courses were parsed: `[AIUB Filter] Parsed 2316 courses`
- If the filter panel doesn't appear:
  - Check `chrome://extensions/` for errors
  - Verify the URL matches `https://portal.aiub.edu/Student/Section/Offered*`
  - Check if FooTable rows loaded (inspect `table.footable tbody tr` count)

---

## 9. Troubleshooting

| Issue | Cause | Fix |
|:---|:---|:---|
| Filter panel doesn't appear | FooTable hasn't loaded yet | Increase `maxAttempts` in `waitForTable()` |
| 0 courses parsed | DOM structure changed | Re-inspect the table; update cell indices in `parseAllCourses()` |
| Time filter not working | Time format changed (e.g., 24h) | Update `parseTimeToHours()` regex |
| Panel styling broken | Bootstrap version changed | Check if portal upgraded Bootstrap; adjust classes |
| Extension icon shows but nothing happens | URL doesn't match manifest pattern | Compare `matches` with actual URL |
| "FULL" shown incorrectly | Count/Capacity parsing NaN | Check if cells[3] / cells[4] have non-numeric content |
| Double filter panel | Script injected twice | The `window.__aiubFilterInjected` guard prevents this |