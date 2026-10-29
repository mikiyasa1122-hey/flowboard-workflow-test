import { toLocalDateString } from './filter';
import type { TaskInput } from './task';
import { createTask, type IdGenerator } from './taskOps';
import type { Task } from './task';

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

/** 初回起動時に用意するサンプルタスク（期限は起動日からの相対日付） */
export function createSampleTasks(now: Date = new Date(), idGen?: IdGenerator): Task[] {
  const inputs: TaskInput[] = [
    {
      title: 'FlowBoard の使い方を確認する',
      description: 'カードのタイトルをクリックすると編集できます。ステータスはカードのメニューで変えられます。',
      status: 'todo',
      priority: 'medium',
      dueDate: addDays(now, 3),
      tags: ['はじめに'],
    },
    {
      title: '週次レポートを提出する',
      description: '先週の進捗をまとめて共有する。',
      status: 'todo',
      priority: 'high',
      dueDate: addDays(now, -1),
      tags: ['仕事'],
    },
    {
      title: 'デザイン案のレビュー',
      description: '',
      status: 'doing',
      priority: 'high',
      dueDate: addDays(now, 1),
      tags: ['仕事', 'デザイン'],
    },
    {
      title: '本を1章読む',
      description: '',
      status: 'doing',
      priority: 'low',
      dueDate: null,
      tags: ['個人'],
    },
    {
      title: '開発環境をセットアップする',
      description: 'Node.js と npm を入れて、npm ci を実行する。',
      status: 'done',
      priority: 'medium',
      dueDate: addDays(now, -2),
      tags: ['はじめに'],
    },
  ];
  // 作成日時を1分ずつずらし、並び順を決定的にする
  return inputs.map((input, i) => createTask(input, new Date(now.getTime() - (inputs.length - i) * 60_000), idGen));
}
