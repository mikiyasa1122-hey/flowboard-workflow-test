import { describe, expect, it } from 'vitest';
import { createSampleTasks } from './sampleData';
import { completionRate, computeStats } from './stats';
import type { Task } from './task';
import { changeStatus, createTask } from './taskOps';

const NOW = new Date('2026-10-29T03:00:00.000Z');
const TODAY = '2026-10-29';

describe('completionRate（完了率）', () => {
  it('完了 ÷ 全体 × 100', () => {
    expect(completionRate(1, 4)).toBe(25);
    expect(completionRate(4, 4)).toBe(100);
    expect(completionRate(0, 3)).toBe(0);
  });

  it('全タスク数が0なら0%（NaN にしない）', () => {
    expect(completionRate(0, 0)).toBe(0);
  });

  it('小数第1位で四捨五入する', () => {
    expect(completionRate(1, 3)).toBe(33.3);
    expect(completionRate(2, 3)).toBe(66.7);
  });
});

describe('computeStats（ダッシュボード集計）', () => {
  it('0件', () => {
    expect(computeStats([], TODAY)).toEqual({
      total: 0,
      byStatus: { todo: 0, doing: 0, done: 0 },
      byPriority: { low: 0, medium: 0, high: 0 },
      overdue: 0,
      completionRate: 0,
    });
  });

  it('ステータス・優先度・期限超過を数える', () => {
    const tasks: Task[] = [
      createTask({ title: 'a', priority: 'high', dueDate: '2026-10-28' }, NOW),
      createTask({ title: 'b', priority: 'high', status: 'doing' }, NOW),
      createTask({ title: 'c', priority: 'low', status: 'done', dueDate: '2026-10-01' }, NOW),
      createTask({ title: 'd', priority: 'medium', dueDate: '2026-10-29' }, NOW),
    ];
    expect(computeStats(tasks, TODAY)).toEqual({
      total: 4,
      byStatus: { todo: 2, doing: 1, done: 1 },
      byPriority: { low: 1, medium: 1, high: 2 },
      overdue: 1,
      completionRate: 25,
    });
  });

  it('ステータス変更で集計が変わる', () => {
    const [a, b] = [createTask({ title: 'a' }, NOW), createTask({ title: 'b' }, NOW)];
    expect(computeStats([a, b], TODAY).completionRate).toBe(0);
    expect(computeStats([changeStatus(a, 'done', NOW), b], TODAY).completionRate).toBe(50);
  });

  it('サンプルデータは有効で、全ステータスと期限超過を含む', () => {
    const samples = createSampleTasks(NOW);
    const stats = computeStats(samples, TODAY);
    expect(stats.total).toBe(5);
    expect(stats.byStatus.todo).toBeGreaterThan(0);
    expect(stats.byStatus.doing).toBeGreaterThan(0);
    expect(stats.byStatus.done).toBeGreaterThan(0);
    expect(stats.overdue).toBeGreaterThan(0);
  });
});
