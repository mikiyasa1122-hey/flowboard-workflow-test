import { PRIORITIES, type Priority, type Status, type Task } from './task';

export type SortKey = 'createdAt-desc' | 'createdAt-asc' | 'dueDate-asc' | 'dueDate-desc' | 'priority-desc' | 'priority-asc';

export const SORT_LABELS: Record<SortKey, string> = {
  'createdAt-desc': '作成日（新しい順）',
  'createdAt-asc': '作成日（古い順）',
  'dueDate-asc': '期限（近い順）',
  'dueDate-desc': '期限（遠い順）',
  'priority-desc': '優先度（高い順）',
  'priority-asc': '優先度（低い順）',
};

export interface FilterCriteria {
  query: string;
  status: Status | 'all';
  priority: Priority | 'all';
  tag: string | 'all';
  overdueOnly: boolean;
  sort: SortKey;
}

export const DEFAULT_CRITERIA: FilterCriteria = {
  query: '',
  status: 'all',
  priority: 'all',
  tag: 'all',
  overdueOnly: false,
  sort: 'createdAt-desc',
};

/** ローカルタイムでの YYYY-MM-DD */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 期限超過: 未完了で、期限日が今日（ローカル日付）より前 */
export function isOverdue(task: Task, today: string): boolean {
  return task.status !== 'done' && task.dueDate !== null && task.dueDate < today;
}

export function isFiltered(criteria: FilterCriteria): boolean {
  return (
    criteria.query.trim() !== '' ||
    criteria.status !== 'all' ||
    criteria.priority !== 'all' ||
    criteria.tag !== 'all' ||
    criteria.overdueOnly
  );
}

const normalize = (text: string) => text.normalize('NFKC').toLowerCase();

/** すべての条件を AND で組み合わせて絞り込む */
export function filterTasks(tasks: readonly Task[], criteria: FilterCriteria, today: string): Task[] {
  const terms = normalize(criteria.query).split(/\s+/).filter(Boolean);
  return tasks.filter((task) => {
    if (criteria.status !== 'all' && task.status !== criteria.status) return false;
    if (criteria.priority !== 'all' && task.priority !== criteria.priority) return false;
    if (criteria.tag !== 'all' && !task.tags.includes(criteria.tag)) return false;
    if (criteria.overdueOnly && !isOverdue(task, today)) return false;
    if (terms.length > 0) {
      const haystack = normalize(`${task.title}\n${task.description}`);
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    return true;
  });
}

const priorityRank = (p: Priority) => PRIORITIES.indexOf(p);

function compare(a: Task, b: Task, key: SortKey): number {
  switch (key) {
    case 'createdAt-desc':
      return b.createdAt.localeCompare(a.createdAt);
    case 'createdAt-asc':
      return a.createdAt.localeCompare(b.createdAt);
    case 'priority-desc':
      return priorityRank(b.priority) - priorityRank(a.priority);
    case 'priority-asc':
      return priorityRank(a.priority) - priorityRank(b.priority);
    case 'dueDate-asc':
    case 'dueDate-desc': {
      // 期限なしは常に最後
      if (a.dueDate === b.dueDate) return 0;
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
      return key === 'dueDate-asc' ? a.dueDate.localeCompare(b.dueDate) : b.dueDate.localeCompare(a.dueDate);
    }
  }
}

/** 並び替え（安定ソート。同順位は作成日の新しい順 → id 順） */
export function sortTasks(tasks: readonly Task[], key: SortKey): Task[] {
  return [...tasks].sort(
    (a, b) => compare(a, b, key) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
  );
}

/** 全タスクで使われているタグ（重複なし・五十音/アルファベット順） */
export function collectTags(tasks: readonly Task[]): string[] {
  return [...new Set(tasks.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b, 'ja'));
}
