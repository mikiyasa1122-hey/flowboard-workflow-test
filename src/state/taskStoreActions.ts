import type { Task } from '../domain/task';
import { removeTask, upsertTask } from '../domain/taskOps';
import type { TaskRepository } from '../storage/taskRepository';

/*
 * 画面状態を変える書き込み処理。どれも「保存に成功してから新しい一覧を返す」。
 * 保存が失敗したら例外をそのまま投げ、呼び出し側の一覧は変わらない。
 */

export async function saveTask(repository: TaskRepository, tasks: readonly Task[], task: Task): Promise<Task[]> {
  await repository.put(task);
  return upsertTask(tasks, task);
}

export async function deleteTask(repository: TaskRepository, tasks: readonly Task[], id: string): Promise<Task[]> {
  const next = removeTask(tasks, id);
  await repository.delete(id);
  return next;
}

export async function replaceTasks(repository: TaskRepository, next: Task[]): Promise<Task[]> {
  await repository.replaceAll(next);
  return next;
}
