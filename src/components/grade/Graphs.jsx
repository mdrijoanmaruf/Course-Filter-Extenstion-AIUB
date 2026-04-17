import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList,
} from 'recharts';

// ── Palette ─────────────────────────────────────────────────────────────────

const C = {
  'A+': '#059669', A: '#10b981', 'B+': '#2563eb', B: '#3b82f6',
  'C+': '#d97706', C: '#f59e0b', 'D+': '#dc2626', D: '#ef4444',
  F: '#991b1b', W: '#6b7280', Ongoing: '#7c3aed', 'N/A': '#94a3b8',
  Completed: '#059669', Attempted: '#0ea5e9', Withdrawn: '#ef4444',
  'Not Attempted': '#94a3b8', Passed: '#059669', Dropped: '#6b7280',
  Failed: '#991b1b', Locked: '#dc2626', Unlocked: '#16a34a',
  Credits: '#0369a1', GPA: '#0f766e', CGPA: '#1d4ed8', Unattempted: '#cbd5e1',
};

const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'W', 'Ongoing', 'N/A'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function fmt(v) { const x = n(v); return Math.abs(x % 1) < 0.001 ? String(Math.round(x)) : x.toFixed(1); }
function pct(part, total) { return total ? (n(part) / n(total)) * 100 : 0; }

function compact(label, max = 14) {
  const t = String(label || '').trim();
  return t.length <= max ? t : t.slice(0, max - 1) + '…';
}

function formatTs(iso) {
  if (!iso) return 'Open Grade Report pages once to sync your latest data.';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Open Grade Report pages once to sync your latest data.' : 'Data last synced: ' + d.toLocaleString();
}

// ── Data hooks ───────────────────────────────────────────────────────────────

function useGraphData() {
  const [data, setData] = useState(undefined);

  const load = useCallback(() => {
    if (!window.chrome?.storage?.local) { setData(null); return; }
    chrome.storage.local.get({ aiubGraphData: null }, res => setData(res.aiubGraphData || null));
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, reload: load };
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

function StyledTooltip({ active, payload, label, unit = '', pctTotal }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg px-3.5 py-2.5 text-[12px]">
      {label && <p className="font-semibold text-slate-700 mb-1.5">{label}</p>}
      {payload.map((p, i) => {
        const val = n(p.value);
        const pctStr = pctTotal ? ` (${pct(val, pctTotal).toFixed(1)}%)` : '';
        return (
          <p key={i} className="flex items-center gap-2 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.fill || p.stroke || p.color }} />
            <span className="font-medium" style={{ color: p.fill || p.stroke || p.color }}>{p.name}:</span>
            <span>{fmt(val)}{unit}{pctStr}</span>
          </p>
        );
      })}
    </div>
  );
}

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg px-3.5 py-2.5 text-[12px]">
      {d.label && <p className="font-semibold text-slate-700 mb-1">{d.label}</p>}
      <p className="text-slate-600">Credits: <span className="font-semibold">{fmt(d.x)}</span></p>
      <p className="text-slate-600">GPA: <span className="font-semibold">{n(d.y).toFixed(2)}</span></p>
    </div>
  );
}

function DonutTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const val = n(p.value);
  return (
    <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg px-3.5 py-2.5 text-[12px]">
      <p className="flex items-center gap-2 text-slate-600">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.payload.fill }} />
        <span className="font-semibold text-slate-700">{p.name}</span>
      </p>
      <p className="mt-1 text-slate-600">{fmt(val)} credits ({pct(val, total).toFixed(1)}%)</p>
    </div>
  );
}

// ── Empty chart placeholder ──────────────────────────────────────────────────

function EmptyChart({ msg }) {
  return (
    <div className="flex items-center justify-center h-48 border border-dashed border-slate-200 rounded-xl bg-slate-50/60 text-[12px] text-slate-400 text-center px-4">
      {msg}
    </div>
  );
}

// ── Chart card wrapper ───────────────────────────────────────────────────────

