# FlowBoard

タスク管理・進捗可視化 PWA。個人のタスクを作成・編集し、カンバンボードとダッシュボードで進捗を確認できます。データはブラウザの IndexedDB に保存され、バックエンドなし・オフラインでも動きます。

- 公開URL: https://mikiyasa1122-hey.github.io/flowboard-workflow-test/
- リポジトリ: https://github.com/mikiyasa1122-hey/flowboard-workflow-test

## セットアップ

必要なもの: Node.js 24 以上、npm

```bash
npm ci
npm run dev
```

ブラウザで http://localhost:5173/flowboard-workflow-test/ を開きます。

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` | 型チェック + 本番ビルド（`dist/`） |
| `npm run preview` | 本番ビルドを http://localhost:4173/flowboard-workflow-test/ で配信 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 型チェック |
| `npm test` | Vitest 単体テスト |
| `npm run e2e` | Playwright E2E（事前に `npm run build` と `npx playwright install chromium`） |
| `npm run check` | 上記をすべて順に実行 |

## 開発ドキュメント

- [docs/PLAN.md](docs/PLAN.md) — 全体計画・フェーズ
- [docs/PROGRESS.md](docs/PROGRESS.md) — 進捗・現在の状態
- [docs/NEXT_TASK.md](docs/NEXT_TASK.md) — 次のタスクと再開手順
- [docs/DECISIONS.md](docs/DECISIONS.md) — 技術選定・設計判断
- [docs/TEST_REPORT.md](docs/TEST_REPORT.md) — テスト結果・既知の問題

## ライセンス

[MIT](LICENSE)
