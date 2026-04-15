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
		'Credits': '#0369a1',
		'GPA': '#0f766e',
	};

	const el = {
		emptyState: document.getElementById('emptyState'),
		dashboard: document.getElementById('dashboard'),
		kpiGrid: document.getElementById('kpiGrid'),
		lastUpdated: document.getElementById('lastUpdated'),
		refreshData: document.getElementById('refreshData'),
		gradeDistributionChart: document.getElementById('gradeDistributionChart'),
		statusDistributionChart: document.getElementById('statusDistributionChart'),
		semesterGpaChart: document.getElementById('semesterGpaChart'),
		semesterProgressChart: document.getElementById('semesterProgressChart'),
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
		el.emptyState.hidden = !isEmpty;
		el.dashboard.hidden = isEmpty;
	}

	function renderKpis(curriculum, semester) {
		const stateCounts = curriculum ? (curriculum.stateCounts || {}) : {};
		const passFail = semester ? (semester.passFail || {}) : {};
		const cgpa = curriculum && curriculum.cgpa > 0
			? curriculum.cgpa
			: (semester && semester.latestCgpa > 0 ? semester.latestCgpa : 0);

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
				label: 'Completed',
				value: String(numberOrZero(stateCounts.completed || passFail.passed)),
				note: 'Courses completed',
			},
			{
				label: 'Ongoing',
				value: String(numberOrZero(stateCounts.ongoing || passFail.ongoing)),
				note: 'Currently running',
			},
			{
				label: 'Not Attempted',
				value: String(numberOrZero(stateCounts.notAttempted)),
				note: curriculum ? ('Locked: ' + numberOrZero(curriculum.prerequisite && curriculum.prerequisite.locked)) : 'Curriculum page needed',
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

	function renderEmptyChart(container, message) {
		container.innerHTML = `<div class="chart-empty">${esc(message)}</div>`;
	}

	function renderLegend(container, items) {
		if (!items.length) return;
		const html = items.map(item => `
			<span class="chart-legend-item">
				<span class="chart-legend-swatch" style="background:${esc(item.color)}"></span>
				${esc(item.label)}
			</span>
		`).join('');
		container.insertAdjacentHTML('beforeend', `<div class="chart-legend">${html}</div>`);
	}

	function renderBarChart(container, series, fallbackText) {
		if (!series || !series.length) {
			renderEmptyChart(container, fallbackText);
			return;
		}

		const maxValue = Math.max(...series.map(s => numberOrZero(s.value)), 1);
		const width = Math.max(660, series.length * 86 + 90);
		const height = 290;
		const m = { t: 20, r: 24, b: 78, l: 40 };
		const chartW = width - m.l - m.r;
		const chartH = height - m.t - m.b;
		const step = chartW / series.length;
		const barW = Math.min(46, step * 0.62);

		const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => {
			const y = m.t + chartH - chartH * p;
			const v = Math.round(maxValue * p * 10) / 10;
			return `
				<line x1="${m.l}" y1="${y}" x2="${width - m.r}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />
				<text x="${m.l - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#64748b">${esc(v)}</text>
			`;
		}).join('');

		const bars = series.map((s, i) => {
			const val = numberOrZero(s.value);
			const h = (val / maxValue) * chartH;
			const x = m.l + i * step + (step - barW) / 2;
			const y = m.t + chartH - h;
			const color = s.color || '#0369a1';
			return `
				<g>
					<title>${esc(s.label)}: ${val}</title>
					<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(h, 1)}" rx="6" fill="${esc(color)}" opacity="0.92"></rect>
					<text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" font-size="10" fill="#334155">${esc(String(val))}</text>
					<text x="${x + barW / 2}" y="${height - 18}" text-anchor="middle" font-size="10" fill="#475569">${esc(compactLabel(s.label, 16))}</text>
				</g>
			`;
		}).join('');

		container.innerHTML = `
			<div class="chart">
				<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Bar chart">
					${gridLines}
					${bars}
				</svg>
			</div>
		`;

		renderLegend(container, series.map(s => ({ label: s.label, color: s.color || '#0369a1' })));
	}

	function renderLineChart(container, points, fallbackText) {
		if (!points || points.length < 2) {
			renderEmptyChart(container, fallbackText);
			return;
		}

		const width = Math.max(700, points.length * 92 + 80);
		const height = 280;
		const m = { t: 24, r: 24, b: 66, l: 44 };
		const chartW = width - m.l - m.r;
		const chartH = height - m.t - m.b;
		const maxVal = Math.max(4, ...points.map(p => numberOrZero(p.value)));
		const minVal = 0;

		function pxX(i) {
			return m.l + (i / (points.length - 1)) * chartW;
		}
		function pxY(v) {
			const n = (numberOrZero(v) - minVal) / Math.max(0.0001, maxVal - minVal);
			return m.t + chartH - (n * chartH);
		}

		const gridLines = [0, 1, 2, 3, 4].map(v => {
			const y = pxY(v);
			return `
				<line x1="${m.l}" y1="${y}" x2="${width - m.r}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />
				<text x="${m.l - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#64748b">${v.toFixed(1)}</text>
			`;
		}).join('');

		const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${pxX(i)} ${pxY(p.value)}`).join(' ');
		const dots = points.map((p, i) => {
			const x = pxX(i);
			const y = pxY(p.value);
			return `
				<g>
					<title>${esc(p.label)}: ${numberOrZero(p.value).toFixed(2)}</title>
					<circle cx="${x}" cy="${y}" r="4.6" fill="#0f766e"></circle>
					<text x="${x}" y="${height - 16}" text-anchor="middle" font-size="10" fill="#475569">${esc(compactLabel(p.label, 18))}</text>
				</g>
			`;
		}).join('');

		container.innerHTML = `
			<div class="chart">
				<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Line chart">
					${gridLines}
					<path d="${path}" fill="none" stroke="#0f766e" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"></path>
					${dots}
				</svg>
			</div>
		`;
	}

	function renderGroupedBarChart(container, groups, fallbackText) {
		if (!groups || !groups.length) {
			renderEmptyChart(container, fallbackText);
			return;
		}

		const series = [
			{ key: 'attempted', label: 'Attempted', color: COLORS.Attempted },
			{ key: 'completed', label: 'Completed', color: COLORS.Completed },
		];

		const maxValue = Math.max(...groups.flatMap(g => series.map(s => numberOrZero(g[s.key]))), 1);
		const width = Math.max(760, groups.length * 102 + 90);
		const height = 300;
		const m = { t: 20, r: 24, b: 88, l: 40 };
		const chartW = width - m.l - m.r;
		const chartH = height - m.t - m.b;
		const groupStep = chartW / groups.length;
		const pairWidth = Math.min(62, groupStep * 0.62);
		const singleWidth = (pairWidth - 8) / 2;

		const bars = groups.map((g, i) => {
			const xBase = m.l + i * groupStep + (groupStep - pairWidth) / 2;
			return series.map((s, j) => {
				const val = numberOrZero(g[s.key]);
				const h = (val / maxValue) * chartH;
				const x = xBase + j * (singleWidth + 8);
				const y = m.t + chartH - h;
				return `
					<g>
						<title>${esc(g.label)} - ${esc(s.label)}: ${val}</title>
						<rect x="${x}" y="${y}" width="${singleWidth}" height="${Math.max(h, 1)}" rx="5" fill="${s.color}"></rect>
						<text x="${x + singleWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="10" fill="#334155">${val}</text>
					</g>
				`;
			}).join('') + `<text x="${xBase + pairWidth / 2}" y="${height - 20}" text-anchor="middle" font-size="10" fill="#475569">${esc(compactLabel(g.label, 14))}</text>`;
		}).join('');

		container.innerHTML = `
			<div class="chart">
				<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Grouped bar chart">
					${bars}
				</svg>
			</div>
		`;

		renderLegend(container, series.map(s => ({ label: s.label, color: s.color })));
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
		if (curriculum && curriculum.stateCounts) {
			return [
				{ label: 'Completed', value: numberOrZero(curriculum.stateCounts.completed), color: COLORS.Completed },
				{ label: 'Ongoing', value: numberOrZero(curriculum.stateCounts.ongoing), color: COLORS.Ongoing },
				{ label: 'Withdrawn', value: numberOrZero(curriculum.stateCounts.withdrawn), color: COLORS.Withdrawn },
				{ label: 'Not Attempted', value: numberOrZero(curriculum.stateCounts.notAttempted), color: COLORS['Not Attempted'] },
			];
		}

		if (semester && semester.passFail) {
			return [
				{ label: 'Passed', value: numberOrZero(semester.passFail.passed), color: COLORS.Passed },
				{ label: 'Ongoing', value: numberOrZero(semester.passFail.ongoing), color: COLORS.Ongoing },
				{ label: 'Dropped', value: numberOrZero(semester.passFail.dropped), color: COLORS.Dropped },
				{ label: 'Failed', value: numberOrZero(semester.passFail.failed), color: COLORS.Failed },
			];
		}

		return [];
	}

	function gpaTrendData(semester) {
		if (!semester || !Array.isArray(semester.semesterGpaTrend)) return [];
		return semester.semesterGpaTrend.map(s => ({ label: s.label, value: numberOrZero(s.gpa) }));
	}

	function semesterProgressData(curriculum) {
		if (!curriculum || !Array.isArray(curriculum.semesterProgress)) return [];
		return curriculum.semesterProgress.map(s => ({
			label: s.label,
			attempted: numberOrZero(s.attempted),
			completed: numberOrZero(s.completed),
		}));
	}

	function creditsData(semester) {
		if (!semester || !Array.isArray(semester.creditBySemester)) return [];
		return semester.creditBySemester.map(s => ({
			label: s.label,
			value: numberOrZero(s.credits),
			color: COLORS.Credits,
		}));
	}

	async function renderDashboard() {
		const data = await readGraphData();
		const curriculum = data && data.curriculum ? data.curriculum : null;
		const semester = data && data.semester ? data.semester : null;

		if (!curriculum && !semester) {
			setEmptyMode(true);
			el.lastUpdated.textContent = formatTimestamp(null);
			return;
		}

		setEmptyMode(false);
		el.lastUpdated.textContent = formatTimestamp(data.updatedAt || (curriculum && curriculum.capturedAt) || (semester && semester.capturedAt));

		renderKpis(curriculum, semester);
		renderBarChart(el.gradeDistributionChart, gradeDistributionData(curriculum), 'No curriculum grade distribution available yet.');
		renderBarChart(el.statusDistributionChart, statusDistributionData(curriculum, semester), 'No course status distribution available yet.');
		renderLineChart(el.semesterGpaChart, gpaTrendData(semester), 'Visit Semester Grade Report to capture GPA trend data.');
		renderGroupedBarChart(el.semesterProgressChart, semesterProgressData(curriculum), 'Visit Curriculum Grade Report to capture semester completion data.');
		renderBarChart(el.creditsChart, creditsData(semester), 'Visit Semester Grade Report to capture credits data.');
	}

	function init() {
		el.refreshData.addEventListener('click', renderDashboard);
		renderDashboard();
	}

	init();
})();
