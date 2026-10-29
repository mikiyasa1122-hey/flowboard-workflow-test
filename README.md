# FlowBoard

タスク管理・進捗可視化 PWA。個人のタスクを作成・編集し、カンバンボードとダッシュボードで進捗を確認できます。データはブラウザの IndexedDB に保存され、バックエンドなし・オフラインでも動きます。

- 公開URL: https://mikiyasa1122-hey.github.io/flowboard-workflow-test/
- リポジトリ: https://github.com/mikiyasa1122-hey/flowboard-workflow-test

## 機能

- **タスク管理**: 作成・詳細表示・編集・削除（確認ダイアログあり）、ステータス（TODO / DOING / DONE）、優先度、期限、タグ（最大5件）。作成・更新・完了日時を自動で記録
- **カンバンボード**: 3列表示、列ごとの件数、優先度の色分け、期限超過の強調、空状態の表示。カードのステータス選択（キーボード操作可）とドラッグ＆ドロップで移動
- **検索・絞り込み**: タイトル・説明文の検索、ステータス・優先度・タグ・期限超過での絞り込み、作成日・期限・優先度での並び替え、一括解除
- **ダッシュボード**: 全体・未着手・進行中・完了・期限超過の件数、完了率、優先度別件数、ステータス別グラフ
- **データ**: IndexedDB に自動保存（初回はサンプルタスクを用意）。JSON エクスポート/インポート（検証つき・失敗時は既存データを変更しない）
- **UI**: レスポンシブ（375px 以上）、ダーク/ライトモード、通知、キーボードショートカット（`N` 新規作成、`/` 検索、`Esc` 閉じる）
- **PWA**: インストール可能、初回アクセス後はオフラインで起動・操作可能

インポート用のサンプルデータ: [samples/sample-tasks.json](samples/sample-tasks.json)

## セットアップ

必要なもの: Node.js 24 以上、npm

```bash
npm ci
npm run dev
```

ブラウザで http://localhost:5173/flowboard-workflow-test/ を開きます。

E2E テストを実行する場合は、最初に一度ブラウザを入れます。

```bash
npx playwright install chromium
```

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー |
| `npm run build` | 型チェック + 本番ビルド（`dist/`） |
| `npm run preview` | 本番ビルドを http://localhost:4173/flowboard-workflow-test/ で配信 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 型チェック |
| `npm test` | Vitest 単体テスト |
| `npm run e2e` | Playwright E2E（本番ビルドをサブパス配信して検証。事前に `npm run build`） |
| `npm run check` | 上記をすべて順に実行 |

## 構成

```
src/
  domain/    型・Zodスキーマ・タスク操作・検索/並び替え・集計・インポート検証（純粋関数）
  storage/   IndexedDB への保存（TaskRepository）
  state/     React フック（状態・通知・テーマ）
  components/ 画面部品
e2e/         Playwright テスト
scripts/     アイコン生成・スモークテスト・CI/ドキュメント確認
docs/        開発ドキュメント
```

## CI/CD

- **Pull Request**: `.github/workflows/ci.yml` — 依存インストール → ESLint → 型チェック → Vitest → ビルド → Playwright。失敗時は Playwright のレポートとトレースを Artifact（`playwright-report`）として保存します。
- **main への push**: `.github/workflows/deploy.yml` — 同じ品質チェック → GitHub Pages へデプロイ → 公開URLのスモークテスト（`scripts/smoke.mjs`）。

## 開発ドキュメント

- [docs/PLAN.md](docs/PLAN.md) — 全体計画・フェーズ
- [docs/PROGRESS.md](docs/PROGRESS.md) — 進捗・現在の状態
- [docs/NEXT_TASK.md](docs/NEXT_TASK.md) — 次のタスクと再開手順
- [docs/DECISIONS.md](docs/DECISIONS.md) — 技術選定・設計判断
- [docs/TEST_REPORT.md](docs/TEST_REPORT.md) — テスト結果・既知の問題

## ライセンス

[MIT](LICENSE)
