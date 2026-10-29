# DECISIONS — 技術選定と設計判断

| # | 日付 | 判断 | 理由 |
|---|---|---|---|
| D1 | 2026-10-29 | 推奨構成（TypeScript / React / Vite / CSS / IndexedDB / Zod / Vitest / Playwright / vite-plugin-pwa / GitHub Actions / GitHub Pages / npm）をそのまま採用 | 仕様の推奨どおり。追加のUIライブラリ・状態管理ライブラリは入れない（依存最小） |
| D2 | 2026-10-29 | 依存は 2026-10 時点の最新版（Vite 8、Vitest 5、Zod 4、React 19、ESLint 10、vite-plugin-pwa 2）。TypeScript は 6.0 系に固定 | 古い版に既知脆弱性（zod / vitest 系）があったため。TypeScript 7 は typescript-eslint が未対応（peer `<6.1`） |
| D3 | 2026-10-29 | `npm audit` の low 4件（workbox-build 経由の deepmerge）は許容 | ビルド時のみ使われ、利用者のブラウザには配信されない。上流の修正待ち |
| D4 | 2026-10-29 | Vite の `base` を常に `/flowboard-workflow-test/` にする（dev・preview・本番共通） | GitHub Pages のサブパスと同じ条件で E2E を回し、資産パスの不具合をローカル/CI で検出するため |
| D5 | 2026-10-29 | E2E は本番ビルドを `vite preview` で配信して実行 | Service Worker（オフライン）は本番ビルドでしか動かないため |
| D6 | 2026-10-29 | IndexedDB は薄い自前ラッパー（`idb` 等は使わない） | 依存最小。必要な操作は getAll / put / delete / 全置換 だけ |
| D7 | 2026-10-29 | 画面遷移はハッシュ（`#/board`, `#/dashboard`）で行い、ルーターライブラリを使わない | GitHub Pages で 404 にならず、再読み込みでも同じ画面に戻る |
| D8 | 2026-10-29 | インポートは「全件置き換え」。1トランザクションで clear → put し、失敗時は abort | 「失敗時に既存データを変更しない」を確実に保証するため。確認ダイアログで件数を示す |
| D9 | 2026-10-29 | 書き込みは「IndexedDB 保存成功 → 画面状態を更新」の順 | 保存失敗時に画面と保存内容が食い違わないようにする（失敗時はエラー通知のみ） |
| D10 | 2026-10-29 | モーダル・確認ダイアログはネイティブ `<dialog>` + `showModal()` | フォーカス閉じ込め・Esc で閉じる・背景の不活性化をブラウザ標準で得られる |
| D11 | 2026-10-29 | グラフは SVG を自前描画（チャートライブラリなし） | ステータス別3本の棒グラフだけで十分。依存最小 |
| D12 | 2026-10-29 | 期限（dueDate）は `YYYY-MM-DD` の日付文字列で保存し、期限超過は「ローカル日付で今日より前、かつ未完了」 | 日付だけの値を日時にするとタイムゾーンで1日ずれるため |
| D13 | 2026-10-29 | ドラッグ＆ドロップは追加機能として HTML5 DnD で実装し、基本操作はステータス選択（キーボード操作可）で行う | 仕様どおり基本操作を優先。DnD はマウス向けの補助 |
| D14 | 2026-10-29 | CI は `ci.yml`（PR・手動・再利用）と `deploy.yml`（main push：ci.yml 呼び出し → build → deploy → smoke）に分ける | PR と main で同じ品質チェックを使い、成功時のみデプロイするため |
| D15 | 2026-10-29 | この PC には Node.js がなかったため、ユーザーの承認を得て winget で Node.js 24 LTS を入れた | 開発に必要 |
