// 中断・再開に必要な開発ドキュメントがそろっているかを確認する。
// 使い方: node scripts/check-docs.mjs
import { existsSync, readFileSync } from 'node:fs';

const required = {
  'docs/PLAN.md': ['# ', 'Phase 1', 'Phase 5'],
  'docs/PROGRESS.md': ['# ', '現在の状態'],
  'docs/NEXT_TASK.md': ['# '],
  'docs/DECISIONS.md': ['# '],
  'docs/TEST_REPORT.md': ['# ', '既知の問題'],
  'README.md': ['セットアップ'],
  LICENSE: ['MIT License'],
  'samples/sample-tasks.json': ['schemaVersion'],
};

let ok = true;
for (const [file, needles] of Object.entries(required)) {
  if (!existsSync(file)) {
    console.error(`NG  ${file} がありません`);
    ok = false;
    continue;
  }
  const text = readFileSync(file, 'utf8');
  const missing = needles.filter((n) => !text.includes(n));
  if (missing.length > 0) {
    console.error(`NG  ${file} に ${missing.join(', ')} がありません`);
    ok = false;
  } else {
    console.log(`ok  ${file}`);
  }
}
process.exit(ok ? 0 : 1);
