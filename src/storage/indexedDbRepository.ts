import { SCHEMA_VERSION, taskSchema, type Task } from '../domain/task';
import { StorageError, type LoadResult, type TaskRepository } from './taskRepository';

export const DB_NAME = 'flowboard';
/** IndexedDB のバージョン（= 保存スキーマのバージョン） */
export const DB_VERSION = SCHEMA_VERSION;
const TASKS = 'tasks';
const META = 'meta';

interface MetaRecord {
  key: string;
  value: unknown;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('transaction error'));
    tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'));
  });
}

export function openDatabase(factory: IDBFactory = indexedDB, name: string = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(name, DB_VERSION);
    } catch (error) {
      reject(new StorageError('データベースを開けません', { cause: error }));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      // v1: tasks（keyPath: id）、meta（keyPath: key）
      if (!db.objectStoreNames.contains(TASKS)) db.createObjectStore(TASKS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
    };
    request.onsuccess = () => {
      const db = request.result;
      // 新しいバージョンを開こうとする別タブを止めないよう、この接続は閉じる
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(new StorageError('データベースを開けません', { cause: request.error }));
    request.onblocked = () => reject(new StorageError('別のタブがデータベースを使用中です。他のタブを閉じてください'));
  });
}

export class IndexedDbTaskRepository implements TaskRepository {
  private readonly dbPromise: Promise<IDBDatabase>;

  constructor(dbPromise: Promise<IDBDatabase>) {
    this.dbPromise = dbPromise;
    // 開けなかった場合のエラーは loadOrSeed / 各書き込みで扱う。未処理の reject として報告させない
    dbPromise.catch(() => undefined);
  }

  static open(factory?: IDBFactory, name?: string): IndexedDbTaskRepository {
    return new IndexedDbTaskRepository(openDatabase(factory, name));
  }

  private async write(action: string, run: (tx: IDBTransaction) => void): Promise<void> {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction([TASKS, META], 'readwrite');
      const finished = done(tx);
      try {
        run(tx);
      } catch (error) {
        // put() などが同期的に例外を投げてもトランザクションは自動では中止されない。
        // 途中まで積んだ変更（clear など）が確定しないよう明示的に abort する。
        finished.catch(() => undefined);
        tx.abort();
        throw error;
      }
      await finished;
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(`${action}に失敗しました`, { cause: error });
    }
  }

  async loadOrSeed(createSamples: () => Task[]): Promise<LoadResult> {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction([TASKS, META], 'readwrite');
      const finished = done(tx);
      const tasksStore = tx.objectStore(TASKS);
      const metaStore = tx.objectStore(META);
      const seeded = (await promisify(metaStore.get('seeded'))) as MetaRecord | undefined;
      if (!seeded) {
        // 初回起動: サンプルと「投入済み」フラグを同じトランザクションで書く
        for (const task of createSamples()) tasksStore.put(task);
        metaStore.put({ key: 'seeded', value: true } satisfies MetaRecord);
        metaStore.put({ key: 'schemaVersion', value: SCHEMA_VERSION } satisfies MetaRecord);
      }
      const raw = (await promisify(tasksStore.getAll())) as unknown[];
      await finished;
      const tasks: Task[] = [];
      let skipped = 0;
      for (const record of raw) {
        const parsed = taskSchema.safeParse(record);
        if (parsed.success) tasks.push(parsed.data);
        else skipped += 1;
      }
      return { tasks, skipped };
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError('データの読み込みに失敗しました', { cause: error });
    }
  }

  put(task: Task): Promise<void> {
    return this.write('保存', (tx) => {
      tx.objectStore(TASKS).put(task);
    });
  }

  delete(id: string): Promise<void> {
    return this.write('削除', (tx) => {
      tx.objectStore(TASKS).delete(id);
    });
  }

  replaceAll(tasks: Task[]): Promise<void> {
    return this.write('インポート', (tx) => {
      const store = tx.objectStore(TASKS);
      store.clear();
      for (const task of tasks) store.put(task);
    });
  }
}
