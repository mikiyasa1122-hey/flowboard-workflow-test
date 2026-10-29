import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildExport, exportFileName, IMPORT_MAX_BYTES, parseImport } from './importExport';
import { SCHEMA_VERSION } from './task';
import { createTask } from './taskOps';

const NOW = new Date('2026-10-29T03:00:00.000Z');
const tasks = [createTask({ title: 'a', tags: ['x'] }, NOW), createTask({ title: 'b', status: 'done' }, NOW)];

function fileWith(overrides: Record<string, unknown>) {
  return JSON.stringify({ ...buildExport(tasks, NOW), ...overrides });
}

describe('buildExport（エクスポート）', () => {
  it('スキーマバージョンと全タスクを含む', () => {
    const file = buildExport(tasks, NOW);
    expect(file).toEqual({ app: 'flowboard', schemaVersion: SCHEMA_VERSION, exportedAt: NOW.toISOString(), tasks });
  });

  it('エクスポート → インポートで同じタスクに戻る（往復）', () => {
    const result = parseImport(JSON.stringify(buildExport(tasks, NOW)));
    expect(result).toEqual({ ok: true, tasks });
  });

  it('ファイル名は日付入り', () => {
    expect(exportFileName(new Date(2026, 9, 9))).toBe('flowboard-export-2026-10-09.json');
  });
});

describe('parseImport（インポート検証）', () => {
  it('0件のファイルも受け付ける', () => {
    expect(parseImport(fileWith({ tasks: [] }))).toEqual({ ok: true, tasks: [] });
  });

  it('JSON でないものは拒否', () => {
    const result = parseImport('{ not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('JSON として読み込めません');
  });

  it('FlowBoard の形式でないものは拒否', () => {
    expect(parseImport('[]').ok).toBe(false);
    expect(parseImport('null').ok).toBe(false);
    expect(parseImport(JSON.stringify({ tasks: [] })).ok).toBe(false);
    expect(parseImport(fileWith({ app: 'other' })).ok).toBe(false);
    expect(parseImport(fileWith({ tasks: 'x' })).ok).toBe(false);
  });

  it('スキーマバージョンが違うものは拒否', () => {
    const result = parseImport(fileWith({ schemaVersion: 999 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('スキーマバージョン');
    expect(parseImport(fileWith({ schemaVersion: '1' })).ok).toBe(false);
  });

  it('1件でも不正なタスクがあれば全体を拒否し、何件目かを示す', () => {
    const bad = [...tasks, { ...tasks[0], id: crypto.randomUUID(), title: '' }];
    const result = parseImport(fileWith({ tasks: bad }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('3件目');
  });

  it('不正な値の各パターンを拒否', () => {
    const base = tasks[0];
    const cases = [
      { ...base, id: 'not-uuid' },
      { ...base, status: 'archived' },
      { ...base, priority: 'urgent' },
      { ...base, title: 'a'.repeat(81) },
      { ...base, description: 'x'.repeat(501) },
      { ...base, tags: ['1', '2', '3', '4', '5', '6'] },
      { ...base, dueDate: '2026-02-30' },
      { ...base, createdAt: 'yesterday' },
      { ...base, status: 'done', completedAt: null },
      { ...base, status: 'todo', completedAt: '2026-10-29T03:00:00.000Z' },
      { ...base, updatedAt: '2000-01-01T00:00:00.000Z' },
      { title: 'id なし' },
      'string',
      null,
    ];
    for (const bad of cases) {
      expect(parseImport(fileWith({ tasks: [bad] })).ok, JSON.stringify(bad)).toBe(false);
    }
  });

  it('id の重複は拒否', () => {
    const result = parseImport(fileWith({ tasks: [tasks[0], { ...tasks[1], id: tasks[0].id }] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('重複');
  });

  it('大きすぎるファイルは拒否', () => {
    const result = parseImport(' '.repeat(IMPORT_MAX_BYTES + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('大きすぎます');
  });

  it('リポジトリ同梱のサンプルデータ（samples/sample-tasks.json）はインポートできる', () => {
    const text = readFileSync(new URL('../../samples/sample-tasks.json', import.meta.url), 'utf8');
    const result = parseImport(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tasks.length).toBeGreaterThan(0);
  });
});
