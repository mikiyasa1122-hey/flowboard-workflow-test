---
id: P-0001
type: project
status: validated
scope: project:flowboard-workflow-test
tags: [project, stack, conventions]
stack: [typescript, react, vite, zod, indexeddb, vitest, playwright]
importance: medium
evidence: [flowboard-workflow-test/runs/20261029-2009-flowboard#gate]
applied_in: []
created: 2026-10-29
updated: 2026-10-29
---
# FlowBoard の技術構成と規約

## 適用条件
このリポジトリでの開発・修正。

## 学んだ行動
- 構成: React 19 / Vite 8 / TypeScript 6.0（7 は typescript-eslint 非対応）/ Zod 4 / ESLint 10 / Vitest 5 / Playwright / vite-plugin-pwa 2。Node 24（winget の LTS、PATH 未反映のシェルでは WinGet\Packages の node を先頭に足す）。
- 層: src/domain（純粋関数）→ src/storage（TaskRepository、IndexedDB）→ src/state（フック）→ src/components。保存成功後に画面状態を更新する。
- base は常に /flowboard-workflow-test/。E2E は本番ビルドを preview して実行（npm run build が先）。
- 検証: npm run lint / typecheck / test / build / e2e、node scripts/check-docs.mjs、node scripts/check-ci.mjs。
- 進捗は docs/PROGRESS.md・NEXT_TASK.md に記録し、再開時は NEXT_TASK.md の再開手順に従う。
- main へのマージは人間。Deploy ワークフローは main push で走る。

## 根拠・証拠
gate 全 check PASS、PR CI 成功。

## 例外・注意点
react-hooks v7 の set-state-in-effect ルールが有効。effect 内で setState せず派生値で表す。

## 元の実行記録
flowboard-workflow-test/runs/20261029-2009-flowboard
