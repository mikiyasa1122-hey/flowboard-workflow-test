import { useCallback, useEffect, useRef, useState } from 'react';
import { createSampleTasks } from '../domain/sampleData';
import type { Status, Task, TaskInput } from '../domain/task';
import { changeStatus, createTask, updateTask } from '../domain/taskOps';
import type { TaskRepository } from '../storage/taskRepository';
import { deleteTask, replaceTasks, saveTask } from './taskStoreActions';

export type LoadState = { phase: 'loading' } | { phase: 'ready' } | { phase: 'error'; message: string };

export interface TaskStore {
  tasks: Task[];
  load: LoadState;
  /** 読み込み時に検証で読み飛ばしたレコード数 */
  skipped: number;
  create(input: TaskInput): Promise<Task>;
  update(id: string, patch: Partial<TaskInput>): Promise<Task>;
  setStatus(id: string, status: Status): Promise<Task>;
  remove(id: string): Promise<void>;
  replaceAll(tasks: Task[]): Promise<void>;
}

/** 同じブラウザの他のタブへ「保存内容が変わった」ことを知らせるチャンネル名 */
const SYNC_CHANNEL = 'flowboard-sync';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * タスク一覧の状態。書き込みは「保存に成功してから画面を更新」の順に行い、
 * 失敗したら例外を呼び出し元に返す（画面状態は変えない）。
 * 他のタブで保存されたら読み込み直し、古い内容で上書きしないようにする。
 */
export function useTaskStore(repository: TaskRepository): TaskStore {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [load, setLoad] = useState<LoadState>({ phase: 'loading' });
  const [skipped, setSkipped] = useState(0);
  const tasksRef = useRef<Task[]>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const commit = useCallback((next: Task[]) => {
    tasksRef.current = next;
    setTasks(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const reload = () =>
      repository
        .loadOrSeed(() => createSampleTasks())
        .then((result) => {
          if (cancelled) return;
          commit(result.tasks);
          setSkipped(result.skipped);
          setLoad({ phase: 'ready' });
        })
        .catch((error: unknown) => {
          if (!cancelled) setLoad({ phase: 'error', message: errorMessage(error) });
        });
    void reload();

    const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(SYNC_CHANNEL);
    if (channel) channel.onmessage = () => void reload();
    channelRef.current = channel;
    return () => {
      cancelled = true;
      channel?.close();
      channelRef.current = null;
    };
  }, [repository, commit]);

  const apply = useCallback(
    (next: Task[]) => {
      commit(next);
      channelRef.current?.postMessage('changed');
    },
    [commit],
  );

  const find = useCallback((id: string) => {
    const task = tasksRef.current.find((t) => t.id === id);
    if (!task) throw new Error('タスクが見つかりません（他の操作で削除された可能性があります）');
    return task;
  }, []);

  const save = useCallback(
    async (task: Task) => {
      apply(await saveTask(repository, tasksRef.current, task));
      return task;
    },
    [repository, apply],
  );

  const create = useCallback((input: TaskInput) => save(createTask(input)), [save]);

  const update = useCallback(
    (id: string, patch: Partial<TaskInput>) => save(updateTask(find(id), patch)),
    [save, find],
  );

  const setStatus = useCallback(
    async (id: string, status: Status) => {
      const current = find(id);
      const next = changeStatus(current, status);
      return next === current ? current : save(next);
    },
    [save, find],
  );

  const remove = useCallback(
    async (id: string) => apply(await deleteTask(repository, tasksRef.current, id)),
    [repository, apply],
  );

  const replaceAll = useCallback(
    async (next: Task[]) => apply(await replaceTasks(repository, next)),
    [repository, apply],
  );

  return { tasks, load, skipped, create, update, setStatus, remove, replaceAll };
}
