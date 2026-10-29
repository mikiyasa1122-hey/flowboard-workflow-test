import { z } from 'zod';
import { SCHEMA_VERSION, taskSchema, type Task } from './task';

export const EXPORT_APP_ID = 'flowboard';
/** インポートできるファイルの最大サイズ（5MB） */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
/** インポートできる最大件数 */
export const IMPORT_MAX_TASKS = 10_000;

export interface ExportFile {
  app: typeof EXPORT_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  tasks: Task[];
}

const exportFileSchema = z.object({
  app: z.literal(EXPORT_APP_ID, { error: 'FlowBoard のエクスポートファイルではありません' }),
  schemaVersion: z.number().int(),
  exportedAt: z.string(),
  tasks: z.array(z.unknown()).max(IMPORT_MAX_TASKS, `タスクは最大${IMPORT_MAX_TASKS}件までです`),
});

export function buildExport(tasks: readonly Task[], now: Date = new Date()): ExportFile {
  return {
    app: EXPORT_APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    tasks: [...tasks],
  };
}

export function exportFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `flowboard-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export type ImportResult = { ok: true; tasks: Task[] } | { ok: false; error: string };

/**
 * インポートするJSON文字列を検証する。1件でも不正があれば全体を拒否する（部分インポートしない）。
 */
export function parseImport(text: string): ImportResult {
  if (new TextEncoder().encode(text).length > IMPORT_MAX_BYTES) {
    return { ok: false, error: 'ファイルが大きすぎます（最大5MB）' };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON として読み込めません。ファイルが壊れていないか確認してください' };
  }

  const file = exportFileSchema.safeParse(json);
  if (!file.success) {
    const issue = file.error.issues[0];
    const where = issue.path.length > 0 ? `（${issue.path.join('.')}）` : '';
    return { ok: false, error: `ファイルの形式が正しくありません${where}: ${issue.message}` };
  }
  if (file.data.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `対応していないスキーマバージョンです（ファイル: ${file.data.schemaVersion}、対応: ${SCHEMA_VERSION}）`,
    };
  }

  const tasks: Task[] = [];
  const ids = new Set<string>();
  for (const [index, raw] of file.data.tasks.entries()) {
    const parsed = taskSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: `${index + 1}件目のタスクが不正です（${issue.path.join('.') || '全体'}）: ${issue.message}` };
    }
    if (ids.has(parsed.data.id)) {
      return { ok: false, error: `${index + 1}件目のタスクの id が重複しています: ${parsed.data.id}` };
    }
    ids.add(parsed.data.id);
    tasks.push(parsed.data);
  }
  return { ok: true, tasks };
}
