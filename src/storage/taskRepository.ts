import type { Task } from '../domain/task';

export interface LoadResult {
  tasks: Task[];
  /** 検証に失敗して読み飛ばしたレコード数 */
  skipped: number;
}

/**
 * タスクの保存先。UI はこの interface だけを使い、IndexedDB の詳細を知らない。
 * すべての書き込みは成功したら resolve、失敗したら reject する。
 */
export interface TaskRepository {
  /** 保存済みタスクを読み込む。初回起動時はサンプルを保存してから返す */
  loadOrSeed(createSamples: () => Task[]): Promise<LoadResult>;
  put(task: Task): Promise<void>;
  delete(id: string): Promise<void>;
  /** 全件を置き換える。途中で失敗したら何も変更しない */
  replaceAll(tasks: Task[]): Promise<void>;
}

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageError';
  }
}

/** テスト・IndexedDB が使えない環境向けのメモリ実装 */
export class MemoryTaskRepository implements TaskRepository {
  private tasks = new Map<string, Task>();
  private seeded = false;

  async loadOrSeed(createSamples: () => Task[]): Promise<LoadResult> {
    if (!this.seeded) {
      for (const t of createSamples()) this.tasks.set(t.id, t);
      this.seeded = true;
    }
    return { tasks: [...this.tasks.values()], skipped: 0 };
  }

  async put(task: Task): Promise<void> {
    this.tasks.set(task.id, structuredClone(task));
  }

  async delete(id: string): Promise<void> {
    this.tasks.delete(id);
  }

  async replaceAll(tasks: Task[]): Promise<void> {
    this.tasks = new Map(tasks.map((t) => [t.id, structuredClone(t)]));
  }
}
