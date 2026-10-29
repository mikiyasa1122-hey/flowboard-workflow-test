import { describe, expect, it } from 'vitest';
import { collectTags, DEFAULT_CRITERIA, filterTasks, isFiltered, isOverdue, sortTasks, toLocalDateString, type FilterCriteria } from './filter';
import type { Task } from './task';

const TODAY = '2026-10-29';

function task(overrides: Partial<Task> & { title: string }): Task {
  return {
    id: `00000000-0000-4000-8000-${overrides.title.padStart(12, '0').slice(-12)}`,
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    tags: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

const tasks: Task[] = [
  task({ title: '1', description: '買い物リスト', status: 'todo', priority: 'high', dueDate: '2026-10-28', tags: ['家'], createdAt: '2026-10-01T00:00:00.000Z' }),
  task({ title: '2', description: 'Report を書く', status: 'doing', priority: 'low', dueDate: '2026-10-29', tags: ['仕事'], createdAt: '2026-10-03T00:00:00.000Z' }),
  task({ title: '3', description: '完了済み', status: 'done', priority: 'medium', dueDate: '2026-10-01', tags: ['仕事', '家'], createdAt: '2026-10-02T00:00:00.000Z' }),
  task({ title: '4', description: '期限なし', status: 'todo', priority: 'medium', dueDate: null, tags: [], createdAt: '2026-10-04T00:00:00.000Z' }),
];

const titles = (list: Task[]) => list.map((t) => t.title);
const criteria = (overrides: Partial<FilterCriteria>): FilterCriteria => ({ ...DEFAULT_CRITERIA, ...overrides });

describe('isOverdue（期限超過）', () => {
  it('期限が今日より前の未完了タスクだけ', () => {
    expect(isOverdue(tasks[0], TODAY)).toBe(true);
    expect(isOverdue(tasks[1], TODAY)).toBe(false); // 今日が期限 → 超過ではない
    expect(isOverdue(tasks[2], TODAY)).toBe(false); // 完了済み
    expect(isOverdue(tasks[3], TODAY)).toBe(false); // 期限なし
  });

  it('toLocalDateString はローカル日付を返す', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('filterTasks（検索・絞り込み）', () => {
  it('条件なしなら全件', () => {
    expect(filterTasks(tasks, DEFAULT_CRITERIA, TODAY)).toHaveLength(4);
  });

  it('タイトル・説明文を大文字小文字・全角半角を区別せずに検索する', () => {
    expect(titles(filterTasks(tasks, criteria({ query: 'report' }), TODAY))).toEqual(['2']);
    expect(titles(filterTasks(tasks, criteria({ query: 'ＲＥＰＯＲＴ' }), TODAY))).toEqual(['2']);
    expect(titles(filterTasks(tasks, criteria({ query: '買い物' }), TODAY))).toEqual(['1']);
    expect(titles(filterTasks(tasks, criteria({ query: '3' }), TODAY))).toEqual(['3']);
  });

  it('スペース区切りの複数語は AND', () => {
    expect(titles(filterTasks(tasks, criteria({ query: 'report 書く' }), TODAY))).toEqual(['2']);
    expect(filterTasks(tasks, criteria({ query: 'report 買い物' }), TODAY)).toEqual([]);
  });

  it('ステータス・優先度・タグ・期限超過で絞り込む', () => {
    expect(titles(filterTasks(tasks, criteria({ status: 'todo' }), TODAY))).toEqual(['1', '4']);
    expect(titles(filterTasks(tasks, criteria({ priority: 'medium' }), TODAY))).toEqual(['3', '4']);
    expect(titles(filterTasks(tasks, criteria({ tag: '家' }), TODAY))).toEqual(['1', '3']);
    expect(titles(filterTasks(tasks, criteria({ overdueOnly: true }), TODAY))).toEqual(['1']);
  });

  it('複数条件はすべて満たすものだけ（AND）', () => {
    expect(titles(filterTasks(tasks, criteria({ tag: '仕事', status: 'done' }), TODAY))).toEqual(['3']);
    expect(titles(filterTasks(tasks, criteria({ tag: '家', priority: 'high', query: '買い物', overdueOnly: true }), TODAY))).toEqual(['1']);
    expect(filterTasks(tasks, criteria({ tag: '家', status: 'doing' }), TODAY)).toEqual([]);
  });

  it('isFiltered は条件が1つでもあれば true（並び替えは含まない）', () => {
    expect(isFiltered(DEFAULT_CRITERIA)).toBe(false);
    expect(isFiltered(criteria({ sort: 'priority-desc' }))).toBe(false);
    expect(isFiltered(criteria({ query: '  ' }))).toBe(false);
    expect(isFiltered(criteria({ overdueOnly: true }))).toBe(true);
  });
});

describe('sortTasks（並び替え）', () => {
  it('優先度の高い順・低い順', () => {
    expect(titles(sortTasks(tasks, 'priority-desc'))).toEqual(['1', '4', '3', '2']);
    expect(titles(sortTasks(tasks, 'priority-asc'))).toEqual(['2', '4', '3', '1']);
  });

  it('作成日の新しい順・古い順', () => {
    expect(titles(sortTasks(tasks, 'createdAt-desc'))).toEqual(['4', '2', '3', '1']);
    expect(titles(sortTasks(tasks, 'createdAt-asc'))).toEqual(['1', '3', '2', '4']);
  });

  it('期限順。期限なしは常に最後', () => {
    expect(titles(sortTasks(tasks, 'dueDate-asc'))).toEqual(['3', '1', '2', '4']);
    expect(titles(sortTasks(tasks, 'dueDate-desc'))).toEqual(['2', '1', '3', '4']);
  });

  it('元の配列を変更しない', () => {
    const copy = [...tasks];
    sortTasks(tasks, 'priority-desc');
    expect(tasks).toEqual(copy);
  });
});

describe('collectTags', () => {
  it('重複なしで並べる', () => {
    expect(collectTags(tasks)).toEqual(['仕事', '家'].sort((a, b) => a.localeCompare(b, 'ja')));
  });
});
