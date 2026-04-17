(function () {
  'use strict';
  if (window.__aiubScheduleEnhanced) return;
  window.__aiubScheduleEnhanced = true;

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

  function fmtDate(d) {
    if (!d) return '';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  function updateTimers() {
    const now = Date.now();
    const clockEl = document.getElementById('sched-live-clock');
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    document.querySelectorAll('.sched-timer[data-start]').forEach(el => {
      const start = parseInt(el.dataset.start);
      const end   = parseInt(el.dataset.end);
      if (!start || !end) return;
      const txt  = el.querySelector('.sched-timer-text');
      const card = el.closest('.sched-class-entry');
      el.classList.remove('sched-timer-upcoming','sched-timer-active','sched-timer-ended');
      if (card) card.classList.remove('sched-state-active','sched-state-ended');
      if (now >= end) {
        el.classList.add('sched-timer-ended');
        if (card) card.classList.add('sched-state-ended');
        txt.textContent = 'Ended';
      } else if (now >= start) {
        el.classList.add('sched-timer-active');
        if (card) card.classList.add('sched-state-active');
        txt.textContent = 'In Progress \u00B7 ' + fmtDuration(end - now) + ' left';
      } else {
        el.classList.add('sched-timer-upcoming');
        txt.textContent = 'Starts in ' + fmtDuration(start - now);
      }
    });
  }

  function enhance() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.querySelectorAll('.panel-heading .panel-title').forEach(title => {
      if (title.textContent.trim() === 'Class Schedule') {
        const panel = title.closest('.panel');
        if (panel) { panel.classList.add('sched-schedule-panel'); enhanceSchedule(panel); }
      }
    });
  }

  function enhanceSchedule(panel) {
    const table = panel.querySelector('.scheduleTable');
    if (!table) return;

    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    table.insertAdjacentHTML('beforebegin',
      '<div class="intro-banner">' +
        '<div class="intro-banner-left">' +
          '<p class="intro-greeting">' + escHtml(getGreeting()) + '</p>' +
          '<span class="intro-date">' + escHtml(dateStr) + '</span>' +
        '</div>' +
        '<div class="intro-banner-badge">' +
          '<span class="intro-banner-badge-label">Current Time</span>' +
          '<span class="intro-banner-badge-value" id="sched-live-clock">' + escHtml(timeStr) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="sched-section-head">Class <span>Schedule</span></div>'
    );

    table.querySelectorAll(':scope > .row').forEach(row => {
      const dayLabelEl = row.querySelector('.col-md-2 label, .col-xs-12 label');
      const dayText    = dayLabelEl ? dayLabelEl.textContent.trim() : '';
      const isToday    = /^today$/i.test(dayText);
      const isTomorrow = /^tomorrow$/i.test(dayText);
      const date       = getDateForLabel(dayText);

      const entries = [];
      row.querySelectorAll('.col-md-10 > .col-md-6').forEach(entry => {
        const link = entry.querySelector('a');
        if (!link) return;
        const infoDiv = entry.querySelector('div');
        const labels  = infoDiv ? infoDiv.querySelectorAll('label') : [];
        entries.push({
          href:    link.getAttribute('href') || '#',
          name:    link.textContent.trim(),
          timeStr: labels[0] ? labels[0].textContent.trim() : '',
          roomStr: labels[1] ? labels[1].textContent.trim() : ''
        });
      });

      const groupClass = 'sched-day-group' +
        (isToday    ? ' sched-day-today'    : '') +
        (isTomorrow ? ' sched-day-tomorrow' : '');

      const countText = entries.length > 0
        ? entries.length + ' class' + (entries.length > 1 ? 'es' : '')
        : 'No class';

      const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dayText;
      const dateFull  = (!isToday && !isTomorrow) ? fmtDate(date) : '';

      const group = document.createElement('div');
      group.className = groupClass;

      group.innerHTML =
        '<div class="sched-day-header">' +
          '<span class="sched-day-badge">' +
            '<span class="sched-day-dot"></span>' +
            escHtml(dateLabel) +
          '</span>' +
          (dateFull ? '<span class="sched-day-date-full">' + escHtml(dateFull) + '</span>' : '') +
          '<span class="sched-day-count">' + escHtml(countText) + '</span>' +
        '</div>';

      if (entries.length === 0) {
        const noDiv = document.createElement('div');
        noDiv.className = 'sched-no-class';
        noDiv.textContent = 'No classes scheduled for this day';
        group.appendChild(noDiv);
      } else {
        const wrap = document.createElement('div');
        wrap.className = 'sched-cards-wrap';

        entries.forEach(e => {
          const timeRange = parseTimeRange(e.timeStr);
          let startMs = null, endMs = null;
          if (date && timeRange) {
            const s = new Date(date); s.setHours(timeRange.start.h, timeRange.start.m, 0, 0);
            const n = new Date(date); n.setHours(timeRange.end.h,   timeRange.end.m,   0, 0);
            startMs = s.getTime();
            endMs   = n.getTime();
          }

          const card = document.createElement('div');
          card.className = 'sched-class-entry';
          card.innerHTML =
            '<a class="sched-course-name" href="' + escHtml(e.href) + '" title="' + escHtml(e.name) + '">' +
              escHtml(e.name) +
            '</a>' +
            '<div class="sched-meta">' +
              (e.timeStr
                ? '<span class="sched-meta-chip">' +
                    '<span class="sched-meta-icon glyphicon glyphicon-time"></span>' +
                    escHtml(e.timeStr) +
                  '</span>'
                : '') +
              (e.roomStr
                ? '<span class="sched-meta-chip">' +
                    '<span class="sched-meta-icon glyphicon glyphicon-map-marker"></span>' +
                    escHtml(e.roomStr) +
                  '</span>'
                : '') +
            '</div>' +
            (startMs && endMs
              ? '<div class="sched-timer" data-start="' + startMs + '" data-end="' + endMs + '">' +
                  '<span class="sched-timer-dot"></span>' +
                  '<span class="sched-timer-text"></span>' +
                '</div>'
              : '');
          wrap.appendChild(card);
        });
        group.appendChild(wrap);
      }

      row.parentNode.insertBefore(group, row);
      row.classList.add('sched-original-row');
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

  chrome.storage.sync.get({ extensionEnabled: true }, function (r) {
    if (!r.extensionEnabled) return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryEnhance);
    } else {
      tryEnhance();
    }
  });
})();
