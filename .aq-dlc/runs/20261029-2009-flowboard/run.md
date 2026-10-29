# flowboard

- run_id: 20261029-2009-flowboard
- 開始: 2026-10-29T20:09:44+09:00

## 01 要求と成功条件
ユーザー提示の「FlowBoard — 開発ワークフロー検証用アプリ仕様」が正本。R1〜R11 に分解（state.json）。

### 仮定
- インポートは「全件置き換え」（マージではない）。確認ダイアログで件数を示す
- 完了率は小数第1位で四捨五入して表示
- 期限超過 = 未完了かつ期限日がローカル日付の今日より前（今日が期限なら超過ではない）
- タグは1タスク最大5件・各20文字以内・重複不可（20文字は仕様にないため追加した制約）
- 画面遷移はハッシュ（#/board, #/dashboard）
- main へのマージは人間が行うため、Pages デプロイの実確認はマージ後（V14b は manual）

## 02 Failure First
- 入力の境界値（K1）、日時の自動記録（K2）→ Zod スキーマとタスク操作の単体テスト
- 永続化の消失・サンプル再投入・壊れたレコード（K8）→ fake-indexeddb で開き直しを再現
- インポート失敗時の部分的な破壊（K9）→ 単体（検証・トランザクション）＋ E2E
- サブパスでの資産404・SW（K11, K14）→ 本番ビルドを /flowboard-workflow-test/ で配信して全 E2E を実行
- 未処理エラー（K12）→ E2E fixture で pageerror / console.error を検知して失敗

## 03 設計・実装
仕様の推奨構成をそのまま採用（docs/DECISIONS.md D1〜D15）。domain（純粋関数）/ storage（TaskRepository）/ state（フック）/ components の4層。

## 04 Quality Gate / レビュー
- gate 1回目・2回目: e2e が FAIL。Playwright のブラウザが Claude アプリ（MSIX）の AppData 仮想化領域に入っていて、gate の Python から見えなかった → 実パスへコピーして解決（コード変更なし）
- gate 3回目: 全 check PASS。V14b（マージ後の公開URL確認）のみ manual で未充足
- gate 4回目: e2e FAIL。レビュー担当が同じフォルダで Playwright を並行実行し test-results を消したため（ENOENT）。レビュー終了後に再実行
- 独立レビュー: blocking 1（B1: R5 の「保存失敗時のエラー表示」「読み込み中表示」に検証がない）、non-blocking 9（N1 スキップリンクで画面が変わる、N2 モーダル中の通知が操作不可、N3 矛盾データのインポート、N4 複数タブの上書き、N5 SW 自動更新で入力消失、N6 onversionchange、N7 CI cancel、N8 a11y、N9 検証の精度・launch.json）→ すべて対応

## 05 修正ループ
1. CI 初回失敗: Phase 1 のコミットにテストが0件 → Vitest は「No test files found」で exit 1。Phase 2 のテストを追加
2. 単体テストで実バグ検出: IndexedDB で put() が同期例外を投げてもトランザクションは自動 abort されない → clear が確定して既存データ消失。tx.abort() を追加
3. ブラウザ確認: showModal() が最初のフォーカス可能要素（×ボタン）にフォーカス → data-autofocus へ移す
4. ESLint（react-hooks v7）: effect 内の setState を禁止 → タグ条件を派生値で無効化する形に変更
5. E2E: tsc -b が e2e も型検査するため、型エラーでビルドが止まり古い dist を検証していた → 型を修正。ロケーターの部分一致（「ボード」⊂「ダッシュボード」）を exact に

## 06 Memory
- 保存/統合: F-0005（IndexedDB 同期例外で abort されない）, F-0006（Vitest 0件で CI 失敗）, F-0007（Claude デスクトップの AppData 仮想化で gate からツールが見えない）, F-0008（showModal 後に autoFocus が効かない）, F-0009（showModal 中は外側の通知が inert）, S-0002（サブパス PWA は本番ビルドを同じサブパスで E2E）, W-0004（失敗系はストレージを壊して E2E）, P-0001（プロジェクトの技術構成・規約）。F-0002 は近いが別状況のため統合しない
- SKIP（保留した候補）: 「tsc -b に e2e を含めると型エラーで古い dist を E2E する」（S-0002 の注意点に記載済み）／「Playwright ロケーターの部分一致（ボード⊂ダッシュボード）」（一般的すぎる）
- REVIEW の結果: 対象なし（rule の追加・active 化・global 昇格なし）
- Skill改善提案:
  - gate の run_cmd が text=True で cp932 デコードし、UTF-8 出力で例外になりログが空になる。encoding='utf-8', errors='replace' を指定してほしい
  - 独立レビュー（サブエージェント）と gate を並行で走らせると、同じ test-results を奪い合う。reviewer にはテスト実行時に別の出力先（--output）を使うよう指示するか、レビュー中は gate を走らせない旨を手順に書くとよい
  - main マージが人間の担当のため、デプロイ後の確認は manual verification にするしかない。「マージ後に確認する verification」の扱い（PR 作成時点の完了判定から除外する等）を手順に明記してほしい

## 結果
（requirement → 証拠 の対応、残った注意点）
