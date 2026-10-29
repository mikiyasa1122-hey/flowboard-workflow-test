# PLAN — FlowBoard 開発計画

仕様の正本はユーザーから渡された「FlowBoard — 開発ワークフロー検証用アプリ仕様」。
このファイルは全体計画・フェーズ・依存関係を示す。進み具合は [PROGRESS.md](PROGRESS.md)、次の一手は [NEXT_TASK.md](NEXT_TASK.md) を見る。

## 作業ブランチと流れ

- 作業は `aq-dlc/flowboard` ブランチで行い、Pull Request で CI を回す。
- `main` へのマージは人間が行う。マージで Deploy ワークフロー（品質チェック → GitHub Pages 公開 → スモークテスト）が走る。
- 各フェーズの終わりに「完了条件」を確認してからコミットし、PROGRESS.md と NEXT_TASK.md を更新する。

## フェーズと依存関係

```
Phase 1 初期構築 ─▶ Phase 2 タスク管理 ─▶ Phase 3 保存・検索・集計 ─▶ Phase 4 UI改善・PWA ─▶ Phase 5 総合テスト・公開
```

| Phase | 内容 | 依存 | 完了条件 |
|---|---|---|---|
| Phase 1 | Vite + React + TS、ESLint・型チェック、基本レイアウト、GitHub リポジトリ、初期 CI | なし | 画面表示・ビルド・CI 成功 |
| Phase 2 | データモデル（Zod）、CRUD、バリデーション、カンバンボード、単体テスト | Phase 1 | タスク管理の主要操作が動作し、単体テストが通る |
| Phase 3 | IndexedDB、検索・フィルタリング、ダッシュボード、インポート/エクスポート、保存復元テスト | Phase 2 | 永続化とデータ処理が動作し、テストが通る |
| Phase 4 | レスポンシブ、ダークモード、エラー表示、PWA、オフライン | Phase 3 | スマホ・PC・オフラインで操作できる |
| Phase 5 | Playwright E2E、異常系、CI/CD 最終整備、Pages 公開、README、動作確認 | Phase 4 | 仕様の完成条件をすべて満たす |

## 構成

| 層 | 場所 | 役割 |
|---|---|---|
| ドメイン | `src/domain/` | 型・Zod スキーマ・タスク操作・検索/ソート・集計・インポート検証（純粋関数、UI と保存処理に依存しない） |
| 保存 | `src/storage/` | IndexedDB へのアクセス（TaskRepository）。UI からは interface 越しに使う |
| 状態 | `src/state/` | React フック。リポジトリを呼び、成功したら画面状態を更新する |
| UI | `src/components/`, `src/App.tsx` | 画面・モーダル・通知 |
| テスト | `src/**/*.test.ts`（Vitest）、`e2e/`（Playwright） | |
| CI/CD | `.github/workflows/ci.yml`, `deploy.yml` | |

## 検証コマンド

```bash
npm run lint && npm run typecheck && npm test && npm run build && npm run e2e
```
