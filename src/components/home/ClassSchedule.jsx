import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

function getDateForLabel(text) {
  text = text.trim();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/^today$/i.test(text)) return today;
  if (/^tomorrow$/i.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  // "DD-Mon-YYYY"
  const m1 = text.match(/(\d{1,2})-(\w{3})-(\d{4})/);
  if (m1) return new Date(parseInt(m1[3]), months[m1[2]], parseInt(m1[1]));
  // "DD Mon YYYY" or "Mon DD, YYYY"
  const m2 = text.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
  if (m2) return new Date(parseInt(m2[3]), months[m2[2]], parseInt(m2[1]));
  // Day-name only (Sun/Mon/…/Sat) — find the next matching weekday from today
  const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const idx = dayNames.findIndex((d) => text.toLowerCase().startsWith(d));
  if (idx !== -1) {
    const diff = (idx - today.getDay() + 7) % 7;
    const d = new Date(today);
    d.setDate(d.getDate() + diff);
    return d;
  }
  return null;
}

function parseTimePart(str) {
  // Accepts "DayName H:M AM/PM", "H:MM AM/PM", or "H:M" (single-digit minutes like "1:0 PM")
  // The optional (?:[a-zA-Z]+\s+)? handles a leading day-name prefix gracefully.
  const m = str.trim().match(/(?:[a-zA-Z]+\s+)?(\d{1,2}):(\d{1,2})\s*(AM|PM)?/i);
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
  const end = parseTimePart(label.substring(idx + 3));
  if (!start || !end) return null;
  return { start, end };
}

function parseScheduleData(panel) {
  const table = panel.querySelector('.scheduleTable');
  if (!table) return [];

  const days = [];
  table.querySelectorAll(':scope > .row').forEach((row) => {
    const dayLabelEl = row.querySelector('.col-md-2 label, .col-xs-12 label');
    const dayText = dayLabelEl ? dayLabelEl.textContent.trim() : '';
    const date = getDateForLabel(dayText);

    const classes = [];
    row.querySelectorAll('.col-md-10 > .col-md-6').forEach((entry) => {
      const link = entry.querySelector('a');
      if (!link) return;
      const infoDiv = entry.querySelector('div');
      if (!infoDiv) return;
      const labels = infoDiv.querySelectorAll('label');
      const timeStr = labels[0] ? labels[0].textContent.trim() : '';
      const roomStr = labels[1] ? labels[1].textContent.trim() : '';

      let startTs = null, endTs = null;
      const timeRange = timeStr ? parseTimeRange(timeStr) : null;
      if (date && timeRange) {
        const s = new Date(date);
        s.setHours(timeRange.start.h, timeRange.start.m, 0, 0);
        const e = new Date(date);
        e.setHours(timeRange.end.h, timeRange.end.m, 0, 0);
        startTs = s.getTime();
        endTs = e.getTime();
      }

      classes.push({ name: link.textContent.trim(), href: link.getAttribute('href') || '#', time: timeStr, room: roomStr, startTs, endTs });
    });

    if (classes.length) {
      days.push({
        label: dayText,
        isToday: /^today$/i.test(dayText),
        isTomorrow: /^tomorrow$/i.test(dayText),
        classes,
      });
    }
  });
  return days;
}

function fmtDuration(ms) {
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60), s = t % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ClassTimer({ startTs, endTs }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!startTs || !endTs) return null;

  if (now >= endTs) {
    return (
      <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100/80 w-fit">
        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block flex-shrink-0" />
        <span className="text-[11px] font-bold text-slate-400 tracking-wide">Class Ended</span>
      </div>
    );
  }
  if (now >= startTs) {
    return (
      <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg w-fit" style={{ background: 'rgba(22,163,74,0.12)' }}>
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0 animate-pulse" />
        <span className="text-[11px] font-bold text-green-700 tracking-wide">
          In Progress &nbsp;·&nbsp; {fmtDuration(endTs - now)} left
        </span>
      </div>
    );
  }
  return (
    <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg w-fit" style={{ background: 'rgba(2,132,199,0.10)' }}>
      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block flex-shrink-0" />
      <span className="text-[11px] font-bold text-blue-700 tracking-wide">
        Starts in {fmtDuration(startTs - now)}
      </span>
    </div>
  );
}

