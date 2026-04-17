# AIUB Portal+ — Complete Project Scrape

> A Chrome Extension (Manifest V3) that enhances the AIUB Student Portal (`portal.aiub.edu`) with React-based UI overlays, grade visualizations, smart schedules, filtering, and more.

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Manifest & Build Config](#4-manifest--build-config)
5. [Content Scripts — Entry Points](#5-content-scripts--entry-points)
6. [Shared Components](#6-shared-components)
7. [Home Page Components](#7-home-page-components)
8. [Academic Page Components](#8-academic-page-components)
9. [Grade Components](#9-grade-components)
10. [Popup (App.jsx)](#10-popup-appjsx)
11. [Grade Graphs Dashboard](#11-grade-graphs-dashboard)
12. [CSS Files — Page by Page](#12-css-files--page-by-page)
13. [Data Storage](#13-data-storage)
14. [Static Data (CSE.json)](#14-static-data-csejson)
15. [Build & Scripts](#15-build--scripts)
16. [Key Patterns & Utilities](#16-key-patterns--utilities)
17. [Feature Summary Table](#17-feature-summary-table)

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| Name | AIUB Portal+ |
| Short Name | AIUB+ |
| Version | 2.0.0 |
| Manifest | V3 |
| Target | `https://portal.aiub.edu/*` |
| Permissions | `activeTab`, `storage`, `tabs` |
| Popup | `index.html` (340px wide React app) |
| Icon | `public/aiub.jpg` |

---

## 2. Tech Stack

| Package | Version | Role |
|---------|---------|------|
| react | ^19.2.4 | UI framework |
| react-dom | ^19.2.4 | DOM rendering |
| recharts | ^3.8.1 | Chart library for grade graphs |
| vite | ^8.0.4 | Build tool |
| @vitejs/plugin-react | ^6.0.1 | JSX/React transpilation |
| @crxjs/vite-plugin | ^2.4.0 | Chrome extension bundler |
| tailwindcss | ^3.4.17 | Utility-first CSS |
| postcss | ^8.5.10 | CSS transformation |
| autoprefixer | ^10.5.0 | Vendor prefix handling |
| eslint | ^9.39.4 | Code linting |

**Tailwind custom colors** (in `tailwind.config.js`):
```
aiub-navy, aiub-blue, aiub-sky, aiub-success, aiub-warning, aiub-danger
```

---

## 3. Directory Structure

```
AIUB+ Extension/
│
├── manifest.json                  # Extension config (MV3)
├── package.json                   # Dependencies & scripts
├── vite.config.js                 # Vite + @crxjs bundler setup
├── tailwind.config.js             # Custom AIUB color palette
├── postcss.config.js              # Tailwind + Autoprefixer
├── eslint.config.js               # ES2020, React hooks lint rules
├── index.html                     # Popup entry HTML
├── graphs.html                    # Grade graphs page HTML
├── Scrabe.md                      # This file (project documentation)
│
├── src/
│   ├── main.jsx                   # Popup React root (mounts App)
│   ├── grade-graphs.jsx           # Grade graphs React root (mounts Graphs)
│   ├── App.jsx                    # Popup UI component
│   ├── App.css                    # Popup styles
│   ├── index.css                  # Global base styles
│   ├── content.css                # Tailwind utilities (used by all content scripts)
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   │
│   └── components/
│       ├── shared/
│       │   ├── contentBridge.jsx          # localStorage ↔ chrome.storage bridge
│       │   └── Sidebar.jsx                # Sidebar profile + navigation enhancer
│       │
│       ├── home/
│       │   ├── Intro.jsx                  # Greeting header with date
│       │   ├── ClassSchedule.jsx          # Schedule cards with live countdown
│       │   └── Registration.jsx           # Home registration CSS injector
│       │
│       ├── academic/
│       │   ├── CourseAndResults.jsx       # Collapsible grade display
│       │   ├── Registration.jsx           # Course cards + fee breakdown
│       │   ├── MkCurriculumn.jsx          # Curriculum table + prerequisites
│       │   ├── Financials.jsx             # Financial summary + table coloring
│       │   └── DropApplication.jsx        # Drop form + refund % header
│       │
│       ├── grade/
│       │   ├── Graphs.jsx                 # Main chart dashboard
│       │   ├── carriculum_grade_report.jsx   # Parse curriculum grade page → storage
│       │   └── carriculum_grade_semester.jsx # Parse semester grade page → storage
│       │
│       ├── entries/                       # Content script entry points
│       │   ├── sharedBridge.content.jsx
│       │   ├── sharedSidebar.content.jsx
│       │   ├── homeBundle.content.jsx
│       │   ├── offeredFilters.content.jsx
│       │   ├── academicCourseResults.content.jsx
│       │   ├── academicRegistration.content.jsx
│       │   ├── academicCurriculum.content.jsx
│       │   ├── academicFinancials.content.jsx
│       │   ├── academicDropApplication.content.jsx
│       │   ├── gradeCurriculum.content.jsx
│       │   └── gradeSemester.content.jsx
│       │
│       └── content/
│           └── content.jsx                # Offered courses (placeholder)
│
└── public/
    ├── aiub.jpg                           # Extension icon
    ├── favicon.svg / icons.svg
    ├── styles.css                         # Offered courses filter UI styles
    │
    ├── Academic/
    │   ├── CSE.json                       # Course catalog (codes, credits, prerequisites)
    │   ├── CourseAndResults.css
    │   ├── Registration.css
    │   ├── Financials.css
    │   ├── DropApplication.css
    │   └── MkCurriculumn.css
    │
    ├── Home/
    │   ├── ClassSchedule.css
    │   ├── Intro.css
    │   └── Registration.css
    │
    ├── Grade/
    │   ├── Graphs.html                    # Standalone grade dashboard page
    │   ├── Graphs.css
    │   ├── Graphs.js                      # Dashboard chart rendering logic
    │   ├── chart.umd.js                   # Recharts bundle
    │   ├── carriculum_grade_report.css
    │   └── carriculum_grade_semester.css
    │
    └── Shared/
        ├── Sidebar.css
        └── Navbar.css                     # (unused)
```

---

## 4. Manifest & Build Config

### manifest.json — Content Scripts

| ID | JS Entry | URL Match | run_at |
|----|----------|-----------|--------|
| sharedBridge | `sharedBridge.content.jsx` | `/Student*` | `document_start` |
| sharedSidebar | `sharedSidebar.content.jsx` | `/Student*` | `document_idle` |
| homeBundle | `homeBundle.content.jsx` | `/Student/index` | `document_idle` |
| offeredFilters | `offeredFilters.content.jsx` | `/Scheduling/OfferedCourses` | `document_idle` |
| academicCourseResults | `academicCourseResults.content.jsx` | `/Student/CourseRegistration/Result*` | `document_idle` |
| academicRegistration | `academicRegistration.content.jsx` | `/Student/CourseRegistration*` | `document_idle` |
| academicCurriculum | `academicCurriculum.content.jsx` | `/Student/Curriculum*` | `document_idle` |
| academicFinancials | `academicFinancials.content.jsx` | `/Student/Financial*` | `document_idle` |
| academicDropApplication | `academicDropApplication.content.jsx` | `/Student/Drop*` | `document_idle` |
| gradeCurriculum | `gradeCurriculum.content.jsx` | `/Student/Grade/CurriculumGradeReport*` | `document_idle` |
| gradeSemester | `gradeSemester.content.jsx` | `/Student/Grade/SemesterGradeReport*` | `document_idle` |

### Web Accessible Resources
- `public/aiub.jpg` — Extension icon
- `public/Academic/CSE.json` — Course catalog (fetched by content scripts)
- `public/Grade/Graphs.html` + `Graphs.css` + `Graphs.js` + `chart.umd.js` — Grade dashboard
- `public/Grade/carriculum_grade_report.css` + `carriculum_grade_semester.css`
- `public/Shared/Sidebar.css`

### vite.config.js
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
})
```
The `@crxjs/vite-plugin` reads `manifest.json`, auto-discovers all entry points, and outputs a complete extension to `/dist`.

---

## 5. Content Scripts — Entry Points

Each file in `src/components/entries/` is a thin wrapper that:
1. Calls `chrome.storage.sync.get({ extensionEnabled: true })` 
2. Returns early if disabled
3. Imports and invokes the corresponding component's self-mounting IIFE

```
sharedBridge.content.jsx        → shared/contentBridge.jsx
sharedSidebar.content.jsx       → shared/Sidebar.jsx
homeBundle.content.jsx          → home/Intro.jsx + home/ClassSchedule.jsx + home/Registration.jsx
offeredFilters.content.jsx      → content/content.jsx (placeholder)
academicCourseResults.content   → academic/CourseAndResults.jsx
academicRegistration.content    → academic/Registration.jsx
academicCurriculum.content      → academic/MkCurriculumn.jsx
academicFinancials.content      → academic/Financials.jsx
academicDropApplication.content → academic/DropApplication.jsx
gradeCurriculum.content         → grade/carriculum_grade_report.jsx
gradeSemester.content           → grade/carriculum_grade_semester.jsx
```

---

## 6. Shared Components

### `contentBridge.jsx`

**Purpose:** Sync extension enabled/disabled state between `chrome.storage.sync` and `localStorage` so that IIFE-based scripts can check `localStorage.__aiubPortalEnabled` without async overhead.

**Lifecycle:**
- Fires at `document_start` (earliest possible)
- Sets `localStorage.__aiubPortalEnabled` immediately
- Adds `chrome.storage.onChanged` listener to update live

---

### `Sidebar.jsx`

**DOM Target:** `.sidebar` or `#sidebar` in the AIUB portal layout

**What it adds:**
- **Profile Block** (top of sidebar): Student name, ID, department — extracted from portal header
- **Navigation Enhancement**: Highlights the active nav item with a blue left-border indicator
- **Graphs Link**: Injects an extra nav item linking to `Grade/Graphs.html` (grade dashboard)

**Styling:** `public/Shared/Sidebar.css`
```
Gradient background (f8fafc → e0e7ff)
Profile card: blue gradient, white text
Active nav: blue left border, blue text
Hover: light blue background
```

---

## 7. Home Page Components

### `Intro.jsx`

**URL:** `/Student/index`  
**DOM Target:** `#main-content` first column element  
**Inserts:** A greeting header above existing content

**Displays:**
- Time-based greeting (`Good morning/afternoon/evening, [First Name]`)
- Full date string (e.g. `Thursday, April 17, 2026`)
- Student first name extracted from portal header `.navbar-right`

**Styling:** `public/Home/Intro.css`

---

### `ClassSchedule.jsx`

**URL:** `/Student/index`  
**DOM Target:** Class Schedule panel inside `#main-content`

**Data Parsing:**
- Scans existing schedule table rows
- Extracts: date label (`Today` / `Tomorrow` / specific date), course name, time string, room
- Parses time strings in format `DAY HH:MM AM/PM – HH:MM AM/PM`
- Converts to JS `Date` objects for comparison against `Date.now()`

**Live Timer Logic:**
- Re-renders every second via `setInterval`
- **Upcoming** (blue): Shows "in X min" countdown to class start
- **In Progress** (green + pulse dot): Shows "Xm left" countdown to end
- **Ended** (gray): Shows "Ended"

**Component Hierarchy:**
```
ClassScheduleView
  └── DayGroup (per date)
        └── ClassEntry (per class)
              └── TimerBadge (live status chip)
```

**Styling:** `public/Home/ClassSchedule.css`
```
Day headers: blue left-border, date badge
Class cards: white bg, left border, time/room metadata
Timer badges:
  - upcoming: #eff6ff bg, #1d4ed8 text
  - active: #dcfce7 bg, #166534 text, pulse animation (sched-pulse keyframes)
  - ended: #f1f5f9 bg, #94a3b8 text
```

---

### `Registration.jsx` (Home)

**URL:** `/Student/index` (registration panel)  
**Method:** Pure CSS injection via `<style>` tag — no React DOM changes

**Styled elements:**
- Semester dropdown → borderless, clean appearance
- Course panels → bordered cards with shadow
- Course labels → info/success/danger colored badges (Bootstrap override)

---

## 8. Academic Page Components

### `CourseAndResults.jsx`

**URL:** `/Student/CourseRegistration/Result*`  
**DOM Target:** `#main-content .panel-body`

**Data Parsing Functions:**

| Function | Input | Output |
|----------|-------|--------|
| `parseGradeScore(text)` | `"A+ (92.5)"` | `{ grade: "A+", score: "92.5" }` |
| `parseMeta(text)` | `"Total Mark: 100 Pass: 40 Contributes: 60%"` | `{ total, pass, contrib }` |
| `parseRow(row)` | `.row` DOM element | `{ name, meta, score, isH4 }` |
| `parseTerm(termEl)` | Term `.list-group-item` | `{ termName, termMeta, grade, score, sections[] }` |

**Grade Color Map:**
```js
A+: #059669 (dark green)    A: #10b981 (green)
B+: #2563eb (blue)          B: #3b82f6 (light blue)
C+: #d97706 (amber)         C: #f59e0b (yellow)
D+: #dc2626 (red)           D: #ef4444 (light red)
F:  #991b1b (dark red)      W/UW: #6b7280 (gray)
-:  #7c3aed (violet)
```

**Component Tree:**
```
CourseAndResultsView
├── Filter bar (Course dropdown + Semester dropdown)
├── Course Summary Card (gradient blue, shows final grade large)
├── Divider ("Term Breakdown")
└── TermCard × N
      ├── Gradient header (blue for Midterm, violet for Final)
      │     • Tag badge, term name, meta, grade, chevron
      └── Body (light blue/violet tint)
            └── SectionCard × N (collapsible, white card, colored left border)
                  └── Sub-item rows × N
```

**Styling:** `public/Academic/CourseAndResults.css`
- Course card: `linear-gradient(135deg, #2563eb → #4338ca)` with white text
- Midterm header: `linear-gradient(135deg, #3b82f6 → #1d4ed8)`
- Final header: `linear-gradient(135deg, #8b5cf6 → #4f46e5)`
- Section left border: blue (midterm) / violet (final)
- Sub-rows: white cards with colored hover

---

### `Registration.jsx` (Academic)

**URL:** `/Student/CourseRegistration*`  
**DOM Target:** `#main-content`

**Data Extracted:**
- Course rows from registration table `tbody tr`
- Per course: code, name, section, schedule lines (type + time + room)
- Dropped courses (identified by red `<span>` in row)
- Credit summary: total, attempted, completed, remaining
- Fee breakdown: list items from `.fee-list`

**Component Tree:**
```
RegistrationView
├── Course Cards Grid
│     └── CourseCard
│           ├── Course code + name + section badge
│           ├── Schedule rows (Theory / Lab with time + room)
│           └── Dropped badge (if applicable)
├── Credit Summary Chips
│     └── Chip (total / attempted / completed / remaining)
└── Fee Panel (sticky sidebar)
      └── FeeRow (description + amount badge)
```

**Styling:** `public/Academic/Registration.css`
```
Course cards: white, rounded-xl, shadow-sm, left blue border
Schedule badges: Theory = blue, Lab = green
Fee panel: sticky top-20, white card, shadow
Credit chips: pill shapes, colored by state
Responsive: grid → single column at <900px
```

---

### `MkCurriculumn.jsx`

**URL:** `/Student/Curriculum*`  
**DOM Target:** Curriculum table (`.table tbody tr`)

**What it does:**
1. Fetches `public/Academic/CSE.json` via `chrome.runtime.getURL()`
2. For each row in the curriculum table, extracts course code + name
3. Normalizes strings: `normCode()` (strip spaces, uppercase), `norm()` (trim + lowercase)
4. Looks up matching course in `CSE.json`
5. Injects a new **Prerequisites** column cell before the last column of each row

**CSE.json structure (per course entry):**
```json
{
  "code": "CSE 101",
  "name": "Introduction to Programming",
  "credits": 3,
  "prerequisites": ["None"] | ["CSE 101", "MAT 201"]
}
```

**Styling:** `public/Academic/MkCurriculumn.css`

---

### `Financials.jsx`

**URL:** `/Student/Financial*`  
**DOM Target:** `#main-content`

**Summary Cards (React, above the table):**

| Card | Color | Value Source |
|------|-------|-------------|
| Total Charged | Red/orange | Sum of debit column |
| Total Paid | Green | Sum of credit column |
| Balance Due | Blue | Current balance figure |

**Table Augmentation (inline DOM manipulation):**
- Scans `tbody tr` for transaction rows
- Colors amount cells:
  - Debit → `color: #dc2626` (red)
  - Credit → `color: #16a34a` (green)
  - Balance → `color: #d97706` (amber)
- Extracts totals from colspan summary row

**Styling:** `public/Academic/Financials.css`
```
Summary cards: flex, equal widths, rounded-xl, shadow
Table: alternating row bg, amount color-coding
```

---

### `DropApplication.jsx`

**URL:** `/Student/Drop*`  
**DOM Target:** `#main-content`

**What it adds:**
- Parses refund % from `.alert.alert-warning` badge text
- Injects `DropHeader` component above the drop form

**DropHeader component:**
```
"Current Refund: X%"  (green if X > 0, red if X = 0)
```

**CSS Injection (no React):**
- Styles the Angular-rendered course list with card layout
- Adds colored badges per course status
- Styles submit/cancel buttons

**Styling:** `public/Academic/DropApplication.css`

---

## 9. Grade Components

### `carriculum_grade_report.jsx`

**URL:** `/Student/Grade/CurriculumGradeReport*`  
**DOM Target:** Read-only (parses data, no visual output)

**Data Parsed:**
- Term headers: GPA, credit summary (total earned, registered, etc.)
- All course rows: code, name, semester taken, grade, credit, status
- Prerequisite info from `CSE.json`
- Course states: `not-done` | `ongoing` | `withdrawn` | `done`

**Storage Output → `chrome.storage.local.aiubGraphData.curriculum`:**
```json
{
  "courses": [
    {
      "code": "CSE 101",
      "name": "Intro to Programming",
      "credits": 3,
      "grade": "A+",
      "semester": "Spring 2023",
      "status": "done",
      "prerequisites": ["None"]
    }
  ],
  "terms": [...],
  "metrics": {
    "totalCredits": 120,
    "completedCredits": 90,
    "cgpa": 3.75
  }
}
```

---

### `carriculum_grade_semester.jsx`

**URL:** `/Student/Grade/SemesterGradeReport*`  
**DOM Target:** Read-only parser

**Data Parsed (per semester block):**
- Semester name, GPA, CGPA, ECR (earned credit), TGP
- Per course: ClassID, name, credit hours, midterm grade, final grade, overall grade, status, print notes
- Status classification: `done` | `ongoing` | `withdrawn` | `failed`
- Maintains arrays of grades across all semesters for trend analysis

**Storage Output → `chrome.storage.local.aiubGraphData.semester`:**
```json
{
  "semesters": [
    {
      "name": "Spring 2023",
      "gpa": 3.80,
      "cgpa": 3.75,
      "credits": 15,
      "courses": [...]
    }
  ],
  "summary": {
    "totalSemesters": 8,
    "latestCGPA": 3.75,
    "gradeHistory": ["A+", "A", "B+", ...]
  }
}
```

---

### `Graphs.jsx`

**URL:** `public/Grade/Graphs.html` (opened as a tab from sidebar)  
**Data Source:** `chrome.storage.local.aiubGraphData`

**Charts (all use Recharts):**

| # | Chart | Type | Data |
|---|-------|------|------|
| 1 | Grade Distribution | Donut (PieChart) | Count per letter grade |
| 2 | Status Split | Pie | Completed / Ongoing / Withdrawn / N/A |
| 3 | Prerequisite Unlock Ratio | Donut | Unlocked vs locked courses |
| 4 | CGPA Trend | Line | CGPA per semester |
| 5 | Semester GPA Trend | Line | GPA per semester |
| 6 | Credits Per Semester | Bar | Credits registered each semester |
| 7 | Attempt Rate | Line | Repeated course attempts over time |
| 8 | GPA vs Credits | Scatter | Scatter of (credits, gpa) per semester |
| 9 | Credits Earned | Bar | Cumulative earned credits |

**Empty State:** Shown when `aiubGraphData` is null — instructs user to visit grade report pages

**Reload Button:** Calls `chrome.storage.local.get('aiubGraphData', ...)` fresh

---

## 10. Popup (App.jsx)

**File:** `src/App.jsx`  
**Entry:** `index.html` → `src/main.jsx` → `<App />`  
**Width:** 340px fixed

**UI Sections:**

### Header
- Extension name + version
- Gradient background (AIUB blue)

### Toggle Switch
- `chrome.storage.sync.get({ extensionEnabled: true })` on mount
- Toggle → `chrome.storage.sync.set({ extensionEnabled: !current })`
- After toggle: reloads current tab via `chrome.tabs.query + chrome.tabs.reload`

### Feature List (6 items)
1. Smart course filtering with clash detection
2. Live class schedule with countdown timers
3. Grade visualization and GPA graphs
4. Financial summary cards
5. Curriculum with prerequisites
6. Drop course with refund percentage

### Footer
- Link: `rijoan.com` (developer)
- Version badge

---

## 11. Grade Graphs Dashboard

**File:** `public/Grade/Graphs.html`  
**Script:** `public/Grade/Graphs.js`  
**Chart Lib:** `public/Grade/chart.umd.js` (Recharts UMD build)  
**Styles:** `public/Grade/Graphs.css`

**Opened from:** Sidebar nav item injected by `Sidebar.jsx`

**Layout:**
```
Hero Section (gradient teal → blue → purple)
  └── KPI Row: Total Courses, Completed, CGPA, Latest GPA

Chart Grid (2 columns, responsive)
  ├── Grade Distribution (donut)
  ├── Status Split (pie)
  ├── CGPA Trend (line)
  ├── Semester GPA (line)
  ├── Credits Per Semester (bar)
  ├── Attempt Rate (line)
  ├── GPA vs Credits (scatter)
  └── Credits Earned (bar)

Empty State (when no data)
  └── "Visit Curriculum Grade Report to sync data" + button
```

**CSS Variables in `Graphs.css`:**
```css
--bg-a: #0f172a     (dark bg)
--bg-b: #1e293b     (card bg)
--bg-c: #334155     (hover)
--ink:  #f1f5f9     (primary text)
--muted: #94a3b8    (secondary text)
--accent: #38bdf8   (highlight)
```

---

## 12. CSS Files — Page by Page

### `public/styles.css` — Offered Courses Filter UI

This is the largest CSS file. It styles a completely custom filter panel injected over the AIUB offered courses page.

**Sections:**

| Selector | Purpose |
|----------|---------|
| `#aiub-filter-panel` | Main filter panel — blue gradient header, shadow, rounded |
| `.aiub-filter-badge` | Course count badges (total / filtered) |
| `.aiub-filter-input` | Search input — rounded, light blue bg, focus blue border |
| `.aiub-day-btn` | Day toggle buttons — active state: blue gradient |
| `.aiub-status-btn` | Status toggles — colors: green/blue/red/purple/grey per type |
| `.aiub-time-range` | Time range selector |
| `#aiub-results-container` | Results table — blue header, alternating row colors, hover highlight |
| `.aiub-status-badge` | Seat status chips: green (available), red (full) |
| `.aiub-slot` | Schedule slot rows — gray left border |
| `.aiub-pagination` | Page navigation |
| `#aiub-selected-panel` | Selected courses panel — green header gradient |
| `.aiub-course-card` | Course card in selected panel — grid layout, remove button |
| `.aiub-routine-grid` | Timetable grid — day columns, hour rows, dashed lines |
| `.aiub-routine-event` | Event block in timetable — course name, section, time, room |
| `.aiub-modal-overlay` | Full-screen modal for timetable view |

---

### `public/Home/ClassSchedule.css`

```
.sched-day-group     — Day section with blue left border
.sched-day-badge     — Date chip (blue pill)
.sched-entry         — Class card (white, left border, shadow)
.sched-time          — Time text (gray, small)
.sched-room          — Room badge (gray pill)
.sched-timer-badge   — Status chip
  .upcoming          — Blue (#eff6ff bg)
  .active            — Green (#dcfce7) + pulse animation
  .ended             — Gray (#f1f5f9)
@keyframes sched-pulse     — opacity 1 → 0.4 → 1
@keyframes sched-dot-ping  — glow scale 1 → 1.6
```

---

### `public/Home/Intro.css`

Minimal. Styles the greeting header block above `#main-content`.

---

### `public/Shared/Sidebar.css`

```
.aiub-sidebar-profile    — Blue gradient profile card at top of sidebar
.aiub-sidebar-nav        — Enhanced nav list
.aiub-nav-item           — Flex row, hover bg transition
.aiub-nav-item.active    — Blue left border (4px), blue text, blue icon
.aiub-graphs-link        — Special "Graphs" nav item (teal accent)
```

---

### `public/Academic/CourseAndResults.css`

```
.car-course-card        — Main course header card (gradient blue → indigo)
.car-final-block        — Frosted glass grade box (right side)
.car-term-card          — Collapsible term section
  .car-midterm          — Blue gradient header (blue-500 → blue-700)
  .car-finalterm        — Violet gradient header (violet-500 → indigo-700)
.car-term-head          — Clickable header row
.car-term-body          — Collapsible content (blue-50 / violet-50 bg)
.car-section-card       — Section accordion (white, colored left border)
.car-sub-row            — Sub-item row (white card, hover color)
.car-section-score      — Bold score (blue/violet per term)
```

---

### `public/Academic/Registration.css`

```
.reg-course-card        — Course card (white, rounded, blue left border)
.reg-schedule-row       — Schedule line (time + room)
.reg-type-badge         — Theory (blue) / Lab (green) pill
.reg-dropped            — Red text overlay for dropped courses
.reg-fee-panel          — Sticky fee sidebar (white card)
.reg-fee-row            — Fee line item
.reg-credit-chip        — Credit stat pill (colored by state)
```

---

### `public/Academic/Financials.css`

```
.fin-summary-row        — Flex container for 3 KPI cards
.fin-card               — Individual card (white, shadow, icon, amount)
  .fin-card.charged      — Red/orange accent
  .fin-card.paid         — Green accent
  .fin-card.due          — Blue accent
```

---

### `public/Academic/DropApplication.css`

```
.drop-header            — Refund % banner at top
.drop-refund-badge      — Pill chip (green if >0, red if 0)
.drop-course-card       — Course list card (white, rounded)
.drop-status-badge      — Status color per drop type
```

---

### `public/Academic/MkCurriculumn.css`

Minimal. Styles the injected prerequisite column cell in the curriculum table.

---

### `public/Grade/carriculum_grade_report.css`

Styling for the grade report page overlay (grade status badges, enhanced table).

---

### `public/Grade/carriculum_grade_semester.css`

Styling for semester grade blocks:
```
Semester header: blue gradient strip with GPA badge
Course rows: alternating, color-coded grade cells
Status badges: done (green), ongoing (blue), withdrawn (gray), failed (red)
```

---

## 13. Data Storage

### `chrome.storage.sync`

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `extensionEnabled` | `boolean` | `true` | Master on/off toggle. Persists across Chrome profiles. |

### `chrome.storage.local`

| Key | Type | Description |
|-----|------|-------------|
| `aiubGraphData` | `object` | Grade analytics cache. Populated by visiting grade report pages. |
| `aiubGraphData.ts` | `string` | ISO timestamp of last sync |
| `aiubGraphData.curriculum` | `object` | Data from CurriculumGradeReport page |
| `aiubGraphData.semester` | `object` | Data from SemesterGradeReport page |

### `localStorage` (page-level)

| Key | Description |
|-----|-------------|
| `__aiubPortalEnabled` | Mirrored from chrome.storage.sync by `contentBridge.jsx` for synchronous access |

---

## 14. Static Data (CSE.json)

**Path:** `public/Academic/CSE.json`  
**Loaded by:** `MkCurriculumn.jsx` and `carriculum_grade_report.jsx`  
**Fetched via:** `chrome.runtime.getURL('Academic/CSE.json')` → `fetch()`

**Schema (per entry):**
```json
{
  "code": "CSE 101",
  "name": "Introduction to Programming",
  "credits": 3,
  "prerequisites": ["None"]
}
```
or:
```json
{
  "code": "CSE 301",
  "name": "Data Structures",
  "credits": 3,
  "prerequisites": ["CSE 101", "CSE 201"]
}
```

**Used for:**
- Injecting prerequisite column into curriculum table
- Enriching grade report data with prerequisite chains
- Calculating prerequisite unlock ratios for graph

---

## 15. Build & Scripts

```bash
npm run dev          # Vite dev server with HMR (for popup development)
npm run build        # Production build → /dist (full extension)
npm run build:popup  # Standalone popup-only build
npm run watch:popup  # Watch mode for popup changes
npm run lint         # ESLint validation
npm run preview      # Preview production build locally
```

**Build output (`/dist`):**
- `manifest.json` (processed)
- `index.html` (popup)
- `graphs.html` (grade dashboard)
- JS bundles per entry point (split chunks)
- All CSS (Tailwind purged + PostCSS processed)
- Static assets (`aiub.jpg`, `icons.svg`, `CSE.json`, etc.)

**To install unpacked:**
1. `npm run build`
2. Chrome → `chrome://extensions` → Load unpacked → select `/dist`

---

## 16. Key Patterns & Utilities

### DOM Mounting Pattern (all components)
```js
(function mount() {
  if (window.__aiubXxxMounted) return;
  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;
    function init() {
      const target = document.querySelector('...');
      if (!target) { setTimeout(init, 200); return; }
      if (window.__aiubXxxMounted) return;
      window.__aiubXxxMounted = true;
      // clear target, mount React
      target.innerHTML = '';
      const root = document.createElement('div');
      target.appendChild(root);
      createRoot(root).render(<Component />);
    }
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', init)
      : init();
  });
})();
```

### String Normalizers
```js
normCode(s)  // remove spaces, uppercase → "CSE101"
norm(s)      // trim + lowercase → "data structures"
```

### Time Parser
```js
parseTimePart("MON 08:00 AM - 09:30 AM")
// → { day: "MON", startH: 8, startM: 0, endH: 9, endM: 30 }
```

### Grade Colors
```js
const GRADE_COLORS = {
  'A+': '#059669', A: '#10b981', 'B+': '#2563eb', B: '#3b82f6',
  'C+': '#d97706', C:  '#f59e0b', 'D+': '#dc2626', D: '#ef4444',
   F:  '#991b1b',  W: '#6b7280', UW: '#6b7280', '-': '#7c3aed',
}
```

### Chart Color Palette (Graphs.jsx)
```js
GPA ≥ 3.5 → #22c55e (green)
GPA ≥ 3.0 → #3b82f6 (blue)
GPA ≥ 2.5 → #f59e0b (amber)
GPA  < 2.5 → #ef4444 (red)
```

---

## 17. Feature Summary Table

| Feature | Page URL | Component | Status |
|---------|----------|-----------|--------|
| Extension toggle | Popup | `App.jsx` | ✅ Working |
| Sidebar profile + nav | All `/Student*` | `Sidebar.jsx` | ✅ Working |
| Greeting header | `/Student/index` | `Intro.jsx` | ✅ Working |
| Live class schedule | `/Student/index` | `ClassSchedule.jsx` | ✅ Working |
| Registration styling | `/Student/index` | `Registration.jsx` (home) | ✅ Working |
| Offered courses filter | `/Scheduling/OfferedCourses` | `content.jsx` | ⚠️ Placeholder |
| Course & results grades | `/Student/CourseRegistration/Result*` | `CourseAndResults.jsx` | ✅ Working |
| Academic registration | `/Student/CourseRegistration*` | `Registration.jsx` (academic) | ✅ Working |
| Curriculum prerequisites | `/Student/Curriculum*` | `MkCurriculumn.jsx` | ✅ Working |
| Financial summary | `/Student/Financial*` | `Financials.jsx` | ✅ Working |
| Drop + refund % | `/Student/Drop*` | `DropApplication.jsx` | ✅ Working |
| Curriculum grade parser | `/Student/Grade/CurriculumGradeReport*` | `carriculum_grade_report.jsx` | ✅ Working |
| Semester grade parser | `/Student/Grade/SemesterGradeReport*` | `carriculum_grade_semester.jsx` | ✅ Working |
| Grade graphs dashboard | `Grade/Graphs.html` (tab) | `Graphs.jsx` | ✅ Working |

---

*Last updated: 2026-04-17*
