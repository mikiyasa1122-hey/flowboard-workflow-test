import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSampleTasks } from '../domain/sampleData';
import { SCHEMA_VERSION } from '../domain/task';
import { createTask, updateTask } from '../domain/taskOps';
import { DB_NAME, DB_VERSION, IndexedDbTaskRepository, openDatabase } from './indexedDbRepository';
import { StorageError } from './taskRepository';

let factory: IDBFactory;
const NOW = new Date('2026-10-29T03:00:00.000Z');
const samples = () => createSampleTasks(NOW);

beforeEach(() => {
  // テストごとに独立した IndexedDB
  factory = new IDBFactory();
});

/** 同じ DB を開き直す（= ページ再読み込み・ブラウザ再起動の再現） */
const reopen = () => IndexedDbTaskRepository.open(factory);

describe('IndexedDbTaskRepository', () => {
  it('DB のバージョンはスキーマバージョンと一致する', async () => {
    const db = await openDatabase(factory);
    expect(db.version).toBe(DB_VERSION);
    expect(DB_VERSION).toBe(SCHEMA_VERSION);
    expect([...db.objectStoreNames].sort()).toEqual(['meta', 'tasks']);
    db.close();
  });

  it('初回起動時だけサンプルを保存する（2回目以降は再投入しない）', async () => {
    const first = await reopen().loadOrSeed(samples);
    expect(first.tasks).toHaveLength(5);
    const repo = reopen();
    await repo.delete(first.tasks[0].id);
    const second = await reopen().loadOrSeed(samples);
    expect(second.tasks).toHaveLength(4);
  });

  it('全部削除してもサンプルは再投入されない', async () => {
    const repo = reopen();
    const { tasks } = await repo.loadOrSeed(samples);
    for (const t of tasks) await repo.delete(t.id);
    expect((await reopen().loadOrSeed(samples)).tasks).toEqual([]);
  });

  it('作成・更新・削除が開き直した後も保持される', async () => {
    const repo = reopen();
    await repo.loadOrSeed(() => []);
    const task = createTask({ title: '保存テスト', tags: ['x'] }, NOW);
    await repo.put(task);
    const updated = updateTask(task, { title: '更新後', status: 'done' }, new Date('2026-10-30T00:00:00Z'));
    await repo.put(updated);

    const loaded = await reopen().loadOrSeed(samples);
    expect(loaded.tasks).toEqual([updated]);

    await reopen().delete(task.id);
    expect((await reopen().loadOrSeed(samples)).tasks).toEqual([]);
  });

  it('replaceAll は既存データを全件置き換える', async () => {
    const repo = reopen();
    await repo.loadOrSeed(samples);
    const imported = [createTask({ title: 'インポート1' }, NOW), createTask({ title: 'インポート2' }, NOW)];
    await repo.replaceAll(imported);
    const loaded = await reopen().loadOrSeed(samples);
    expect(loaded.tasks.map((t) => t.title).sort()).toEqual(['インポート1', 'インポート2']);
  });

  it('replaceAll が途中で失敗したら既存データを変更しない（トランザクション）', async () => {
    const repo = reopen();
    const { tasks: before } = await repo.loadOrSeed(samples);
    const good = createTask({ title: 'ok' }, NOW);
    // keyPath(id) のない値は put で DataError になり、トランザクション全体が中止される
    const broken = { title: 'id なし' } as unknown as typeof good;
    await expect(repo.replaceAll([good, broken])).rejects.toBeInstanceOf(StorageError);
    const after = await reopen().loadOrSeed(samples);
    expect(after.tasks).toEqual(before);
  });

  it('保存データに壊れたレコードがあっても読み飛ばして起動できる', async () => {
    const repo = reopen();
    await repo.loadOrSeed(() => []);
    const valid = createTask({ title: '正常' }, NOW);
    await repo.put(valid);
    // 直接不正なレコードを書き込む
    const db = await openDatabase(factory);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('tasks', 'readwrite');
      tx.objectStore('tasks').put({ id: 'broken', title: '' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    const loaded = await reopen().loadOrSeed(samples);
    expect(loaded.tasks).toEqual([valid]);
    expect(loaded.skipped).toBe(1);
  });

  it('DB を開けない場合は StorageError', async () => {
    const failing = {
      open: () => {
        throw new Error('blocked by browser');
      },
    } as unknown as IDBFactory;
    const repo = IndexedDbTaskRepository.open(failing, DB_NAME);
    await expect(repo.loadOrSeed(samples)).rejects.toBeInstanceOf(StorageError);
    await expect(repo.put(createTask({ title: 'x' }, NOW))).rejects.toBeInstanceOf(StorageError);
  });
});
