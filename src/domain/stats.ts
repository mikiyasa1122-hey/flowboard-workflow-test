import { isOverdue } from './filter';
import type { Priority, Status, Task } from './task';

export interface TaskStats {
  total: number;
  byStatus: Record<Status, number>;
  byPriority: Record<Priority, number>;
  overdue: number;
  /** 完了率（%）。小数第1位で四捨五入。全タスク0件なら 0 */
  completionRate: number;
}

/** 完了率 = 完了タスク数 ÷ 全タスク数 × 100（全タスク数が0なら0%） */
export function completionRate(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 1000) / 10;
}

export function computeStats(tasks: readonly Task[], today: string): TaskStats {
  const byStatus: Record<Status, number> = { todo: 0, doing: 0, done: 0 };
  const byPriority: Record<Priority, number> = { low: 0, medium: 0, high: 0 };
  let overdue = 0;
  for (const task of tasks) {
    byStatus[task.status] += 1;
    byPriority[task.priority] += 1;
    if (isOverdue(task, today)) overdue += 1;
  }
  return {
    total: tasks.length,
    byStatus,
    byPriority,
    overdue,
    completionRate: completionRate(byStatus.done, tasks.length),
  };
}
