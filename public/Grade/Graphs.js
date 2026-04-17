(function () {
  'use strict';

  const COLORS = {
    'A+': '#059669',
    'A': '#10b981',
    'B+': '#2563eb',
    'B': '#3b82f6',
    'C+': '#d97706',
    'C': '#f59e0b',
    'D+': '#dc2626',
    'D': '#ef4444',
    'F': '#991b1b',
    'W': '#6b7280',
    'Ongoing': '#7c3aed',
    'N/A': '#94a3b8',
    'Completed': '#059669',
    'Attempted': '#0ea5e9',
    'Withdrawn': '#ef4444',
    'Not Attempted': '#94a3b8',
    'Passed': '#059669',
    'Dropped': '#6b7280',
    'Failed': '#991b1b',
    'Locked': '#dc2626',
    'Unlocked': '#16a34a',
    'Credits': '#0369a1',
    'GPA': '#0f766e',
    'CGPA': '#1d4ed8',
    'Unattempted': '#cbd5e1',
  };

  const chartInstances = {};

  const el = {
    emptyState: document.getElementById('emptyState'),
    dashboard: document.getElementById('dashboard'),
    kpiGrid: document.getElementById('kpiGrid'),
    insightsRow: document.getElementById('insightsRow'),
    lastUpdated: document.getElementById('lastUpdated'),
    refreshData: document.getElementById('refreshData'),
    gradeDistributionChart: document.getElementById('gradeDistributionChart'),
    statusDistributionChart: document.getElementById('statusDistributionChart'),
    prerequisiteChart: document.getElementById('prerequisiteChart'),
    cgpaTrendChart: document.getElementById('cgpaTrendChart'),
    semesterGpaChart: document.getElementById('semesterGpaChart'),
    semesterProgressChart: document.getElementById('semesterProgressChart'),
    attemptRateChart: document.getElementById('attemptRateChart'),
    gpaCreditsScatterChart: document.getElementById('gpaCreditsScatterChart'),
    creditsChart: document.getElementById('creditsChart'),
  };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function numberOrZero(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function formatMetric(v) {
    const n = numberOrZero(v);
    if (Math.abs(n % 1) < 0.001) return String(Math.round(n));
    return n.toFixed(1);
  }

  function toPercent(part, total) {
    if (!total) return 0;
    return (numberOrZero(part) / numberOrZero(total)) * 100;
  }

  function compactLabel(label, maxLen) {
    const text = String(label || '').trim();
    if (text.length <= maxLen) return text;
    return text.slice(0, Math.max(1, maxLen - 1)) + '.';
  }

  function formatTimestamp(iso) {
    if (!iso) return 'Open Grade Report pages once to sync your latest data.';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Open Grade Report pages once to sync your latest data.';
    return 'Data last synced: ' + d.toLocaleString();
  }

  function readGraphData() {
    return new Promise(resolve => {
      if (!chrome.storage || !chrome.storage.local) {
        resolve(null);
        return;
      }
      chrome.storage.local.get({ aiubGraphData: null }, res => {
        resolve(res.aiubGraphData || null);
      });
    });
  }

  function setEmptyMode(isEmpty) {
    if (el.emptyState) el.emptyState.hidden = !isEmpty;
    if (el.dashboard) el.dashboard.hidden = isEmpty;
  }

  function renderKpis(curriculum, semester) {
    if (!el.kpiGrid) return;

    const stateCredits = curriculum
      ? (curriculum.stateCredits || curriculum.stateCounts || {})
      : {};
    const passFailCredits = semester
      ? (semester.passFailCredits || semester.passFail || {})
      : {};
    const cgpa = curriculum && curriculum.cgpa > 0
      ? curriculum.cgpa
      : (semester && semester.latestCgpa > 0 ? semester.latestCgpa : 0);
    const totalCredits = numberOrZero((curriculum && curriculum.totalCredits) || (semester && semester.totalCredits));

    const cards = [
      {
        label: 'Student',
        value: curriculum && curriculum.studentName ? curriculum.studentName : (semester && semester.studentName ? semester.studentName : 'Unknown'),
        note: (curriculum && curriculum.studentId) || (semester && semester.studentId) || 'ID unavailable',
      },
      {
        label: 'Program',
        value: (curriculum && curriculum.program) || (semester && semester.program) || 'N/A',
        note: 'Academic profile',
      },
      {
        label: 'CGPA',
        value: cgpa > 0 ? cgpa.toFixed(2) : 'N/A',
        note: 'Latest cumulative GPA',
      },
      {
        label: 'Completed Credits',
        value: formatMetric(stateCredits.completed || passFailCredits.passed),
        note: totalCredits ? ('Out of ' + formatMetric(totalCredits) + ' credits') : 'Earned and passed credits',
      },
      {
        label: 'Ongoing Credits',
        value: formatMetric(stateCredits.ongoing || passFailCredits.ongoing),
        note: 'Credits currently running',
      },
      {
        label: 'Remaining Credits',
        value: formatMetric(stateCredits.notAttempted),
        note: curriculum
          ? ('Locked: ' + formatMetric(curriculum.prerequisite && (curriculum.prerequisite.lockedCredits || curriculum.prerequisite.locked)))
          : 'Curriculum page needed',
      },
    ];

    el.kpiGrid.innerHTML = cards.map(c => `
      <article class="kpi">
        <span class="kpi-label">${esc(c.label)}</span>
        <span class="kpi-value">${esc(c.value)}</span>
        <span class="kpi-note">${esc(c.note)}</span>
      </article>
    `).join('');
  }

  function renderInsights(curriculum, semester) {
    if (!el.insightsRow) return;

    const chips = [];
    if (curriculum && curriculum.prerequisite) {
      const locked = numberOrZero(curriculum.prerequisite.lockedCredits || curriculum.prerequisite.locked);
      const unlocked = numberOrZero(curriculum.prerequisite.unlockedCredits || curriculum.prerequisite.unlocked);
      const total = locked + unlocked;
      const unlockRate = total ? toPercent(unlocked, total).toFixed(1) : '0.0';
      chips.push({ color: COLORS.Unlocked, text: 'Unlock rate ' + unlockRate + '%' });
    }

    if (semester && Array.isArray(semester.semesterGpaTrend) && semester.semesterGpaTrend.length > 1) {
      const first = numberOrZero(semester.semesterGpaTrend[0].gpa);
      const last = numberOrZero(semester.semesterGpaTrend[semester.semesterGpaTrend.length - 1].gpa);
      const delta = (last - first).toFixed(2);
      chips.push({ color: delta >= 0 ? COLORS.Completed : COLORS.Failed, text: 'Semester GPA change ' + (delta >= 0 ? '+' + delta : delta) });
    }

    if (semester && Array.isArray(semester.creditBySemester) && semester.creditBySemester.length) {
      const maxCredits = Math.max.apply(null, semester.creditBySemester.map(p => numberOrZero(p.credits)));
      chips.push({ color: COLORS.Credits, text: 'Peak credit load ' + formatMetric(maxCredits) });
    }

    if (curriculum && (curriculum.stateCredits || curriculum.stateCounts)) {
      const stateSource = curriculum.stateCredits || curriculum.stateCounts;
      const attempted = numberOrZero(stateSource.completed) + numberOrZero(stateSource.ongoing) + numberOrZero(stateSource.withdrawn);
      const totalCredits = numberOrZero(curriculum.totalCredits || curriculum.totalCourses);
      const rate = totalCredits ? toPercent(attempted, totalCredits).toFixed(1) : '0.0';
      chips.push({ color: COLORS.Attempted, text: 'Curriculum credit attempt rate ' + rate + '%' });
    }

    el.insightsRow.innerHTML = chips.map(chip => `
      <span class="insight-chip">
        <span class="insight-dot" style="background:${esc(chip.color)}"></span>
        ${esc(chip.text)}
      </span>
    `).join('');
  }

  function destroyChart(key) {
    const chart = chartInstances[key];
    if (!chart) return;
    chart.destroy();
    delete chartInstances[key];
  }

  function destroyAllCharts() {
    Object.keys(chartInstances).forEach(destroyChart);
  }

  function renderEmptyChart(key, container, message) {
    destroyChart(key);
    if (!container) return;
    container.innerHTML = `<div class="chart-empty">${esc(message)}</div>`;
  }

  function createChartCanvas(container, height) {
    container.innerHTML = `<div class="chartjs-holder" style="height:${height}px"><canvas></canvas></div>`;
    return container.querySelector('canvas');
  }

  function categoryTickCallback(maxLen) {
    return function (value, index, ticks) {
      const raw = ticks[index] && ticks[index].label ? ticks[index].label : String(value);
      return compactLabel(raw, maxLen || 14);
    };
  }

  function basePluginOptions() {
    return {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: '#334155',
          usePointStyle: true,
          boxWidth: 10,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (ctx) {
            const v = numberOrZero(ctx.parsed && (ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed));
            return (ctx.dataset.label ? ctx.dataset.label + ': ' : '') + formatMetric(v);
          },
        },
      },
    };
  }

  function renderChart(key, container, config, height, fallbackText) {
    if (!container) return;
    if (typeof Chart === 'undefined') {
      renderEmptyChart(key, container, fallbackText || 'Chart.js failed to load.');
      return;
    }

    destroyChart(key);
    const canvas = createChartCanvas(container, height || 300);
    const ctx = canvas.getContext('2d');
    chartInstances[key] = new Chart(ctx, config);
  }

  function renderBarChart(key, container, series, fallbackText) {
    if (!series || !series.length) {
      renderEmptyChart(key, container, fallbackText);
      return;
    }

    renderChart(key, container, {
      type: 'bar',
      data: {
        labels: series.map(s => s.label),
        datasets: [{
          label: 'Credits',
          data: series.map(s => numberOrZero(s.value)),
          backgroundColor: series.map(s => s.color || '#0369a1'),
          borderRadius: 8,
          maxBarThickness: 42,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 420 },
        plugins: basePluginOptions(),
        scales: {
          x: {
            ticks: { color: '#64748b', callback: categoryTickCallback(16) },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#64748b' },
            grid: { color: '#e2e8f0' },
          },
        },
      },
    }, 300, fallbackText);
  }

  function renderLineChart(key, container, points, fallbackText, options) {
    if (!points || points.length < 2) {
      renderEmptyChart(key, container, fallbackText);
      return;
    }

    const cfg = Object.assign({
      maxY: 4,
      stroke: '#0f766e',
      point: '#0f766e',
      label: 'GPA',
      smooth: 0.32,
    }, options || {});

    renderChart(key, container, {
      type: 'line',
      data: {
        labels: points.map(p => p.label),
        datasets: [{
          label: cfg.label,
          data: points.map(p => numberOrZero(p.value)),
          borderColor: cfg.stroke,
          backgroundColor: cfg.stroke + '22',
          pointBackgroundColor: cfg.point,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 2.7,
          fill: false,
          tension: cfg.smooth,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 420 },
        plugins: basePluginOptions(),
        scales: {
          x: {
            ticks: { color: '#64748b', callback: categoryTickCallback(18) },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            suggestedMax: cfg.maxY,
            max: cfg.maxY,
            ticks: { color: '#64748b' },
            grid: { color: '#e2e8f0' },
          },
        },
      },
    }, 300, fallbackText);
  }

  function renderGroupedBarChart(key, container, groups, fallbackText) {
    if (!groups || !groups.length) {
      renderEmptyChart(key, container, fallbackText);
      return;
    }

    renderChart(key, container, {
      type: 'bar',
      data: {
        labels: groups.map(g => g.label),
        datasets: [
          {
            label: 'Attempted Credits',
            data: groups.map(g => numberOrZero(g.attempted)),
            backgroundColor: COLORS.Attempted,
            borderRadius: 7,
            maxBarThickness: 36,
          },
          {
            label: 'Completed Credits',
            data: groups.map(g => numberOrZero(g.completed)),
            backgroundColor: COLORS.Completed,
            borderRadius: 7,
            maxBarThickness: 36,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 420 },
        plugins: basePluginOptions(),
        scales: {
          x: {
            ticks: { color: '#64748b', callback: categoryTickCallback(14) },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#64748b' },
            grid: { color: '#e2e8f0' },
          },
        },
      },
    }, 320, fallbackText);
  }

  function renderDonutChart(key, container, parts, fallbackText) {
    if (!parts || !parts.length) {
      renderEmptyChart(key, container, fallbackText);
      return;
    }

    const total = parts.reduce((sum, p) => sum + numberOrZero(p.value), 0);
    if (!total) {
      renderEmptyChart(key, container, fallbackText);
      return;
    }

    renderChart(key, container, {
      type: 'doughnut',
      data: {
        labels: parts.map(p => p.label),
        datasets: [{
          label: 'Credits',
          data: parts.map(p => numberOrZero(p.value)),
          backgroundColor: parts.map(p => p.color),
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: basePluginOptions().legend,
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const v = numberOrZero(ctx.parsed);
                const pct = total ? ((v / total) * 100).toFixed(1) : '0.0';
                return ctx.label + ': ' + formatMetric(v) + ' credits (' + pct + '%)';
              },
            },
          },
        },
      },
    }, 300, fallbackText);
  }

  function renderAttemptRateChart(key, container, rows, fallbackText) {
    if (!rows || !rows.length) {
      renderEmptyChart(key, container, fallbackText);
      return;
    }

    const completedPct = rows.map(row => Math.max(0, Math.min(100, toPercent(row.completed, row.total))));
    const attemptedPct = rows.map(row => Math.max(0, Math.min(100, toPercent(row.attempted, row.total))));
    const inProgressPct = attemptedPct.map((a, i) => Math.max(0, a - completedPct[i]));
    const unattemptedPct = attemptedPct.map(a => Math.max(0, 100 - a));

    renderChart(key, container, {
      type: 'bar',
      data: {
        labels: rows.map(r => r.label),
        datasets: [
          { label: 'Completed %', data: completedPct, backgroundColor: COLORS.Completed, stack: 'rate' },
          { label: 'Attempted Not Completed %', data: inProgressPct, backgroundColor: COLORS.Attempted, stack: 'rate' },
          { label: 'Unattempted %', data: unattemptedPct, backgroundColor: COLORS.Unattempted, stack: 'rate' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        animation: { duration: 420 },
        plugins: basePluginOptions(),
        scales: {
          x: {
            stacked: true,
            min: 0,
            max: 100,
            ticks: {
              color: '#64748b',
              callback: function (v) { return v + '%'; },
            },
            grid: { color: '#e2e8f0' },
          },
          y: {
            stacked: true,
            ticks: { color: '#64748b', callback: categoryTickCallback(16) },
            grid: { display: false },
          },
        },
      },
    }, Math.max(280, rows.length * 50), fallbackText);
  }

  function renderScatterChart(key, container, points, fallbackText) {
    if (!points || points.length < 2) {
      renderEmptyChart(key, container, fallbackText);
      return;
    }

    renderChart(key, container, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Semester',
          data: points.map(p => ({ x: numberOrZero(p.x), y: numberOrZero(p.y), label: p.label })),
          pointBackgroundColor: 'rgba(30, 64, 175, 0.72)',
          pointBorderColor: '#1e40af',
          pointBorderWidth: 1.2,
          pointRadius: function (ctx) {
            const raw = ctx.raw || { x: 0 };
            return 4 + Math.min(7, numberOrZero(raw.x) / 4);
          },
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 420 },
        plugins: {
          legend: basePluginOptions().legend,
          tooltip: {
            callbacks: {
              title: function (items) {
                const raw = items[0] && items[0].raw;
                return raw && raw.label ? raw.label : 'Semester';
              },
              label: function (ctx) {
                return 'Credits ' + formatMetric(ctx.raw.x) + ', GPA ' + numberOrZero(ctx.raw.y).toFixed(2);
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: 'Credits Earned', color: '#64748b' },
            ticks: { color: '#64748b' },
            grid: { color: '#e2e8f0' },
          },
          y: {
            min: 0,
            max: 4,
            title: { display: true, text: 'Semester GPA', color: '#64748b' },
            ticks: { color: '#64748b' },
            grid: { color: '#e2e8f0' },
          },
        },
      },
    }, 320, fallbackText);
  }

  function gradeDistributionData(curriculum) {
    if (!curriculum || !curriculum.gradeDistribution) return [];
    const order = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'W', 'Ongoing', 'N/A'];
    const dist = curriculum.gradeDistribution;
    const used = new Set();
    const out = [];

    order.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(dist, key)) {
        out.push({ label: key, value: numberOrZero(dist[key]), color: COLORS[key] || '#0369a1' });
        used.add(key);
      }
    });

    Object.keys(dist).forEach(key => {
      if (used.has(key)) return;
      out.push({ label: key, value: numberOrZero(dist[key]), color: COLORS[key] || '#0369a1' });
    });

    return out;
  }

  function statusDistributionData(curriculum, semester) {
    if (curriculum && (curriculum.stateCredits || curriculum.stateCounts)) {
      const state = curriculum.stateCredits || curriculum.stateCounts;
      return [
        { label: 'Completed Credits', value: numberOrZero(state.completed), color: COLORS.Completed },
        { label: 'Ongoing Credits', value: numberOrZero(state.ongoing), color: COLORS.Ongoing },
        { label: 'Withdrawn Credits', value: numberOrZero(state.withdrawn), color: COLORS.Withdrawn },
        { label: 'Not Attempted Credits', value: numberOrZero(state.notAttempted), color: COLORS['Not Attempted'] },
      ];
    }

    if (semester && (semester.passFailCredits || semester.passFail)) {
      const status = semester.passFailCredits || semester.passFail;
      return [
        { label: 'Passed Credits', value: numberOrZero(status.passed), color: COLORS.Passed },
        { label: 'Ongoing Credits', value: numberOrZero(status.ongoing), color: COLORS.Ongoing },
        { label: 'Dropped Credits', value: numberOrZero(status.dropped), color: COLORS.Dropped },
        { label: 'Failed Credits', value: numberOrZero(status.failed), color: COLORS.Failed },
      ];
    }

    return [];
  }

  function gpaTrendData(semester) {
    if (!semester || !Array.isArray(semester.semesterGpaTrend)) return [];
    return semester.semesterGpaTrend.map(s => ({ label: s.label, value: numberOrZero(s.gpa) }));
  }

  function cgpaTrendData(semester) {
    if (!semester || !Array.isArray(semester.cgpaTrend)) return [];
    return semester.cgpaTrend.map(s => ({ label: s.label, value: numberOrZero(s.cgpa) }));
  }

  function semesterProgressData(curriculum) {
    if (!curriculum || !Array.isArray(curriculum.semesterProgress)) return [];
    return curriculum.semesterProgress.map(s => ({
      label: s.label,
      total: numberOrZero(s.total),
      attempted: numberOrZero(s.attempted),
      completed: numberOrZero(s.completed),
    }));
  }

  function prerequisiteData(curriculum) {
    if (!curriculum || !curriculum.prerequisite) return [];
    const locked = numberOrZero(curriculum.prerequisite.lockedCredits || curriculum.prerequisite.locked);
    const unlocked = numberOrZero(curriculum.prerequisite.unlockedCredits || curriculum.prerequisite.unlocked);
    return [
      { label: 'Unlocked Credits', value: unlocked, color: COLORS.Unlocked },
      { label: 'Locked Credits', value: locked, color: COLORS.Locked },
    ];
  }

  function creditsData(semester) {
    if (!semester || !Array.isArray(semester.creditBySemester)) return [];
    return semester.creditBySemester.map(s => ({
      label: s.label,
      value: numberOrZero(s.credits),
      color: COLORS.Credits,
    }));
  }

  function gpaCreditsScatterData(semester) {
    if (!semester) return [];
    if (!Array.isArray(semester.creditBySemester) || !Array.isArray(semester.semesterGpaTrend)) return [];

    const creditsByLabel = new Map();
    semester.creditBySemester.forEach(item => {
      creditsByLabel.set(item.label, numberOrZero(item.credits));
    });

    const points = semester.semesterGpaTrend
      .map(g => ({
        label: g.label,
        x: numberOrZero(creditsByLabel.get(g.label)),
        y: numberOrZero(g.gpa),
      }))
      .filter(p => p.x > 0 && p.y > 0);

    if (points.length) return points;

    const n = Math.min(semester.semesterGpaTrend.length, semester.creditBySemester.length);
    const fallback = [];
    for (let i = 0; i < n; i += 1) {
      fallback.push({
        label: semester.semesterGpaTrend[i].label || ('Sem ' + (i + 1)),
        x: numberOrZero(semester.creditBySemester[i].credits),
        y: numberOrZero(semester.semesterGpaTrend[i].gpa),
      });
    }
    return fallback.filter(p => p.x > 0 && p.y > 0);
  }

  async function renderDashboard() {
    const data = await readGraphData();
    const curriculum = data && data.curriculum ? data.curriculum : null;
    const semester = data && data.semester ? data.semester : null;

    if (!curriculum && !semester) {
      setEmptyMode(true);
      destroyAllCharts();
      if (el.lastUpdated) el.lastUpdated.textContent = formatTimestamp(null);
      return;
    }

    setEmptyMode(false);
    if (el.lastUpdated) {
      el.lastUpdated.textContent = formatTimestamp(data.updatedAt || (curriculum && curriculum.capturedAt) || (semester && semester.capturedAt));
    }

    renderKpis(curriculum, semester);
    renderInsights(curriculum, semester);

    renderBarChart('gradeDistribution', el.gradeDistributionChart, gradeDistributionData(curriculum), 'No curriculum grade distribution available yet.');
    renderBarChart('statusDistribution', el.statusDistributionChart, statusDistributionData(curriculum, semester), 'No credit status distribution available yet.');
    renderDonutChart('prerequisite', el.prerequisiteChart, prerequisiteData(curriculum), 'Visit Curriculum Grade Report to capture prerequisite lock data.');

    renderLineChart('cgpaTrend', el.cgpaTrendChart, cgpaTrendData(semester), 'Visit Semester Grade Report to capture CGPA trend data.', {
      maxY: 4,
      stroke: COLORS.CGPA,
      point: COLORS.CGPA,
      label: 'CGPA',
    });

    renderLineChart('gpaTrend', el.semesterGpaChart, gpaTrendData(semester), 'Visit Semester Grade Report to capture GPA trend data.', {
      maxY: 4,
      stroke: COLORS.GPA,
      point: COLORS.GPA,
      label: 'Semester GPA',
    });

    const semesterProgress = semesterProgressData(curriculum);
    renderGroupedBarChart('semesterProgress', el.semesterProgressChart, semesterProgress, 'Visit Curriculum Grade Report to capture semester completion data.');
    renderAttemptRateChart('attemptRate', el.attemptRateChart, semesterProgress, 'Visit Curriculum Grade Report to capture attempt rate data.');

    renderScatterChart('gpaCredits', el.gpaCreditsScatterChart, gpaCreditsScatterData(semester), 'Need GPA and credits data from Semester Grade Report for this graph.');
    renderBarChart('creditsBySemester', el.creditsChart, creditsData(semester), 'Visit Semester Grade Report to capture credits data.');
  }

  function init() {
    if (el.refreshData) {
      el.refreshData.addEventListener('click', renderDashboard);
    }
    renderDashboard();
  }

  init();
})();