function ClassCard({ cls, isToday }) {
  const cardStyle = isToday
    ? { background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 60%, #e0f2fe 100%)', borderColor: '#93c5fd' }
    : { background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 60%, #f0fdf4 100%)', borderColor: '#bae6fd' };

  return (
    <div
      className="flex-1 min-w-[230px] max-w-sm rounded-2xl border p-0 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
      style={{ ...cardStyle, boxShadow: '0 2px 8px rgba(2,132,199,0.08)' }}
    >
      {/* Top accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: isToday ? 'linear-gradient(90deg,#0284c7,#06b6d4,#6366f1)' : 'linear-gradient(90deg,#38bdf8,#06b6d4)' }}
      />

      <div className="p-3.5">
        {/* Course name */}
        <a
          href={cls.href.startsWith('/') ? cls.href : '#'}
          className="block font-extrabold text-[13px] text-slate-800 hover:text-blue-700 mb-2.5 leading-snug"
          style={{ textDecoration: 'none' }}
        >
          {cls.name}
        </a>

        {/* Time */}
        {cls.time && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-blue-400 text-[12px]">🕐</span>
            <span className="text-[12px] font-semibold text-slate-600">{cls.time}</span>
          </div>
        )}

        {/* Room */}
        {cls.room && (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px]">📍</span>
            <span className="text-[11.5px] font-medium text-slate-500">{cls.room}</span>
          </div>
        )}

        {/* Timer */}
        <ClassTimer startTs={cls.startTs} endTs={cls.endTs} />
      </div>
    </div>
  );
}

function DaySection({ day }) {
  const isToday = day.isToday;
  const isTomorrow = day.isTomorrow;

  return (
    <div className={`mb-5 rounded-2xl overflow-hidden ${isToday ? 'ring-2 ring-blue-300 ring-offset-1' : ''}`}
      style={isToday ? { boxShadow: '0 4px 16px rgba(2,132,199,0.13)' } : {}}>

      {/* Day header */}
      <div
        className="px-4 py-2.5 flex items-center gap-3"
        style={
          isToday
            ? { background: 'linear-gradient(90deg,#0284c7 0%,#0ea5e9 60%,#06b6d4 100%)' }
            : isTomorrow
            ? { background: 'linear-gradient(90deg,#7c3aed,#8b5cf6)' }
            : { background: 'linear-gradient(90deg,#64748b,#94a3b8)' }
        }
      >
        {isToday && <span className="text-[14px]">📅</span>}
        <span className="text-[12px] font-extrabold text-white uppercase tracking-widest">
          {day.label}
        </span>
        {isToday && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
            TODAY
          </span>
        )}
        {isTomorrow && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
            TOMORROW
          </span>
        )}
      </div>

      {/* Cards */}
      <div
        className="p-3 flex flex-wrap gap-2.5"
        style={isToday ? { background: 'rgba(239,246,255,0.6)' } : { background: 'rgba(248,250,252,0.6)' }}
      >
        {day.classes.map((cls, j) => (
          <ClassCard key={j} cls={cls} isToday={isToday} />
        ))}
      </div>
    </div>
  );
}

function ScheduleView({ days }) {
  const totalClasses = days.reduce((s, d) => s + d.classes.length, 0);

  return (
    <div>
      {/* Section title */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-[18px]">🗓️</span>
          <h3 className="text-[17px] font-extrabold text-slate-900 leading-tight m-0">
            Class{' '}
            <span style={{
              background: 'linear-gradient(135deg,#0284c7,#06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Schedule
            </span>
          </h3>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
          {totalClasses} {totalClasses === 1 ? 'class' : 'classes'}
        </span>
      </div>

      {days.map((day, i) => (
        <DaySection key={i} day={day} />
      ))}
    </div>
  );
}

(function mount() {
  if (window.__aiubScheduleMounted) return;

  chrome.storage.sync.get({ extensionEnabled: true }, (r) => {
    if (!r.extensionEnabled) return;

    function tryMount() {
      const mainContent = document.getElementById('main-content');
      if (!mainContent) { setTimeout(tryMount, 200); return; }

      let schedulePanel = null;
      mainContent.querySelectorAll('.panel-heading .panel-title').forEach((title) => {
        if (title.textContent.trim() === 'Class Schedule') {
          schedulePanel = title.closest('.panel');
        }
      });

      if (!schedulePanel) { setTimeout(tryMount, 300); return; }
      if (window.__aiubScheduleMounted) return;
      window.__aiubScheduleMounted = true;

      const days = parseScheduleData(schedulePanel);
      if (!days.length) return;

      const panelHeading = schedulePanel.querySelector('.panel-heading');
      if (panelHeading) panelHeading.style.display = 'none';
      schedulePanel.style.cssText = 'border:none!important;box-shadow:none!important;background:transparent!important';

      const panelBody = schedulePanel.querySelector('.panel-body');
      if (!panelBody) return;
      panelBody.style.cssText = 'padding:0!important;background:transparent!important;border:none!important';
      panelBody.innerHTML = '';

      const container = document.createElement('div');
      panelBody.appendChild(container);
      createRoot(container).render(<ScheduleView days={days} />);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryMount);
    } else {
      tryMount();
    }
  });
})();
