# TEST_REPORT — テスト結果

## 最新の結果

| 日付 | 対象 | lint | typecheck | Vitest | build | Playwright | 備考 |
|---|---|---|---|---|---|---|---|
| 2026-10-29 | Phase 1（ローカル） | ✅ | ✅ | —（テストなし） | ✅ | ✅ 1/1 | スモークテストのみ |

## 既知の問題

- `npm audit`: low 4件（workbox-build → deepmerge、ビルド時のみ）。DECISIONS.md D3 参照。
