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
  const m1 = text.match(/(\d{1,2})-(\w{3})-(\d{4})/);
  if (m1) return new Date(parseInt(m1[3]), months[m1[2]], parseInt(m1[1]));
  const m2 = text.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
  if (m2) return new Date(parseInt(m2[3]), months[m2[2]], parseInt(m2[1]));
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
      <div style={{
        marginTop: '10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em' }}>Class ended</span>
      </div>
    );
  }
  if (now >= startTs) {
    return (
      <div style={{
        marginTop: '10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        background: '#dcfce7',
        border: '1px solid #bbf7d0',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
          display: 'inline-block', flexShrink: 0,
          animation: 'pulse 1.5s infinite',
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d', letterSpacing: '0.04em' }}>
          In progress · {fmtDuration(endTs - now)} left
        </span>
      </div>
    );
  }
  return (
    <div style={{
      marginTop: '10px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '20px',
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8', letterSpacing: '0.04em' }}>
        Starts in {fmtDuration(startTs - now)}
      </span>
    </div>
  );
}

function ClassCard({ cls, isToday }) {
  // Soft gradient backgrounds per card type
  const cardBg = isToday
    ? 'linear-gradient(145deg, #eff6ff 0%, #e0f2fe 50%, #f0fdf4 100%)'
    : 'linear-gradient(145deg, #f8fafc 0%, #f0f9ff 50%, #f0fdf4 100%)';
  const accentBar = isToday
    ? 'linear-gradient(90deg, #6366f1, #0ea5e9, #06b6d4)'
    : 'linear-gradient(90deg, #94a3b8, #64748b)';
  const borderColor = isToday ? '#bfdbfe' : '#e2e8f0';

  return (
    <div style={{
      flex: '1 1 220px',
      maxWidth: '320px',
      borderRadius: '14px',
      border: `1.5px solid ${borderColor}`,
      background: cardBg,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s, transform 0.2s',
      boxShadow: isToday ? '0 4px 16px rgba(99,102,241,0.10)' : '0 2px 8px rgba(100,116,139,0.07)',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(14,165,233,0.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isToday ? '0 4px 16px rgba(99,102,241,0.10)' : '0 2px 8px rgba(100,116,139,0.07)'; }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: accentBar }} />

      <div style={{ padding: '14px 16px 16px' }}>
        {/* Course name */}
        <a
          href={cls.href.startsWith('/') ? cls.href : '#'}
          style={{
            display: 'block',
            fontWeight: 700,
            fontSize: 14,
            color: isToday ? '#1e3a5f' : '#1e293b',
            textDecoration: 'none',
            marginBottom: 12,
            lineHeight: 1.4,
            letterSpacing: '-0.01em',
          }}
        >
          {cls.name}
        </a>

        {/* Time */}
        {cls.time && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="6.5" stroke="#60a5fa" strokeWidth="1.5"/>
              <path d="M8 4.5V8l2.5 1.5" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{cls.time}</span>
          </div>
        )}

        {/* Room */}
        {cls.room && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5C12.5 3.515 10.485 1.5 8 1.5z" stroke="#a78bfa" strokeWidth="1.5"/>
              <circle cx="8" cy="6" r="1.5" stroke="#a78bfa" strokeWidth="1.2"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>{cls.room}</span>
          </div>
        )}

        {/* Timer */}
        <ClassTimer startTs={cls.startTs} endTs={cls.endTs} />
      </div>
    </div>
  );
}

function DaySection({ day }) {
  const { isToday, isTomorrow } = day;

  // Dot color for day label
  const dotColor = isToday ? '#6366f1' : isTomorrow ? '#8b5cf6' : '#94a3b8';
  const labelColor = isToday ? '#1e3a5f' : isTomorrow ? '#3b0764' : '#374151';
  const labelSize = 17; // larger text as requested

  return (
    <div style={{
      marginBottom: 22,
      borderRadius: 16,
      overflow: 'hidden',
      border: isToday ? '1.5px solid #c7d2fe' : '1.5px solid #e2e8f0',
      boxShadow: isToday ? '0 4px 20px rgba(99,102,241,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
    }}>

      {/* Day header — no bg color, just a clean bottom border */}
      <div style={{
        padding: '14px 18px 12px',
        background: 'transparent',
        borderBottom: `1.5px solid ${isToday ? '#e0e7ff' : '#f1f5f9'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {/* Dot accent */}
        <span style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: dotColor,
          display: 'inline-block',
          flexShrink: 0,
        }} />

        {/* Day label — larger, colored text, no bg */}
        <span style={{
          fontSize: labelSize,
          fontWeight: 700,
          color: labelColor,
          letterSpacing: '0.01em',
          textTransform: 'capitalize',
          flex: 1,
        }}>
          {day.label}
        </span>

        {/* Today / Tomorrow badge — subtle pill only */}
        {isToday && (
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 20,
            background: '#eef2ff',
            color: '#4f46e5',
            border: '1px solid #c7d2fe',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>Today</span>
        )}
        {isTomorrow && (
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 20,
            background: '#f5f3ff',
            color: '#7c3aed',
            border: '1px solid #ddd6fe',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>Tomorrow</span>
        )}
      </div>

      {/* Cards area — soft gradient bg */}
      <div style={{
        padding: '14px 16px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        background: isToday
          ? 'linear-gradient(160deg, #f8faff 0%, #f0f4ff 100%)'
          : 'linear-gradient(160deg, #fafafa 0%, #f8fafc 100%)',
      }}>
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
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Section title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 14,
        borderBottom: '2px solid #f1f5f9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="17" rx="3" stroke="#6366f1" strokeWidth="1.7"/>
            <path d="M3 9h18" stroke="#6366f1" strokeWidth="1.5"/>
            <path d="M8 2v4M16 2v4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#6366f1"/>
            <rect x="14" y="13" width="3" height="3" rx="0.5" fill="#a5b4fc"/>
          </svg>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
            Class Schedule
          </h3>
        </div>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          padding: '4px 12px',
          borderRadius: 20,
          background: '#eff6ff',
          color: '#1d4ed8',
          border: '1px solid #bfdbfe',
        }}>
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