import { describe, expect, it } from 'vitest';
import { ValidationError, type Task } from './task';
import { changeStatus, createTask, parseTagInput, removeTask, updateTask, upsertTask } from './taskOps';

const T0 = new Date('2026-10-01T00:00:00.000Z');
const T1 = new Date('2026-10-02T00:00:00.000Z');
const T2 = new Date('2026-10-03T00:00:00.000Z');

let counter = 0;
const idGen = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

function make(overrides: Parameters<typeof createTask>[0] = { title: 'テスト' }): Task {
  return createTask(overrides, T0, idGen);
}

describe('createTask（作成）', () => {
  it('UUID・作成/更新日時を自動で付ける', () => {
    const task = createTask({ title: '買い物', tags: ['家'] }, T0, idGen);
    expect(task.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(task.createdAt).toBe(T0.toISOString());
    expect(task.updatedAt).toBe(T0.toISOString());
    expect(task.completedAt).toBeNull();
    expect(task.status).toBe('todo');
    expect(task.tags).toEqual(['家']);
  });

  it('既定の ID 生成は crypto.randomUUID で毎回異なる', () => {
    const a = createTask({ title: 'a' });
    const b = createTask({ title: 'b' });
    expect(a.id).not.toBe(b.id);
  });

  it('done で作成したら completedAt も記録する', () => {
    expect(createTask({ title: 'x', status: 'done' }, T0, idGen).completedAt).toBe(T0.toISOString());
  });

  it('不正な入力は ValidationError を投げ、タスクを作らない', () => {
    expect(() => createTask({ title: '' }, T0, idGen)).toThrow(ValidationError);
    expect(() => createTask({ title: 'a'.repeat(81) }, T0, idGen)).toThrow(ValidationError);
    expect(() => createTask({ title: 'a', tags: ['1', '2', '3', '4', '5', '6'] }, T0, idGen)).toThrow(ValidationError);
    expect(() => createTask({ title: 'a', dueDate: '2026-02-30' }, T0, idGen)).toThrow(ValidationError);
  });

  it('不正な ID 生成器でも不正データを作らない', () => {
    expect(() => createTask({ title: 'a' }, T0, () => 'not-a-uuid')).toThrow(ValidationError);
  });
});

describe('updateTask（更新）', () => {
  it('入力項目と updatedAt を更新し、id と createdAt は保つ', () => {
    const task = make();
    const updated = updateTask(task, { title: '新しい名前', priority: 'high', dueDate: '2026-12-31' }, T1);
    expect(updated).toMatchObject({
      id: task.id,
      title: '新しい名前',
      priority: 'high',
      dueDate: '2026-12-31',
      createdAt: T0.toISOString(),
      updatedAt: T1.toISOString(),
    });
  });

  it('期限を null にして外せる', () => {
    const task = make({ title: 'a', dueDate: '2026-12-31' });
    expect(updateTask(task, { dueDate: null }, T1).dueDate).toBeNull();
  });

  it('不正な更新は ValidationError を投げ、元のタスクは変わらない', () => {
    const task = make();
    const snapshot = structuredClone(task);
    expect(() => updateTask(task, { title: '' }, T1)).toThrow(ValidationError);
    expect(() => updateTask(task, { description: 'x'.repeat(501) }, T1)).toThrow(ValidationError);
    expect(task).toEqual(snapshot);
  });
});

describe('changeStatus（ステータス変更）', () => {
  it('todo → doing → done で completedAt を記録する', () => {
    const task = make();
    const doing = changeStatus(task, 'doing', T1);
    expect(doing.status).toBe('doing');
    expect(doing.completedAt).toBeNull();
    expect(doing.updatedAt).toBe(T1.toISOString());
    const done = changeStatus(doing, 'done', T2);
    expect(done.status).toBe('done');
    expect(done.completedAt).toBe(T2.toISOString());
  });

  it('done から戻すと completedAt を消す', () => {
    const done = changeStatus(make(), 'done', T1);
    const back = changeStatus(done, 'todo', T2);
    expect(back.completedAt).toBeNull();
  });

  it('同じステータスなら何も変えない（updatedAt も変わらない）', () => {
    const task = make();
    expect(changeStatus(task, 'todo', T1)).toBe(task);
  });

  it('done のまま他の項目を編集しても completedAt は保つ', () => {
    const done = changeStatus(make(), 'done', T1);
    expect(updateTask(done, { title: '改名' }, T2).completedAt).toBe(T1.toISOString());
  });
});

describe('removeTask / upsertTask（一覧操作）', () => {
  it('指定したタスクだけを削除する', () => {
    const a = make({ title: 'a' });
    const b = make({ title: 'b' });
    expect(removeTask([a, b], a.id)).toEqual([b]);
  });

  it('存在しない id の削除はエラー', () => {
    expect(() => removeTask([make()], 'missing')).toThrow('タスクが見つかりません');
  });

  it('upsert は置き換え・追加の両方に対応し、元の配列を変更しない', () => {
    const a = make({ title: 'a' });
    const list = [a];
    const renamed = updateTask(a, { title: 'A' }, T1);
    expect(upsertTask(list, renamed)).toEqual([renamed]);
    const b = make({ title: 'b' });
    expect(upsertTask(list, b)).toEqual([a, b]);
    expect(list).toEqual([a]);
  });
});

describe('parseTagInput', () => {
  it('カンマ・読点で区切り、空白・空要素・重複を除く', () => {
    expect(parseTagInput(' 仕事, 家 、, 仕事 ')).toEqual(['仕事', '家']);
    expect(parseTagInput('')).toEqual([]);
  });
});
