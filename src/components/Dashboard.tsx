import { useId } from 'react';
import type { TaskStats } from '../domain/stats';
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from '../domain/task';

export function Dashboard({ stats }: { stats: TaskStats }) {
  const items = [
    { key: 'total', label: '全タスク', value: stats.total },
    { key: 'todo', label: '未着手', value: stats.byStatus.todo },
    { key: 'doing', label: '進行中', value: stats.byStatus.doing },
    { key: 'done', label: '完了', value: stats.byStatus.done },
    { key: 'overdue', label: '期限超過', value: stats.overdue },
    { key: 'rate', label: '完了率', value: `${stats.completionRate}%` },
  ];
  const maxPriority = Math.max(1, ...PRIORITIES.map((p) => stats.byPriority[p]));

  return (
    <div className="dashboard">
      <dl className="stats-grid">
        {items.map((item) => (
          <div key={item.key} className={`stat stat-${item.key}`}>
            <dt>{item.label}</dt>
            <dd data-testid={`stat-${item.key}`}>{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="panels">
        <section className="panel" aria-labelledby="panel-status">
          <h2 id="panel-status">ステータス別</h2>
          <StatusChart stats={stats} />
        </section>
        <section className="panel" aria-labelledby="panel-progress">
          <h2 id="panel-progress">完了率</h2>
          <div
            className="progress"
            role="progressbar"
            aria-label="完了率"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stats.completionRate}
          >
            <div className="progress-bar" style={{ width: `${stats.completionRate}%` }} />
          </div>
          <p>
            {stats.total}件中 {stats.byStatus.done}件完了（{stats.completionRate}%）
          </p>
          <h2 id="panel-priority">優先度別</h2>
          <ul className="priority-list" aria-labelledby="panel-priority">
            {[...PRIORITIES].reverse().map((p) => (
              <li key={p} className="priority-row">
                <span>{PRIORITY_LABELS[p]}</span>
                <span className="priority-track" aria-hidden="true">
                  <span className={`priority-fill priority-fill-${p}`} style={{ display: 'block', width: `${(stats.byPriority[p] / maxPriority) * 100}%` }} />
                </span>
                <span data-testid={`priority-${p}`}>{stats.byPriority[p]}件</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function StatusChart({ stats }: { stats: TaskStats }) {
  const titleId = useId();
  const width = 320;
  const height = 200;
  const top = 20;
  const bottom = 30;
  const chartHeight = height - top - bottom;
  const max = Math.max(1, ...STATUSES.map((s) => stats.byStatus[s]));
  const slot = width / STATUSES.length;
  const barWidth = slot * 0.5;
  const summary = STATUSES.map((s) => `${STATUS_LABELS[s]} ${stats.byStatus[s]}件`).join('、');

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId} data-testid="status-chart">
      <title id={titleId}>ステータス別タスク数: {summary}</title>
      <line className="axis" x1={0} x2={width} y1={top + chartHeight} y2={top + chartHeight} />
      {STATUSES.map((s, i) => {
        const value = stats.byStatus[s];
        const h = (value / max) * chartHeight;
        const x = i * slot + (slot - barWidth) / 2;
        const y = top + chartHeight - h;
        return (
          <g key={s}>
            <rect className={`bar-${s}`} x={x} y={y} width={barWidth} height={h} rx={4} />
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle">
              {value}
            </text>
            <text x={x + barWidth / 2} y={height - 10} textAnchor="middle">
              {STATUS_LABELS[s]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
