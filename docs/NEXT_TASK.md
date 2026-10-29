# NEXT_TASK — 次にやること

## 再開手順（どのセッションでも最初にやる）

1. `git status` と `git log --oneline -10` で未コミットの変更と最後のコミットを確認する。
2. `docs/PROGRESS.md` の「現在の状態」と、この下の「次のタスク」を読む。
3. 実コードとテスト結果で状態を確かめる: `npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
4. CI の状態: `gh pr checks 1` / `node scripts/check-ci.mjs`（HEAD に対する CI が成功しているか）
5. PROGRESS.md と実際の結果が食い違っていたら、実際の結果に合わせて PROGRESS.md を直す。
6. 下の「次のタスク」の未完了項目から再開する。完了済みの作業はやり直さない。

AQ-DLC を使っている場合は `python3 <plugin>/scripts/aqdlc.py status --project .` で未充足の完了条件も確認できる。

## 次のタスク

**Phase 5 の仕上げ**

- [x] E2E（主要フロー・無効入力・インポート/エクスポート・スマホ幅・キーボード・テーマ・オフライン）をローカルで成功させる
- [x] GitHub Pages を有効化（ソース: GitHub Actions）
- [x] PR の CI が HEAD で成功していることを確認する
- [x] 独立レビューの指摘に対応する
- [x] PR を Ready for review にする
- [ ] 人間が main にマージ
- [ ] マージ後: Deploy ワークフロー（品質チェック → Pages → スモークテスト）の成功と公開URLの表示を確認し、PROGRESS.md / TEST_REPORT.md を更新
