# 🎓 AIUB Portal+ Chrome Extension

A comprehensive Chrome extension that enhances every major page of the AIUB Student Portal — advanced course filtering, live class schedule timers, grade visualization, financial summaries, curriculum tracking, and a redesigned global navigation sidebar.

## ✨ Features

### 🏠 Home & Dashboard
- **Personalized Greeting** — "Good Morning/Afternoon/Evening, [Name]" with current date
- **Live Class Schedule** — Today's and tomorrow's classes with real-time countdown timers ("Starts in X min", "In Progress · X min left", "Ended")
- **Smart Schedule Page** — Dedicated schedule view grouped by day with live clock and color-coded day badges
- **Registration Panel** — Styled semester selector with enrolled course list and fee summary

### 🔍 Offered Courses (Course Filter)
- **Advanced Search** — Filter courses by name, Class ID, or title in real-time
- **Status Filter** — Toggle Open, Freshman, Sophomore, Junior, Senior, Closed, Reserved (multi-select)
- **Day of Week Filter** — Select preferred class days (Sun–Thu)
- **Time Range Filter** — Set class start time window (8 AM to 6 PM, 10-minute increments)
- **All Courses at Once** — Loads all 250+ offered courses, bypassing portal pagination
- **Clash Detection** — Highlights time conflicts when selecting multiple course sections
- **Routine Builder** — Color-assigns courses and links related sections (lecture + lab)
- **Paginated Results** — Custom results table with configurable page size (10/25/50/100)

### 📚 Academic Pages
- **Course Results** — Per-course grade breakdown by term (Midterm/Final), sections, and sub-items with color-coded letter grades
- **Curriculum View** — Core and Elective course categories with expandable modals, credit/prerequisite info
- **Drop Application** — Visual refund badge, drop deadline status, enrollment status per course
- **Registration** — Course cards with schedule, room, credit chips, fee assessment sidebar (charges, payments, balance)
- **Financials** — Summary cards (Total Charged / Total Paid / Balance Due), full transaction table with color-coded rows and assessment detail modals

### 📊 Grade Reports
- **By Curriculum** — All courses sorted by Core/Elective with semester columns, grade pills, "Not Attempted" tabs, and status legends
- **By Semester** — Expandable semester cards with course tables, GPA per semester, cumulative GPA, midterm/final/total grades, pass/drop/fail/ongoing status badges

### 🗂️ Global Sidebar (All Pages)
- **Student Profile Block** — Name and ID displayed at the top of the sidebar
- **Active Link Highlighting** — Current page link auto-highlighted
- **Auto-Expand Navigation** — Relevant section expands automatically based on current page
- **Section Dividers** — Visual separators between navigation groups

### ⚙️ Extension Popup
- **Global Toggle** — Enable/disable the entire extension with one click (reloads current tab)
- **Page Context Status** — Shows which enhancement is active on the current page
- **Feature Overview** — Quick summary of available features

## 🛡️ Safety & Privacy

- **100% Local Processing** — All data processing happens on your device
- **No Data Transmission** — The extension only reads data from your active browser session
- **Open Source** — Full code transparency; anyone can review and audit
- **Portal Read-Only** — The extension never modifies or submits portal data

## 📥 Installation Guide

### Quick Setup (3 minutes)

1. **Download the Extension**
   ```bash
   git clone https://github.com/mdrijoanmaruf/AIUB-Plus-Extenstion.git
   cd "AIUB-Plus-Extenstion"
   ```

2. **Load into Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable **Developer Mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the `Course Filter Extenstion AIUB` folder
   - The extension icon (AIUB logo) will appear in your toolbar

