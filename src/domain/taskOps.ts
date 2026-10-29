import { taskInputSchema, taskSchema, ValidationError, type Status, type Task, type TaskInput } from './task';

export type IdGenerator = () => string;

const defaultIdGenerator: IdGenerator = () => crypto.randomUUID();

function validateTask(candidate: unknown): Task {
  const result = taskSchema.safeParse(candidate);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

function validateInput(input: unknown) {
  const result = taskInputSchema.safeParse(input);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

function completedAtFor(status: Status, previous: string | null, nowIso: string): string | null {
  if (status !== 'done') return null;
  return previous ?? nowIso;
}

/** 入力を検証して新しいタスクを作る。不正な入力は ValidationError */
export function createTask(input: TaskInput, now: Date = new Date(), idGen: IdGenerator = defaultIdGenerator): Task {
  const data = validateInput(input);
  const nowIso = now.toISOString();
  return validateTask({
    ...data,
    id: idGen(),
    createdAt: nowIso,
    updatedAt: nowIso,
    completedAt: completedAtFor(data.status, null, nowIso),
  });
}

/** 入力項目を更新する。id と createdAt は変更しない */
export function updateTask(task: Task, patch: Partial<TaskInput>, now: Date = new Date()): Task {
  const data = validateInput({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    tags: task.tags,
    ...patch,
  });
  const nowIso = now.toISOString();
  const statusChanged = data.status !== task.status;
  return validateTask({
    ...data,
    id: task.id,
    createdAt: task.createdAt,
    updatedAt: nowIso,
    completedAt: statusChanged ? completedAtFor(data.status, null, nowIso) : task.completedAt,
  });
}

/** ステータスを変更する。done になったら completedAt を記録し、done 以外に戻したら消す */
export function changeStatus(task: Task, status: Status, now: Date = new Date()): Task {
  if (task.status === status) return task;
  return updateTask(task, { status }, now);
}

/** 一覧から指定 id のタスクを取り除く。存在しない id はエラー */
export function removeTask(tasks: readonly Task[], id: string): Task[] {
  if (!tasks.some((t) => t.id === id)) throw new Error(`タスクが見つかりません: ${id}`);
  return tasks.filter((t) => t.id !== id);
}

/** 一覧の中の1件を置き換える（なければ追加） */
export function upsertTask(tasks: readonly Task[], task: Task): Task[] {
  const index = tasks.findIndex((t) => t.id === task.id);
  if (index === -1) return [...tasks, task];
  const next = tasks.slice();
  next[index] = task;
  return next;
}

/** "a, b ,c" のような入力をタグ配列にする（空要素は除く・重複は除く） */
export function parseTagInput(text: string): string[] {
  const tags = text
    .split(/[,、]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return [...new Set(tags)];
}
