# PROGRESS — 進捗

最終更新: 2026-10-29

## 現在の状態

- 作業ブランチ: `aq-dlc/flowboard`（PR: https://github.com/mikiyasa1122-hey/flowboard-workflow-test/pull/1）
- 現在のフェーズ: **Phase 5 — main マージ待ち（マージ後に Pages デプロイを確認）**
- GitHub Pages: 有効化済み（ソース: GitHub Actions）。初回デプロイは PR を main にマージしたときに走る

| Phase | 状態 | 確認方法・結果 |
|---|---|---|
| Phase 1 初期構築 | ✅ 完了 | CI 初回は失敗（単体テスト0件で Vitest が exit 1）→ テスト追加で成功（run 40880670801） |
| Phase 2 タスク管理 | ✅ 完了 | 単体テスト（task / taskOps）、ブラウザで作成・ステータス変更を確認 |
| Phase 3 保存・検索・集計 | ✅ 完了 | 単体テスト（filter / stats / importExport / taskRepository）。replaceAll のトランザクション不具合を検出・修正 |
| Phase 4 UI改善・PWA | ✅ 完了 | E2E（mobile / offline）、ブラウザで 375px・ダークモードを目視確認 |
| Phase 5 総合テスト・公開 | 🔄 マージ待ち | Vitest 75件・E2E 20件成功、PR の CI 成功（run 40885846919）、独立レビュー指摘（blocking 1・non-blocking 9）対応済み。Pages デプロイのみ未確認 |

## 実装済み

- タスク CRUD・バリデーション（Zod）・削除確認・日時の自動記録
- カンバンボード（3列・件数・優先度・期限超過・空状態・ステータス選択・ドラッグ＆ドロップ）
- 検索・絞り込み・並び替え・一括解除・0件メッセージ
- ダッシュボード（件数・完了率・優先度別・ステータス別 SVG グラフ）
- IndexedDB 永続化（スキーマバージョン1、初回サンプル、読み込み中/失敗表示、壊れたレコードの読み飛ばし）
- JSON エクスポート/インポート（スキーマバージョン、検証、確認ダイアログ、全件置き換えは1トランザクション）
- レスポンシブ・ダーク/ライト・サイドバー/モバイルナビ・通知・キーボードショートカット・a11y
- PWA（マニフェスト・アイコン・Service Worker・オフライン起動）
- CI（PR）/ Deploy（main → Pages → スモークテスト）
- 保存失敗時のエラー表示（入力保持）、読み込み中/読み込み失敗表示、複数タブ同期、SW 更新の確認バナー

## 未実装・未確認

- GitHub Pages への実デプロイと公開URLのスモークテスト（main マージ後に Deploy ワークフローで確認）
