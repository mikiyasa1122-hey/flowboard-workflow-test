import { test, expect } from './fixtures';

test('アプリがサブパスで起動し、CSS・JS・アイコンが読み込める', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('./');
  await expect(page).toHaveTitle(/FlowBoard/);
  await expect(page.getByRole('heading', { name: 'FlowBoard', level: 1 })).toBeVisible();

  const manifest = await page.request.get('manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const icon = await page.request.get('icons/icon-192.png');
  expect(icon.ok()).toBe(true);
  expect(failed).toEqual([]);
});