3. **Start Using**
   - Navigate to any page on [AIUB Portal](https://portal.aiub.edu/)
   - Enhancements activate automatically on each supported page 🚀

## 🗺️ Supported Pages

| Page | URL Pattern | Enhancement |
|------|------------|-------------|
| Home / Dashboard | `/Student/Home/*` | Live schedule, greeting, registration panel |
| Offered Courses | `/Student/Section/Offered*` | Full course filter & clash detection |
| Course Results | `/Student/Course?*` | Grade breakdown by term & section |
| Curriculum | `/Student/Curriculum*` | Core/Elective category cards with modals |
| Financial Accounts | `/Student/Accounts*` | Summary cards & transaction table |
| Drop Application | `/Student/Adrop/DropApplication*` | Refund badge & drop status per course |
| Registration | `/Student/Registration?*` | Course cards, credit chips & fee panel |
| Grade Report (Curriculum) | `/Student/GradeReport/ByCurriculum*` | Curriculum-wide grade overview |
| Grade Report (Semester) | `/Student/GradeReport/BySemester*` | Per-semester expandable grade cards |
| All Portal Pages | `/Student*` | Enhanced sidebar with profile block |

## 📦 Project Structure

```
Course Filter Extenstion AIUB/
├── manifest.json              # Extension configuration & permissions
├── content.js                 # Offered Courses filter & clash detection
├── styles.css                 # Offered Courses UI styling
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup toggle & status logic
├── popup.css                  # Popup styling
├── aiub.jpg                   # Extension icon
├── Academic/
│   ├── CourseAndResults.js    # Per-course grade breakdown
│   ├── DropApplication.js     # Drop application UI enhancement
│   ├── Financials.js          # Financial dashboard
│   ├── MkCurriculumn.js       # Curriculum viewer
│   ├── Registration.js        # Registration dashboard
│   └── *.css                  # Matching CSS files for each script
├── Grade/
│   ├── carriculum_grade_report.js   # Grade report by curriculum
│   ├── carriculum_grade_semester.js # Grade report by semester
│   └── *.css
├── Home/
│   ├── ClassSchedule.js       # Dedicated schedule page with live timers
│   ├── Intro.js               # Intro page styling
│   ├── Registration.js        # Registration section styling
│   └── *.css
├── Shared/
│   ├── Sidebar.js             # Global sidebar enhancement
│   ├── contentBridge.js       # Cross-context communication bridge
│   └── *.css
└── README.md
```

## 🔧 Technical Details

- **Manifest Version:** 3 (Chrome's latest standard)
- **JavaScript:** Vanilla JS — zero external dependencies
- **Data Source:** FooTable v3 (portal's pagination library, Offered Courses only)
- **Injection Method:** MAIN world execution for Offered Courses (direct FooTable API access); `document_idle` for all other pages
- **CSS:** Externalized CSS files injected via manifest `content_scripts` — no inline style injection at runtime
- **Storage:** `chrome.storage` for extension on/off toggle state

## 💡 Use Cases

✅ Find all Open sections for a specific course  
✅ Build a clash-free schedule before registration  
✅ Check your CGPA and semester GPA in a clean visual format  
✅ See exactly how much you owe and what's been paid  
✅ Know when your next class starts without opening a calendar  
✅ View your full curriculum progress and remaining courses  
✅ Review drop deadlines and refund percentages at a glance  

## 🐛 Known Limitations

- Requires Chrome/Edge (Chromium-based browsers)
- FooTable-based course data is cached at page load (refresh to update)
- Live timers require an active internet connection to the portal

## 🤝 Contributing

Found a bug? Want to suggest a feature? Feel free to:
1. Open an Issue on GitHub
2. Submit a Pull Request with improvements
3. Share feedback in the comments

## 📋 License

This project is open-source and free to use. No restrictions on personal or educational use.

## ✉️ Support

Have questions? Issues? Feedback?
- **GitHub Issues:** [Create an issue](https://github.com/mdrijoanmaruf/AIUB-Plus-Extenstion/issues)
- **Contact:** Md Rijoan Maruf

---

**Built with ❤️ for AIUB students**

*Last updated: April 2026*