function ChartCard({ title, desc, wide, children }) {
  return (
    <div className={`relative overflow-hidden bg-white/84 backdrop-blur border border-slate-200/60 rounded-2xl p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] animate-[riseIn_0.45s_ease_both] ${wide ? 'col-span-2' : ''}`}>
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-sky-500 to-teal-500 rounded-t-2xl" />
      <h3 className="mt-1 text-[15px] font-bold text-slate-800">{title}</h3>
      {desc && <p className="mt-1 mb-3 text-[12px] text-slate-400">{desc}</p>}
      {children}
    </div>
  );
}

// ── KPI cards ────────────────────────────────────────────────────────────────

function KpiGrid({ curriculum, semester }) {
  const stC = curriculum?.stateCredits || curriculum?.stateCounts || {};
  const pfC = semester?.passFailCredits || semester?.passFail || {};
  const cgpa = curriculum?.cgpa > 0 ? curriculum.cgpa : (semester?.latestCgpa > 0 ? semester.latestCgpa : 0);
  const total = n(curriculum?.totalCredits || semester?.totalCredits);

  const cards = [
    { label: 'Student', value: curriculum?.studentName || semester?.studentName || 'Unknown', note: curriculum?.studentId || semester?.studentId || 'ID unavailable' },
    { label: 'Program', value: curriculum?.program || semester?.program || 'N/A', note: 'Academic profile' },
    { label: 'CGPA', value: cgpa > 0 ? cgpa.toFixed(2) : 'N/A', note: 'Latest cumulative GPA' },
    { label: 'Completed', value: fmt(stC.completed ?? pfC.passed), note: total ? `Out of ${fmt(total)} credits` : 'Earned credits' },
    { label: 'Ongoing', value: fmt(stC.ongoing ?? pfC.ongoing), note: 'Credits currently running' },
    { label: 'Remaining', value: fmt(stC.notAttempted), note: curriculum ? `Locked: ${fmt(curriculum.prerequisite?.lockedCredits ?? curriculum.prerequisite?.locked)}` : 'Curriculum page needed' },
  ];

  return (
    <div className="grid grid-cols-6 max-[1120px]:grid-cols-3 max-[640px]:grid-cols-2 gap-3 mt-4">
      {cards.map(({ label, value, note }) => (
        <div key={label} className="relative overflow-hidden bg-white/92 backdrop-blur border border-slate-200/50 rounded-2xl px-3.5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-500/85 to-teal-500/85 rounded-t-2xl" />
          <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1 mb-1">{label}</span>
          <span className="block text-[clamp(18px,2vw,24px)] font-extrabold tracking-tight text-slate-900 leading-none min-h-[28px]">{value}</span>
          <span className="block mt-1 text-[11px] text-slate-500">{note}</span>
        </div>
      ))}
    </div>
  );
}

// ── Insights row ─────────────────────────────────────────────────────────────

function InsightsRow({ curriculum, semester }) {
  const chips = [];

  if (curriculum?.prerequisite) {
    const locked = n(curriculum.prerequisite.lockedCredits ?? curriculum.prerequisite.locked);
    const unlocked = n(curriculum.prerequisite.unlockedCredits ?? curriculum.prerequisite.unlocked);
    const total = locked + unlocked;
    chips.push({ color: C.Unlocked, text: `Unlock rate ${total ? pct(unlocked, total).toFixed(1) : '0.0'}%` });
  }

  if (Array.isArray(semester?.semesterGpaTrend) && semester.semesterGpaTrend.length > 1) {
    const first = n(semester.semesterGpaTrend[0].gpa);
    const last = n(semester.semesterGpaTrend[semester.semesterGpaTrend.length - 1].gpa);
    const delta = (last - first).toFixed(2);
    chips.push({ color: delta >= 0 ? C.Completed : C.Failed, text: `Semester GPA change ${delta >= 0 ? '+' : ''}${delta}` });
  }

  if (Array.isArray(semester?.creditBySemester) && semester.creditBySemester.length) {
    const max = Math.max(...semester.creditBySemester.map(p => n(p.credits)));
    chips.push({ color: C.Credits, text: `Peak credit load ${fmt(max)}` });
  }

  if (curriculum?.stateCredits || curriculum?.stateCounts) {
    const s = curriculum.stateCredits || curriculum.stateCounts;
    const attempted = n(s.completed) + n(s.ongoing) + n(s.withdrawn);
    const total = n(curriculum.totalCredits || curriculum.totalCourses);
    chips.push({ color: C.Attempted, text: `Curriculum attempt rate ${total ? pct(attempted, total).toFixed(1) : '0.0'}%` });
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2.5">
      {chips.map(({ color, text }) => (
        <span key={text} className="inline-flex items-center gap-1.5 bg-white/75 border border-slate-200/50 rounded-full px-3 py-1.5 text-[11px] text-slate-600 shadow-sm">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          {text}
        </span>
      ))}
    </div>
  );
}

