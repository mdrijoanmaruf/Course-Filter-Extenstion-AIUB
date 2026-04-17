(function () {
  'use strict';
  if (window.__aiubHomeEnhanced) return;
  window.__aiubHomeEnhanced = true;

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function titleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  function getStudentName() {
    const el = document.querySelector('.navbar-text .navbar-link small') ||
               document.querySelector('.navbar-text .navbar-link');
    if (!el) return '';
    const raw = el.textContent.trim();
    const parts = raw.split(',').map(s => s.trim());
    if (parts.length >= 2) return titleCase(parts[1]) + ' ' + titleCase(parts[0]);
    return titleCase(raw);
  }
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  function getDateForLabel(text) {
    text = text.trim();
    const now = new Date();
    if (/^today$/i.test(text)) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (/^tomorrow$/i.test(text)) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      d.setDate(d.getDate() + 1);
      return d;
    }
    const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    const m = text.match(/(\d{1,2})-(\w{3})-(\d{4})/);
    if (m) return new Date(parseInt(m[3]), months[m[2]], parseInt(m[1]));
    return null;
  }

  function parseTimePart(str) {
    const m = str.trim().match(/\w+\s+(\d{1,2}):(\d{1,2})\s*(AM|PM)?/i);
    if (!m) return null;
    let h = parseInt(m[1]);
    const min = parseInt(m[2]);
    const period = (m[3] || '').toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return { h, m: min };
  }

  function parseTimeRange(label) {
    const idx = label.indexOf(' - ');
    if (idx === -1) return null;
    const start = parseTimePart(label.substring(0, idx));
    const end   = parseTimePart(label.substring(idx + 3));
    if (!start || !end) return null;
    return { start, end };
  }

  function fmtDuration(ms) {
    const t = Math.floor(ms / 1000);
    const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600);
    const m = Math.floor((t % 3600) / 60), s = t % 60;
    if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
    if (h > 0) return h + 'h ' + m + 'm ' + s + 's';
    if (m > 0) return m + 'm ' + s + 's';
    return s + 's';
  }

  function updateTimers() {
    const now = Date.now();
    document.querySelectorAll('.hom-timer[data-start]').forEach(el => {
      const start = parseInt(el.dataset.start);
      const end   = parseInt(el.dataset.end);
      if (!start || !end) return;
      const txt = el.querySelector('.hom-timer-text');
      el.classList.remove('hom-timer-upcoming','hom-timer-active','hom-timer-ended');
      if (now >= end) {
        el.classList.add('hom-timer-ended');
        txt.textContent = 'Ended';
      } else if (now >= start) {
        el.classList.add('hom-timer-active');
        txt.textContent = 'In Progress \u00B7 ' + fmtDuration(end - now) + ' left';
      } else {
        el.classList.add('hom-timer-upcoming');
        txt.textContent = 'Starts in ' + fmtDuration(start - now);
      }
    });
  }

  const CSS = `<style id="hom-style">

.hom-root-panel { border: none !important; box-shadow: none !important; }
.hom-root-panel > .panel-heading { display: none !important; }
.hom-root-panel > .panel-body { background: transparent !important; border: none !important; padding: 16px 4px !important; }

.hom-page-header { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #f1f5f9; }
.hom-page-title { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 3px; }
.hom-page-title span { color: #2563eb; }
.hom-page-sub { font-size: 13px; color: #6b7280; margin: 0; }

#main-content .alert { border: none !important; border-radius: 10px !important; font-size: 13px !important; padding: 12px 16px !important; box-shadow: 0 1px 4px rgba(0,0,0,.05) !important; margin-bottom: 14px !important; }
#main-content .alert-success { background: #f0fdf4 !important; color: #166534 !important; border-left: 4px solid #22c55e !important; }
#main-content .alert-success a { color: #166534 !important; }
#main-content .alert-success .table-bordered { border-radius: 8px !important; overflow: hidden; border-color: #bbf7d0 !important; }
#main-content .alert-success .table-bordered td { border-color: #bbf7d0 !important; padding: 7px 12px !important; }
#main-content .alert-success .btn-primary { background: linear-gradient(135deg,#1d4ed8,#3b82f6) !important; border: none !important; border-radius: 8px !important; font-weight: 600 !important; }
#main-content .alert-warning { background: #fffbeb !important; color: #92400e !important; border-left: 4px solid #f59e0b !important; }

.hom-actions { border: none !important; box-shadow: none !important; background: transparent !important; margin-bottom: 14px !important; }
.hom-actions > .panel-body { padding: 0 !important; }
.hom-actions .text-center { display: flex; gap: 8px; flex-wrap: wrap; }
.hom-actions .btn { border-radius: 8px !important; font-size: 13px !important; font-weight: 600 !important; padding: 9px 18px !important; border: none !important; box-shadow: 0 1px 4px rgba(0,0,0,.1) !important; transition: transform .12s, box-shadow .12s !important; }
.hom-actions .btn:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,.15) !important; }
.hom-actions .btn-danger { background: linear-gradient(135deg,#dc2626,#ef4444) !important; color: #fff !important; }
.hom-actions .btn-info   { background: linear-gradient(135deg,#0284c7,#38bdf8) !important; color: #fff !important; }

.hom-section-head { font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -.3px; margin: 0 0 12px; padding-bottom: 10px; border-bottom: 2px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.hom-section-head span { color: #2563eb; }

.hom-schedule-panel { border: none !important; box-shadow: none !important; margin-bottom: 20px !important; }
.hom-schedule-panel > .panel-heading { display: none !important; }
.hom-schedule-panel > .panel-body { padding: 0 !important; border: none !important; background: transparent !important; }

.hom-schedule-panel .scheduleTable > .row { border: none !important; margin-bottom: 16px; }
.hom-day-label-col { margin-bottom: 8px; }
.hom-day-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 999px; background: #f1f5f9; color: #475569; text-transform: uppercase; letter-spacing: 0.4px; }
.hom-day-today   .hom-day-badge { background: #1d4ed8; color: #fff; }
.hom-day-tomorrow .hom-day-badge { background: #7c3aed; color: #fff; }

.hom-schedule-panel .scheduleTable .col-md-2 { width: auto !important; float: none !important; padding: 0 0 6px !important; }
.hom-schedule-panel .scheduleTable .col-md-10 { width: 100% !important; float: none !important; display: flex !important; flex-wrap: wrap !important; gap: 10px !important; padding: 0 !important; }
.hom-schedule-panel .scheduleTable .col-md-6 { width: auto !important; float: none !important; }

.hom-class-entry {
  flex: 1; min-width: 230px; max-width: 380px;
  background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px;
  padding: 12px 14px; box-shadow: 0 1px 4px rgba(0,0,0,.04);
  transition: border-color .15s, box-shadow .15s;
}
.hom-class-entry:hover { border-color: #bfdbfe; box-shadow: 0 2px 8px rgba(37,99,235,.08); }
.hom-class-entry > a {
  font-weight: 700; font-size: 13px; color: #111827; text-decoration: none;
  display: block; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hom-class-entry > a:hover { color: #2563eb; }
.hom-class-entry > .hom-time-row { font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
.hom-class-entry > .hom-time-row .hom-time-icon { color: #9ca3af; font-size: 11px; }
.hom-class-entry > .hom-time-row label { font-size: 12px; font-weight: 500; color: #4b5563; margin: 0; }
.hom-class-entry > .hom-room-row { font-size: 11px; color: #9ca3af; margin-bottom: 0; }

.hom-class-entry > .hom-original-info { display: none !important; }

.hom-schedule-panel .scheduleTable .col-md-10 > .col-md-6:not(.hom-class-entry) {
  min-width: auto !important; flex: 0 0 auto !important;
  font-size: 13px !important; color: #9ca3af !important; font-style: italic !important;
  padding: 8px 14px !important; background: none !important; border: none !important;
}

.hom-timer { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; white-space: nowrap; margin-top: 7px; }
.hom-timer-upcoming { background: #dbeafe; color: #1d4ed8; }
.hom-timer-active   { background: #dcfce7; color: #166534; animation: hom-pulse 2s infinite; }
.hom-timer-ended    { background: #f3f4f6; color: #9ca3af; }
.hom-timer-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.hom-timer-upcoming .hom-timer-dot { background: #3b82f6; }
.hom-timer-active   .hom-timer-dot { background: #22c55e; }
.hom-timer-ended    .hom-timer-dot { background: #9ca3af; }
@keyframes hom-pulse { 0%,100%{opacity:1} 50%{opacity:.8} }

.hom-reg-panel { border: none !important; box-shadow: none !important; }
.hom-reg-panel > .panel-heading { background: transparent !important; border: none !important; padding: 0 !important; margin-bottom: 12px !important; }
.hom-reg-panel > .panel-heading .row { display: flex !important; align-items: center !important; justify-content: space-between !important; flex-wrap: wrap !important; gap: 8px !important; margin: 0 !important; }
.hom-reg-panel > .panel-heading .col-md-9,
.hom-reg-panel > .panel-heading .col-md-3 { width: auto !important; float: none !important; padding: 0 !important; }
.hom-reg-panel > .panel-body { padding: 0 !important; }
.hom-reg-panel #SemesterDropDown {
  font-size: 12px; font-weight: 600; color: #334155;
  border: 1px solid #cbd5e1 !important; border-radius: 8px !important; padding: 6px 10px !important;
  background: #f8fafc !important; cursor: pointer; outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.hom-reg-panel #SemesterDropDown:focus { border-color: #93c5fd !important; box-shadow: 0 0 0 3px rgba(59,130,246,.1) !important; }

.StudentCourseList .panel.panel-primary { border: 1px solid #e2e8f0 !important; border-radius: 10px !important; overflow: hidden !important; box-shadow: 0 1px 4px rgba(0,0,0,.04) !important; transition: border-color .15s, box-shadow .15s !important; }
.StudentCourseList .panel.panel-primary:hover { border-color: #bfdbfe !important; box-shadow: 0 2px 8px rgba(37,99,235,.08) !important; }
.StudentCourseList .panel-primary > .panel-heading { display: none !important; }
.StudentCourseList .panel-primary > .panel-body { background: #fff !important; color: #374151 !important; height: auto !important; max-height: none !important; padding: 12px 14px !important; font-size: 13px !important; font-weight: 600; }
.StudentCourseList .panel-primary > .panel-body .label-info    { background: #dbeafe !important; color: #1d4ed8 !important; font-weight: 600; border-radius: 6px; padding: 2px 8px; }
.StudentCourseList .panel-primary > .panel-body .label-success { background: #dcfce7 !important; color: #166534 !important; font-weight: 600; border-radius: 6px; padding: 2px 8px; }
.StudentCourseList .panel-primary > .panel-body .label-danger  { background: #fee2e2 !important; color: #991b1b !important; font-weight: 600; border-radius: 6px; padding: 2px 8px; }
.StudentCourseList .panel-footer { background: #f8fafc !important; border-top: 1px solid #f1f5f9 !important; padding: 9px 14px !important; }
.StudentCourseList .panel-footer .fa { color: #6b7280 !important; margin-right: 4px !important; }
.StudentCourseList .panel-footer a { color: #4b5563 !important; font-size: 12px !important; font-weight: 500 !important; text-decoration: none !important; margin-right: 12px; }
.StudentCourseList .panel-footer a:hover { color: #2563eb !important; }

@media (max-width: 768px) {
  .hom-schedule-panel .scheduleTable .col-md-10 { flex-direction: column !important; }
  .hom-class-entry { min-width: auto !important; max-width: none !important; }
  .hom-page-title { font-size: 18px; }
}
</style>`;

  function enhance() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    document.head.insertAdjacentHTML('beforeend', CSS);

    const contentWrap = mainContent.querySelector('.row > .col-sm-12') ||
                        mainContent.querySelector('.row > .col-xs-12') ||
                        mainContent.querySelector('.row > [class*="col-"]');
    if (contentWrap) {
      const name = getStudentName();
      const firstName = name.split(' ')[0] || 'Student';
      const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      contentWrap.insertAdjacentHTML('afterbegin',
        '<div class="hom-page-header">' +
          '<h2 class="hom-page-title">' + getGreeting() + ', <span>' + escHtml(firstName) + '</span>!</h2>' +
          '<p class="hom-page-sub">' + escHtml(dateStr) + '</p>' +
        '</div>'
      );
    }

    const regBtn = mainContent.querySelector('.text-center .btn-danger');
    if (regBtn) {
      const panel = regBtn.closest('.panel');
      if (panel) panel.classList.add('hom-actions');
    }

    mainContent.querySelectorAll('.panel-heading .panel-title').forEach(title => {
      const txt = title.textContent.trim();
      if (txt === 'Class Schedule') {
        const panel = title.closest('.panel');
        if (panel) { panel.classList.add('hom-schedule-panel'); enhanceSchedule(panel); }
      } else if (txt === 'Registration') {
        const panel = title.closest('.panel');
        if (panel) panel.classList.add('hom-reg-panel');
      }
    });
  }

  function enhanceSchedule(panel) {
    const table = panel.querySelector('.scheduleTable');
    if (!table) return;

    table.insertAdjacentHTML('beforebegin',
      '<div class="hom-section-head">Class <span>Schedule</span></div>'
    );

    table.querySelectorAll(':scope > .row').forEach(row => {
      const dayLabelEl = row.querySelector('.col-md-2 label, .col-xs-12 label');
      const dayText = dayLabelEl ? dayLabelEl.textContent.trim() : '';
      if (/^today$/i.test(dayText)) row.classList.add('hom-day-today');
      else if (/^tomorrow$/i.test(dayText)) row.classList.add('hom-day-tomorrow');

      if (dayLabelEl) {
        dayLabelEl.outerHTML = '<span class="hom-day-badge">' + escHtml(dayText) + '</span>';
      }

      const date = getDateForLabel(dayText);

      row.querySelectorAll('.col-md-10 > .col-md-6').forEach(entry => {
        const link = entry.querySelector('a');
        if (!link) return;
        entry.classList.add('hom-class-entry');

        const infoDiv = entry.querySelector('div');
        if (!infoDiv) return;
        const labels = infoDiv.querySelectorAll('label');
        const timeStr = labels[0] ? labels[0].textContent.trim() : '';
        const roomStr = labels[1] ? labels[1].textContent.trim() : '';

        infoDiv.classList.add('hom-original-info');

        if (timeStr) {
          entry.insertAdjacentHTML('beforeend',
            '<div class="hom-time-row">' +
              '<span class="hom-time-icon glyphicon glyphicon-time"></span>' +
              '<label>' + escHtml(timeStr) + '</label>' +
            '</div>'
          );
        }
        if (roomStr) {
          entry.insertAdjacentHTML('beforeend',
            '<div class="hom-room-row">Room: ' + escHtml(roomStr) + '</div>'
          );
        }

        const timeRange = parseTimeRange(timeStr);
        if (date && timeRange) {
          const startDT = new Date(date);
          startDT.setHours(timeRange.start.h, timeRange.start.m, 0, 0);
          const endDT = new Date(date);
          endDT.setHours(timeRange.end.h, timeRange.end.m, 0, 0);

          const timerDiv = document.createElement('div');
          timerDiv.className = 'hom-timer';
          timerDiv.dataset.start = startDT.getTime();
          timerDiv.dataset.end   = endDT.getTime();
          timerDiv.innerHTML = '<span class="hom-timer-dot"></span><span class="hom-timer-text"></span>';
          entry.appendChild(timerDiv);
        }
      });
    });

    updateTimers();
    setInterval(updateTimers, 1000);
  }

  function tryEnhance() {
    if (document.getElementById('main-content')) {
      enhance();
    } else {
      setTimeout(tryEnhance, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryEnhance);
  } else {
    tryEnhance();
  }
})();
