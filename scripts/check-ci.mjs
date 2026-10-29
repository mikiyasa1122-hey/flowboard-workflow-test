// 現在の HEAD コミットに対する GitHub Actions の CI が成功しているかを確認する。
// 使い方: node scripts/check-ci.mjs   （gh CLI でログイン済みであること）
import { execFileSync } from 'node:child_process';

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();

const head = run('git', ['rev-parse', 'HEAD']);
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
const runs = JSON.parse(
  run('gh', ['run', 'list', '--workflow', 'ci.yml', '--branch', branch, '--limit', '20', '--json', 'headSha,status,conclusion,url,event']),
);
const forHead = runs.filter((r) => r.headSha === head);
if (forHead.length === 0) {
  console.error(`HEAD ${head.slice(0, 7)} の CI 実行が見つかりません（push 済みか、PR があるか確認してください）`);
  process.exit(1);
}
const latest = forHead[0];
console.log(`${latest.event} ${latest.status}/${latest.conclusion} ${latest.url}`);
process.exit(latest.status === 'completed' && latest.conclusion === 'success' ? 0 : 1);
