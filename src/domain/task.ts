import { z } from 'zod';

/** 保存データ・エクスポートJSONのスキーマバージョン */
export const SCHEMA_VERSION = 1;

export const STATUSES = ['todo', 'doing', 'done'] as const;
export const PRIORITIES = ['low', 'medium', 'high'] as const;

export const TITLE_MAX = 80;
export const DESCRIPTION_MAX = 500;
export const TAGS_MAX = 5;
export const TAG_LENGTH_MAX = 20;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  todo: 'TODO',
  doing: 'DOING',
  done: 'DONE',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const isoDateTime = z.iso.datetime({ offset: true, error: 'ISO 8601 形式の日時が必要です' });

/** YYYY-MM-DD 形式で、実在する日付か */
export const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '期限は YYYY-MM-DD 形式で入力してください')
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, '存在しない日付です');

const tagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1, 'タグは1文字以上にしてください')
      .max(TAG_LENGTH_MAX, `タグは${TAG_LENGTH_MAX}文字以内にしてください`),
  )
  .max(TAGS_MAX, `タグは最大${TAGS_MAX}件までです`)
  .refine((tags) => new Set(tags).size === tags.length, '同じタグが重複しています');

/** ユーザーが入力する項目 */
export const taskInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'タイトルは必須です')
    .max(TITLE_MAX, `タイトルは${TITLE_MAX}文字以内にしてください`),
  description: z
    .string()
    .max(DESCRIPTION_MAX, `説明は${DESCRIPTION_MAX}文字以内にしてください`)
    .default(''),
  status: z.enum(STATUSES, { error: 'ステータスが不正です' }).default('todo'),
  priority: z.enum(PRIORITIES, { error: '優先度が不正です' }).default('medium'),
  dueDate: dueDateSchema.nullable().default(null),
  tags: tagsSchema.default([]),
});

/** 保存されるタスク */
export const taskSchema = taskInputSchema.extend({
  id: z.uuid({ error: 'id は UUID である必要があります' }),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  completedAt: isoDateTime.nullable().default(null),
});

export type TaskInput = z.input<typeof taskInputSchema>;
export type Task = z.output<typeof taskSchema>;

export class ValidationError extends Error {
  readonly issues: { path: string; message: string }[];

  constructor(issues: { path: string; message: string }[]) {
    super(issues.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message)).join('\n'));
    this.name = 'ValidationError';
    this.issues = issues;
  }

  /** フィールド名 → 最初のエラーメッセージ */
  fieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const issue of this.issues) {
      const key = issue.path.split('.')[0] ?? '';
      if (!(key in result)) result[key] = issue.message;
    }
    return result;
  }

  static fromZod(error: z.ZodError): ValidationError {
    return new ValidationError(
      error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
}
