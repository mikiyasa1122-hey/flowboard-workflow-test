# NEXT_TASK — 次にやること

## 再開手順（どのセッションでも最初にやる）

1. `git status` と `git log --oneline -10` で未コミットの変更と最後のコミットを確認する。
2. `docs/PROGRESS.md` の「現在の状態」と、この下の「次のタスク」を読む。
3. 実コードとテスト結果で状態を確かめる: `npm ci && npm run lint && npm run typecheck && npm test && npm run build && npm run e2e`
4. PROGRESS.md と実際の結果が食い違っていたら、実際の結果に合わせて PROGRESS.md を直す。
5. 下の「次のタスク」の未完了項目から再開する。完了済みの作業はやり直さない。

## 次のタスク

**Phase 1 の CI 成功を確認する → Phase 2 に進む**

- [ ] PR の CI（`CI / Lint / Typecheck / Unit / Build / E2E`）が成功したことを確認する
- [ ] Phase 2: `src/domain/task.ts`（Zod スキーマ）と `src/domain/taskOps.ts`（作成・更新・ステータス変更・削除）の単体テスト
- [ ] Phase 2: カンバンボード（3列・件数・優先度・期限超過・空状態）、タスク作成/編集モーダル、削除確認
