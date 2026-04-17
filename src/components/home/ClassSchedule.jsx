import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

function getDateForLabel(text) {
  text = text.trim();
  const now = new Date();
  if (/^today$/i.test(text)) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/^tomorrow$/i.test(text)) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() + 1);
    return d;
  }
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const m = text.match(/(\d{1,2})-(\w{3})-(\d{4})/);
  if (m) return new Date(parseInt(m[3]), months[m[2]], parseInt(m[1]));
  return null;
}

function parseTimePart(str) {
  const m = str.trim().match(/\w+\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
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
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400 mt-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
        Ended
      </span>
    );
  }
  if (now >= startTs) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 mt-1.5 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        In Progress · {fmtDuration(endTs - now)} left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
      Starts in {fmtDuration(startTs - now)}
    </span>
  );
}

function ScheduleView({ days }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b-2 border-slate-100">
        <h3 className="text-[16px] font-bold text-slate-900 leading-tight">
          Class <span className="text-blue-600">Schedule</span>
        </h3>
      </div>

      {days.map((day, i) => (
        <div key={i} className="mb-4">
          <div className="mb-2">
            <span className={`inline-block text-[11px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wide ${
              day.isToday
                ? 'bg-blue-600 text-white'
                : day.isTomorrow
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {day.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {day.classes.map((cls, j) => (
              <div
                key={j}
                className="flex-1 min-w-[230px] max-w-sm bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
              >
                <a
                  href={cls.href.startsWith('/') ? cls.href : '#'}
                  className="block font-bold text-[13px] text-slate-900 hover:text-blue-600 mb-1 truncate"
                >
                  {cls.name}
                </a>
                {cls.time && (
                  <div className="flex items-center gap-1 text-[12px] text-slate-500 mb-0.5">
                    <span className="text-slate-400 text-[11px]">🕐</span>
                    <label className="font-medium text-slate-600 m-0">{cls.time}</label>
                  </div>
                )}
                {cls.room && (
                  <div className="text-[11px] text-slate-400">Room: {cls.room}</div>
                )}
                <ClassTimer startTs={cls.startTs} endTs={cls.endTs} />
              </div>
            ))}
          </div>
        </div>
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
