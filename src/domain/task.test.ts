import { describe, expect, it } from 'vitest';
import { dueDateSchema, taskInputSchema, taskSchema, ValidationError } from './task';

const validTask = {
  id: '3f1c2b7e-8a4d-4c1e-9b2a-1d2e3f4a5b6c',
  title: 'タスク',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: null,
  tags: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  completedAt: null,
};

describe('taskInputSchema（入力バリデーション）', () => {
  it('タイトルだけでも既定値で補われる', () => {
    expect(taskInputSchema.parse({ title: 'a' })).toEqual({
      title: 'a',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      tags: [],
    });
  });

  it('タイトルは前後の空白を除いて1〜80文字', () => {
    expect(taskInputSchema.safeParse({ title: '' }).success).toBe(false);
    expect(taskInputSchema.safeParse({ title: '   ' }).success).toBe(false);
    expect(taskInputSchema.safeParse({ title: 'a'.repeat(80) }).success).toBe(true);
    expect(taskInputSchema.safeParse({ title: 'a'.repeat(81) }).success).toBe(false);
    expect(taskInputSchema.parse({ title: '  買い物  ' }).title).toBe('買い物');
  });

  it('タイトルがない・文字列でない場合は不正', () => {
    expect(taskInputSchema.safeParse({}).success).toBe(false);
    expect(taskInputSchema.safeParse({ title: 123 }).success).toBe(false);
  });

  it('説明は500文字まで', () => {
    expect(taskInputSchema.safeParse({ title: 'a', description: 'x'.repeat(500) }).success).toBe(true);
    expect(taskInputSchema.safeParse({ title: 'a', description: 'x'.repeat(501) }).success).toBe(false);
  });

  it('status / priority は列挙値のみ', () => {
    expect(taskInputSchema.safeParse({ title: 'a', status: 'doing', priority: 'high' }).success).toBe(true);
    expect(taskInputSchema.safeParse({ title: 'a', status: 'archived' }).success).toBe(false);
    expect(taskInputSchema.safeParse({ title: 'a', priority: 'urgent' }).success).toBe(false);
  });

  it('タグは最大5件・空文字なし・重複なし・20文字以内', () => {
    expect(taskInputSchema.safeParse({ title: 'a', tags: ['1', '2', '3', '4', '5'] }).success).toBe(true);
    expect(taskInputSchema.safeParse({ title: 'a', tags: ['1', '2', '3', '4', '5', '6'] }).success).toBe(false);
    expect(taskInputSchema.safeParse({ title: 'a', tags: [' '] }).success).toBe(false);
    expect(taskInputSchema.safeParse({ title: 'a', tags: ['x', 'x'] }).success).toBe(false);
    expect(taskInputSchema.safeParse({ title: 'a', tags: ['x'.repeat(21)] }).success).toBe(false);
  });
});

describe('dueDateSchema（期限）', () => {
  it('YYYY-MM-DD 形式の実在する日付だけを受け付ける', () => {
    expect(dueDateSchema.safeParse('2026-02-28').success).toBe(true);
    expect(dueDateSchema.safeParse('2028-02-29').success).toBe(true);
    expect(dueDateSchema.safeParse('2026-02-29').success).toBe(false);
    expect(dueDateSchema.safeParse('2026-13-01').success).toBe(false);
    expect(dueDateSchema.safeParse('2026/10/01').success).toBe(false);
    expect(dueDateSchema.safeParse('2026-10-01T00:00:00Z').success).toBe(false);
  });
});

describe('taskSchema（保存データ）', () => {
  it('正しいタスクを受け付ける', () => {
    expect(taskSchema.parse(validTask)).toEqual(validTask);
  });

  it('id は UUID', () => {
    expect(taskSchema.safeParse({ ...validTask, id: 'abc' }).success).toBe(false);
  });

  it('日時は ISO 8601', () => {
    expect(taskSchema.safeParse({ ...validTask, createdAt: '2026-10-01' }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, updatedAt: 'yesterday' }).success).toBe(false);
    expect(taskSchema.safeParse({ ...validTask, completedAt: '2026-10-02T09:00:00+09:00' }).success).toBe(true);
  });
});

describe('ValidationError', () => {
  it('フィールドごとの最初のメッセージを返す', () => {
    const result = taskInputSchema.safeParse({ title: '', description: 'x'.repeat(501) });
    expect(result.success).toBe(false);
    if (result.success) return;
    const error = ValidationError.fromZod(result.error);
    expect(error.fieldErrors()).toEqual({
      title: 'タイトルは必須です',
      description: '説明は500文字以内にしてください',
    });
    expect(error.message).toContain('title: タイトルは必須です');
  });
});