// ── Individual charts ─────────────────────────────────────────────────────────

function GradeDistributionChart({ curriculum }) {
  if (!curriculum?.gradeDistribution) return <EmptyChart msg="No curriculum grade distribution available yet." />;

  const dist = curriculum.gradeDistribution;
  const used = new Set();
  const data = [];

  GRADE_ORDER.forEach(key => {
    if (key in dist) { data.push({ name: key, value: n(dist[key]), fill: C[key] || '#0369a1' }); used.add(key); }
  });
  Object.keys(dist).forEach(key => {
    if (!used.has(key)) data.push({ name: key, value: n(dist[key]), fill: C[key] || '#0369a1' });
  });

  const active = data.filter(d => d.value > 0);
  if (!active.length) return <EmptyChart msg="No grade data found." />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={active} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<StyledTooltip unit=" credits" />} />
        <Bar dataKey="value" name="Credits" radius={[6, 6, 0, 0]} maxBarSize={42}>
          {active.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatusDistributionChart({ curriculum, semester }) {
  let parts = [];

  if (curriculum?.stateCredits || curriculum?.stateCounts) {
    const s = curriculum.stateCredits || curriculum.stateCounts;
    parts = [
      { name: 'Completed', value: n(s.completed), fill: C.Completed },
      { name: 'Ongoing', value: n(s.ongoing), fill: C.Ongoing },
      { name: 'Withdrawn', value: n(s.withdrawn), fill: C.Withdrawn },
      { name: 'Not Attempted', value: n(s.notAttempted), fill: C['Not Attempted'] },
    ];
  } else if (semester?.passFailCredits || semester?.passFail) {
    const s = semester.passFailCredits || semester.passFail;
    parts = [
      { name: 'Passed', value: n(s.passed), fill: C.Passed },
      { name: 'Ongoing', value: n(s.ongoing), fill: C.Ongoing },
      { name: 'Dropped', value: n(s.dropped), fill: C.Dropped },
      { name: 'Failed', value: n(s.failed), fill: C.Failed },
    ];
  }

  const active = parts.filter(p => p.value > 0);
  const total = active.reduce((s, p) => s + p.value, 0);

  if (!active.length || !total) return <EmptyChart msg="No credit status distribution available yet." />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={active} margin={{ top: 4, right: 4, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => compact(v, 12)} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<StyledTooltip unit=" credits" pctTotal={total} />} />
        <Bar dataKey="value" name="Credits" radius={[6, 6, 0, 0]} maxBarSize={52}>
          {active.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PrerequisiteChart({ curriculum }) {
  if (!curriculum?.prerequisite) return <EmptyChart msg="Visit Curriculum Grade Report to capture prerequisite lock data." />;

  const locked = n(curriculum.prerequisite.lockedCredits ?? curriculum.prerequisite.locked);
  const unlocked = n(curriculum.prerequisite.unlockedCredits ?? curriculum.prerequisite.unlocked);
  const total = locked + unlocked;

  if (!total) return <EmptyChart msg="No prerequisite data found." />;

  const data = [
    { name: 'Unlocked', value: unlocked, fill: C.Unlocked },
    { name: 'Locked', value: locked, fill: C.Locked },
  ];

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius="52%" outerRadius="78%" paddingAngle={3} dataKey="value">
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Pie>
          <Tooltip content={<DonutTooltip total={total} />} />
          <Legend iconType="circle" iconSize={10} formatter={v => <span className="text-[11px] text-slate-600">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-[12px] text-slate-500 mt-1">
        {pct(unlocked, total).toFixed(1)}% unlocked · {fmt(unlocked)} / {fmt(total)} credits
      </p>
    </div>
  );
}

function CgpaTrendChart({ semester }) {
  if (!Array.isArray(semester?.cgpaTrend) || semester.cgpaTrend.length < 2) {
    return <EmptyChart msg="Visit Semester Grade Report to capture CGPA trend data." />;
  }

  const data = semester.cgpaTrend.map(s => ({ label: s.label, cgpa: n(s.cgpa) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => compact(v, 18)} />
        <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<StyledTooltip />} />
        <Line type="monotone" dataKey="cgpa" name="CGPA" stroke={C.CGPA} strokeWidth={2.5} dot={{ fill: C.CGPA, stroke: '#fff', strokeWidth: 2, r: 4 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SemesterGpaChart({ semester }) {
  if (!Array.isArray(semester?.semesterGpaTrend) || semester.semesterGpaTrend.length < 2) {
    return <EmptyChart msg="Visit Semester Grade Report to capture GPA trend data." />;
  }

  const data = semester.semesterGpaTrend.map(s => ({ label: s.label, gpa: n(s.gpa) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => compact(v, 18)} />
        <YAxis domain={[0, 4]} ticks={[0, 1, 2, 3, 4]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<StyledTooltip />} />
        <Line type="monotone" dataKey="gpa" name="Semester GPA" stroke={C.GPA} strokeWidth={2.5} dot={{ fill: C.GPA, stroke: '#fff', strokeWidth: 2, r: 4 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SemesterProgressChart({ curriculum }) {
  if (!Array.isArray(curriculum?.semesterProgress) || !curriculum.semesterProgress.length) {
    return <EmptyChart msg="Visit Curriculum Grade Report to capture semester completion data." />;
  }

  const data = curriculum.semesterProgress.map(s => ({
    label: compact(s.label, 12),
    Attempted: n(s.attempted),
    Completed: n(s.completed),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<StyledTooltip unit=" credits" />} />
        <Legend iconType="circle" iconSize={10} formatter={v => <span className="text-[11px] text-slate-600">{v}</span>} />
        <Bar dataKey="Attempted" fill={C.Attempted} radius={[5, 5, 0, 0]} maxBarSize={32} />
        <Bar dataKey="Completed" fill={C.Completed} radius={[5, 5, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AttemptRateChart({ curriculum }) {
  if (!Array.isArray(curriculum?.semesterProgress) || !curriculum.semesterProgress.length) {
    return <EmptyChart msg="Visit Curriculum Grade Report to capture attempt rate data." />;
  }

  const rows = curriculum.semesterProgress;
  const data = rows.map(row => {
    const total = n(row.total);
    const completed = Math.min(100, pct(row.completed, total));
    const attempted = Math.min(100, pct(row.attempted, total));
    const inProgress = Math.max(0, attempted - completed);
    const unattempted = Math.max(0, 100 - attempted);
    return { label: compact(row.label, 14), Completed: +completed.toFixed(1), 'In Progress': +inProgress.toFixed(1), Unattempted: +unattempted.toFixed(1) };
  });

  const height = Math.max(280, rows.length * 52);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => v + '%'} />
        <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<StyledTooltip unit="%" />} />
        <Legend iconType="circle" iconSize={10} formatter={v => <span className="text-[11px] text-slate-600">{v}</span>} />
        <Bar dataKey="Completed" stackId="rate" fill={C.Completed} />
        <Bar dataKey="In Progress" stackId="rate" fill={C.Attempted} />
        <Bar dataKey="Unattempted" stackId="rate" fill={C.Unattempted} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function GpaCreditsScatterChart({ semester }) {
  if (!semester) return <EmptyChart msg="Need GPA and credits data from Semester Grade Report." />;

  const creditMap = new Map();
  (semester.creditBySemester || []).forEach(s => creditMap.set(s.label, n(s.credits)));

  let points = (semester.semesterGpaTrend || [])
    .map(g => ({ label: g.label, x: creditMap.get(g.label) ?? 0, y: n(g.gpa) }))
    .filter(p => p.x > 0 && p.y > 0);

  if (!points.length) {
    const gpas = semester.semesterGpaTrend || [];
    const creds = semester.creditBySemester || [];
    const len = Math.min(gpas.length, creds.length);
    points = Array.from({ length: len }, (_, i) => ({
      label: gpas[i].label || `Sem ${i + 1}`,
      x: n(creds[i].credits),
      y: n(gpas[i].gpa),
    })).filter(p => p.x > 0 && p.y > 0);
  }

  if (points.length < 2) return <EmptyChart msg="Need more semester data for scatter chart." />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 8, right: 16, left: -10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" dataKey="x" name="Credits" label={{ value: 'Credits Earned', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#64748b' }} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis type="number" dataKey="y" name="GPA" domain={[0, 4]} label={{ value: 'Semester GPA', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#64748b' }} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<ScatterTooltip />} />
        <Scatter name="Semester" data={points} fill="rgba(30,64,175,0.72)" stroke="#1e40af" strokeWidth={1.2} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function CreditsChart({ semester }) {
  if (!Array.isArray(semester?.creditBySemester) || !semester.creditBySemester.length) {
    return <EmptyChart msg="Visit Semester Grade Report to capture credits data." />;
  }

  const data = semester.creditBySemester.map(s => ({ label: compact(s.label, 14), Credits: n(s.credits) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip content={<StyledTooltip unit=" credits" />} />
        <Bar dataKey="Credits" fill={C.Credits} radius={[6, 6, 0, 0]} maxBarSize={40}>
          <LabelList dataKey="Credits" position="top" style={{ fontSize: 10, fill: '#64748b' }} formatter={fmt} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="mt-5 bg-white border border-dashed border-slate-200 rounded-2xl text-center p-9 shadow-[0_14px_32px_rgba(15,23,42,0.11)]">
      <h2 className="text-[22px] font-bold text-slate-800 m-0">No graph data found yet</h2>
      <p className="mt-2.5 mb-5 text-[13px] text-slate-500 max-w-xl mx-auto">
        Visit your curriculum and semester grade report pages first. This dashboard will auto-build charts from those pages.
      </p>
      <div className="flex justify-center gap-2.5 flex-wrap">
        <a
          href="https://portal.aiub.edu/Student/GradeReport/ByCurriculum"
          target="_blank" rel="noopener noreferrer"
          className="inline-block px-4 py-2.5 rounded-xl text-[12px] font-bold bg-sky-600 text-white hover:bg-sky-700 no-underline transition-colors"
        >
          Capture Curriculum Data
        </a>
        <a
          href="https://portal.aiub.edu/Student/GradeReport/BySemester"
          target="_blank" rel="noopener noreferrer"
          className="inline-block px-4 py-2.5 rounded-xl text-[12px] font-bold bg-white text-sky-700 border border-sky-200 hover:bg-sky-50 no-underline transition-colors"
        >
          Capture Semester Data
        </a>
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────

export default function Graphs() {
  const { data, reload } = useGraphData();

  const curriculum = data?.curriculum ?? null;
  const semester = data?.semester ?? null;
  const ts = formatTs(data?.updatedAt || curriculum?.capturedAt || semester?.capturedAt);

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center h-40 text-[13px] text-slate-400">Loading…</div>
    );
  }

  return (
    <div className="w-[min(1220px,94vw)] mx-auto my-6 pb-10">

      {/* Hero header */}
      <header className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-sky-700 to-blue-700 text-white rounded-3xl border border-white/25 px-6 py-5 grid grid-cols-[1.6fr_1fr] max-[900px]:grid-cols-1 gap-5 shadow-[0_18px_40px_rgba(2,132,199,0.28)]">
        <div className="absolute w-52 h-52 -right-16 -top-24 rounded-full bg-radial-[at_center] from-white/25 to-transparent pointer-events-none" />
        <div className="absolute w-56 h-56 -left-20 -bottom-28 rounded-full bg-radial-[at_center] from-white/15 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <p className="m-0 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] opacity-80">AIUB Portal Plus</p>
          <h1 className="m-0 text-[clamp(24px,3vw,36px)] font-extrabold leading-[1.07] tracking-tight max-w-[530px]">Grade Analytics</h1>
          <p className="mt-2.5 text-[12px] text-white/90">{ts}</p>
        </div>
        <div className="relative z-10 flex items-center justify-end max-[900px]:justify-start flex-wrap gap-2.5">
          <button
            onClick={reload}
            className="border border-white/45 rounded-xl px-3.5 py-2 text-[12px] font-bold bg-white text-sky-800 cursor-pointer hover:-translate-y-0.5 hover:bg-slate-100 transition-all"
          >
            Refresh
          </button>
          <a href="https://portal.aiub.edu/Student/GradeReport/ByCurriculum" target="_blank" rel="noopener noreferrer"
            className="border border-white/45 rounded-xl px-3.5 py-2 text-[12px] font-bold bg-white/12 text-white no-underline hover:-translate-y-0.5 hover:bg-white/25 transition-all">
            Open Curriculum
          </a>
          <a href="https://portal.aiub.edu/Student/GradeReport/BySemester" target="_blank" rel="noopener noreferrer"
            className="border border-white/45 rounded-xl px-3.5 py-2 text-[12px] font-bold bg-white/12 text-white no-underline hover:-translate-y-0.5 hover:bg-white/25 transition-all">
            Open Semester
          </a>
        </div>
      </header>

      {/* Empty state */}
      {!curriculum && !semester ? (
        <EmptyState />
      ) : (
        <>
          <KpiGrid curriculum={curriculum} semester={semester} />
          <InsightsRow curriculum={curriculum} semester={semester} />

          {/* Chart grid */}
          <div className="mt-3 grid grid-cols-2 max-[900px]:grid-cols-1 gap-3">

            <ChartCard title="Grade Distribution by Credits" desc="Credit totals grouped by final grade.">
              <GradeDistributionChart curriculum={curriculum} />
            </ChartCard>

            <ChartCard title="Status Split by Credits" desc="Completed, ongoing, withdrawn and not-attempted credit totals.">
              <StatusDistributionChart curriculum={curriculum} semester={semester} />
            </ChartCard>

            <ChartCard title="Prerequisite Unlock Ratio" desc="How many not-attempted courses are currently unlocked.">
              <PrerequisiteChart curriculum={curriculum} />
            </ChartCard>

            <ChartCard title="CGPA Trend" desc="Cumulative GPA movement across completed semesters.">
              <CgpaTrendChart semester={semester} />
            </ChartCard>

            <ChartCard wide title="Semester GPA Trend" desc="Semester GPA over time based on your semester report.">
              <SemesterGpaChart semester={semester} />
            </ChartCard>

            <ChartCard wide title="Semester Credit Completion" desc="Attempted and completed credits by curriculum semester block.">
              <SemesterProgressChart curriculum={curriculum} />
            </ChartCard>

            <ChartCard wide title="Semester Attempt Rate" desc="Attempted and completed percentages against total listed credits.">
              <AttemptRateChart curriculum={curriculum} />
            </ChartCard>

            <ChartCard wide title="GPA vs Credits Correlation" desc="Relation between semester credit load and GPA.">
              <GpaCreditsScatterChart semester={semester} />
            </ChartCard>

            <ChartCard wide title="Credits Earned by Semester" desc="Credits earned trend from semester summaries.">
              <CreditsChart semester={semester} />
            </ChartCard>

          </div>
        </>
      )}
    </div>
  );
}
