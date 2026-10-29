import { useState, type DragEvent } from 'react';
import { isOverdue } from '../domain/filter';
import { PRIORITY_LABELS, STATUSES, STATUS_LABELS, type Status, type Task } from '../domain/task';
import { formatDueDate } from './format';

interface BoardProps {
  tasks: Task[];
  today: string;
  /** 絞り込み中か（空状態のメッセージを変える） */
  filtered: boolean;
  onOpen: (task: Task) => void;
  onStatusChange: (task: Task, status: Status) => void;
}

const DRAG_TYPE = 'application/x-flowboard-task';

export function Board({ tasks, today, filtered, onOpen, onStatusChange }: BoardProps) {
  const [dropTarget, setDropTarget] = useState<Status | null>(null);

  const handleDrop = (event: DragEvent, status: Status) => {
    event.preventDefault();
    setDropTarget(null);
    const id = event.dataTransfer.getData(DRAG_TYPE);
    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== status) onStatusChange(task, status);
  };

  return (
    <div className="board">
      {STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        const headingId = `column-${status}`;
        return (
          <section
            key={status}
            className={`column column-${status} ${dropTarget === status ? 'is-drop-target' : ''}`}
            aria-labelledby={headingId}
            data-testid={`column-${status}`}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(DRAG_TYPE)) {
                e.preventDefault();
                setDropTarget(status);
              }
            }}
            onDragLeave={() => setDropTarget((current) => (current === status ? null : current))}
            onDrop={(e) => handleDrop(e, status)}
          >
            <header className="column-header">
              <h2 id={headingId}>{STATUS_LABELS[status]}</h2>
              <span className="count" aria-label={`${columnTasks.length}件`} data-testid={`count-${status}`}>
                {columnTasks.length}
              </span>
            </header>
            {columnTasks.length === 0 ? (
              <p className="empty">{filtered ? '条件に合うタスクはありません' : 'タスクはありません'}</p>
            ) : (
              <ul className="card-list">
                {columnTasks.map((task) => (
                  <li key={task.id}>
                    <TaskCard task={task} overdue={isOverdue(task, today)} onOpen={onOpen} onStatusChange={onStatusChange} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  overdue: boolean;
  onOpen: (task: Task) => void;
  onStatusChange: (task: Task, status: Status) => void;
}

function TaskCard({ task, overdue, onOpen, onStatusChange }: TaskCardProps) {
  return (
    <article
      className={`card priority-${task.priority} ${overdue ? 'is-overdue' : ''}`}
      data-testid="task-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <h3 className="card-title">
        <button type="button" className="card-open" onClick={() => onOpen(task)}>
          {task.title}
        </button>
      </h3>
      {task.description && <p className="card-description">{task.description}</p>}
      <div className="card-meta">
        <span className={`badge badge-priority-${task.priority}`}>優先度: {PRIORITY_LABELS[task.priority]}</span>
        {task.dueDate && (
          <span className={`badge badge-due ${overdue ? 'badge-overdue' : ''}`}>
            {overdue ? '期限超過 ' : '期限 '}
            <time dateTime={task.dueDate}>{formatDueDate(task.dueDate)}</time>
          </span>
        )}
        {task.tags.map((tag) => (
          <span key={tag} className="badge badge-tag">
            #{tag}
          </span>
        ))}
      </div>
      <label className="card-status">
        <span className="visually-hidden">「{task.title}」のステータス</span>
        <select value={task.status} onChange={(e) => onStatusChange(task, e.target.value as Status)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}
