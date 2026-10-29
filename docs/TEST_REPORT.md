# TEST_REPORT — テスト結果

## 最新の結果

| 日付 | 対象 | lint | typecheck | Vitest | build | Playwright | 備考 |
|---|---|---|---|---|---|---|---|
| 2026-10-29 | Phase 1（ローカル） | ✅ | ✅ | —（テストなし） | ✅ | ✅ 1/1 | スモークテストのみ |
| 2026-10-29 | Phase 1（CI run 40880474528） | ✅ | ✅ | ❌ | — | — | テストファイル0件で Vitest が exit 1 |
| 2026-10-29 | Phase 2（CI run 40880670801） | ✅ | ✅ | ✅ 27/27 | ✅ | ✅ 1/1 | 上記を修正 |
| 2026-10-29 | Phase 5（ローカル・AQ-DLC gate） | ✅ | ✅ | ✅ 67/67 | ✅ | ✅ 15/15 | `--repeat-each=2` でも 30/30 |
| 2026-10-29 | Phase 5（CI run 40882946236, HEAD 13be4a7） | ✅ | ✅ | ✅ | ✅ | ✅ | PR の全ステップ成功 |
| 2026-10-29 | レビュー対応後（ローカル） | ✅ | ✅ | ✅ 75/75 | ✅ | ✅ 20/20 | 独立レビュー B1・N1〜N9 に対応 |
| 2026-10-29 | main マージ後 Deploy（run 40888663936, 5a3f8fc） | ✅ | ✅ | ✅ | ✅ | ✅ | Pages 公開 → 公開URLのスモークテスト成功 |

### 公開URLの確認（2026-10-29）

- `node scripts/smoke.mjs https://mikiyasa1122-hey.github.io/flowboard-workflow-test/` 成功（HTML・JS・CSS・manifest・アイコン・sw.js が 200）
- ブラウザで表示し、ボードとサンプルタスクが出ること、コンソールエラーがないことを確認

## 単体テスト（Vitest, 75件）

| ファイル | 内容 |
|---|---|
| `src/domain/task.test.ts` | status と completedAt・作成/更新日時の整合性、入力バリデーションの境界値（title 0/1/80/81字、description 500/501字、tags 5/6件・空・重複・21字、status/priority 列挙、日付の実在チェック、UUID、ISO 8601） |
| `src/domain/taskOps.test.ts` | 作成（UUID・日時の自動記録）、更新（id・createdAt 不変）、ステータス変更（completedAt の記録/消去）、削除、不正入力の例外 |
| `src/domain/filter.test.ts` | 検索（大小・全角半角、複数語 AND）、各フィルター、複合条件、期限超過判定、並び替え（優先度・作成日・期限、期限なしは最後） |
| `src/domain/stats.test.ts` | 完了率（0件で0%、四捨五入）、ステータス/優先度/期限超過の集計 |
| `src/domain/importExport.test.ts` | エクスポート形式、往復、不正 JSON・形式違い・バージョン違い・不正タスク・id 重複・サイズ超過の拒否、同梱サンプルの検証 |
| `src/state/taskStoreActions.test.ts` | 保存・削除・置き換えに失敗したら一覧を変えずにエラーを返す、保存完了前に一覧を返さない |
| `src/storage/taskRepository.test.ts` | IndexedDB（fake-indexeddb）: 初回のみサンプル投入、開き直し後の保持、全件置き換え、**置き換え失敗時に既存データ不変**、壊れたレコードの読み飛ばし、DB を開けない時のエラー |

## E2E（Playwright, 20件）

本番ビルドを `vite preview` で `/flowboard-workflow-test/` に配信して実行する。全テストで未処理エラー・コンソールエラーを検知したら失敗する（`e2e/fixtures.ts`）。

| ファイル | 内容 |
|---|---|
| `e2e/main-flow.spec.ts` | 仕様の手順 1〜14（起動 → 作成 → TODO 表示 → DOING → DONE → 集計 → 再読み込み → 保持 → 検索/絞り込み → 編集 → エクスポート → インポート → 削除 → 削除の保持） |
| `e2e/validation.spec.ts` | 無効入力（空・空白・81字・501字・タグ6件）で保存されない、境界値は保存できる、削除キャンセル |
| `e2e/import-export.spec.ts` | 不正ファイル4種でエラー表示・データ不変、確認キャンセル、同梱サンプルのインポートと往復 |
| `e2e/mobile.spec.ts` | 375px で横スクロールなし・主要操作、キーボード（N / Enter / Esc / /、フォーカス復帰）、テーマ切り替えと保持、OS のダーク設定 |
| `e2e/offline.spec.ts` | 初回オンライン後にオフラインで起動、作成・ステータス変更・編集・削除、オフライン再読み込み後も保持 |
| `e2e/resilience.spec.ts` | IndexedDB 書き込み失敗（作成・編集・ステータス変更・削除）でエラー表示・データ不変・入力保持、読み込み中表示、読み込み失敗表示、2タブ間の同期、スキップリンク |
| `e2e/smoke.spec.ts` | サブパスで CSS・JS・画像・マニフェスト・アイコンが読み込める |

## 開発中に見つかった不具合

| 発見方法 | 内容 | 対応 |
|---|---|---|
| 単体テスト | `replaceAll` で `put` が同期例外を投げると、トランザクションが中止されず `clear` が確定して既存データが消える | 例外時に `tx.abort()` する（`src/storage/indexedDbRepository.ts`） |
| ブラウザ確認 | `<dialog>.showModal()` が閉じるボタンにフォーカスし、タイトル欄に入力できない | `data-autofocus` の要素へフォーカスを移す |
| 独立レビュー | 保存失敗・読み込み中の表示に検証がない（B1）、スキップリンクでダッシュボードからボードに切り替わる、モーダル表示中のエラー通知が操作できない、矛盾データのインポート、複数タブでの上書き、SW 自動更新で入力が消える 等 | すべて修正し、単体・E2E テストを追加 |
| CI | Phase 1 時点でテストファイルが0件のため Vitest が失敗 | Phase 2 のテストを追加 |

## 既知の問題

- 「新しいバージョンがあります」バナー（SW 更新）は E2E で自動検証していない（2つのビルドを順に配信する必要があるため）。
- `npm audit`: low 4件（workbox-build → deepmerge、ビルド時のみ）。DECISIONS.md D3 参照。
- ローカル環境メモ: Claude デスクトップアプリ経由で `npx playwright install` すると、ブラウザが AppData の仮想化された場所に入り、アプリ外のプロセスから見えないことがある。
