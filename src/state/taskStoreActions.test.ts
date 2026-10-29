import { describe, expect, it } from 'vitest';
import type { Task } from '../domain/task';
import { createTask, updateTask } from '../domain/taskOps';
import { MemoryTaskRepository, StorageError, type TaskRepository } from '../storage/taskRepository';
import { deleteTask, replaceTasks, saveTask } from './taskStoreActions';

const NOW = new Date('2026-10-29T03:00:00.000Z');
const a = createTask({ title: 'a' }, NOW);
const b = createTask({ title: 'b' }, NOW);

/** すべての書き込みが失敗するリポジトリ */
const failing: TaskRepository = {
  loadOrSeed: async () => ({ tasks: [a, b], skipped: 0 }),
  put: async () => {
    throw new StorageError('保存に失敗しました');
  },
  delete: async () => {
    throw new StorageError('削除に失敗しました');
  },
  replaceAll: async () => {
    throw new StorageError('インポートに失敗しました');
  },
};

describe('保存に失敗したら一覧を変えない', () => {
  it('作成・更新・ステータス変更（put）の失敗', async () => {
    const tasks: readonly Task[] = Object.freeze([a, b]);
    await expect(saveTask(failing, tasks, createTask({ title: 'new' }, NOW))).rejects.toThrow('保存に失敗しました');
    await expect(saveTask(failing, tasks, updateTask(a, { status: 'done' }, NOW))).rejects.toBeInstanceOf(StorageError);
    expect(tasks).toEqual([a, b]);
  });

  it('削除の失敗', async () => {
    await expect(deleteTask(failing, [a, b], a.id)).rejects.toThrow('削除に失敗しました');
  });

  it('全件置き換えの失敗', async () => {
    await expect(replaceTasks(failing, [b])).rejects.toThrow('インポートに失敗しました');
  });
});

describe('保存に成功したら新しい一覧を返す', () => {
  it('保存が終わる前に一覧を返さない', async () => {
    const order: string[] = [];
    const slow: TaskRepository = {
      ...new MemoryTaskRepository(),
      loadOrSeed: async () => ({ tasks: [], skipped: 0 }),
      put: async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push('put done');
      },
      delete: async () => undefined,
      replaceAll: async () => undefined,
    };
    const next = await saveTask(slow, [a], b).then((list) => {
      order.push('returned');
      return list;
    });
    expect(order).toEqual(['put done', 'returned']);
    expect(next).toEqual([a, b]);
  });

  it('削除・置き換え', async () => {
    const repo = new MemoryTaskRepository();
    await repo.loadOrSeed(() => [a, b]);
    expect(await deleteTask(repo, [a, b], a.id)).toEqual([b]);
    expect(await replaceTasks(repo, [a])).toEqual([a]);
    expect((await repo.loadOrSeed(() => [])).tasks).toEqual([a]);
  });

  it('存在しない id の削除は保存処理を呼ばずにエラー', async () => {
    let called = false;
    const repo: TaskRepository = { ...failing, delete: async () => void (called = true) };
    await expect(deleteTask(repo, [a], 'missing')).rejects.toThrow('タスクが見つかりません');
    expect(called).toBe(false);
  });
});
