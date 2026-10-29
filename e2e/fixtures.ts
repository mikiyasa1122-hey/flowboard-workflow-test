import { test as base, expect } from '@playwright/test';

/**
 * すべてのテストで、ページ内の未処理エラーとコンソールエラーを収集し、
 * 1件でもあればテストを失敗させる。
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
      });
      await use(errors);
      expect(errors, '未処理エラー・コンソールエラーが発生しました').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
