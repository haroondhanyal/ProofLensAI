import { expect, test } from './fixtures/ui-test';
import { allure } from 'allure-playwright';

const themes = ['light', 'dark', 'slate', 'ocean', 'contrast'] as const;
const viewports = [
  { width: 320, height: 720 }, { width: 360, height: 780 }, { width: 390, height: 844 },
  { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 1024, height: 768 },
  { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1680, height: 1050 },
  { width: 1920, height: 1080 },
];
const modes = ['landing', 'sample workspace'] as const;
const matrix = themes.flatMap((theme) => viewports.flatMap((viewport) => modes.map((mode) => ({ theme, viewport, mode }))));
const api = process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1';

test.use({ screenshot: 'on', video: 'on' });

test.describe('System integration · 100 theme, viewport, and service combinations', () => {
  matrix.forEach((scenario, index) => {
    test(`SYS-INT-${String(index + 1).padStart(3, '0')} · ${scenario.theme} · ${scenario.viewport.width}px · ${scenario.mode}`, async ({ page, request }, testInfo) => {
      await allure.epic('System integration');
      await allure.feature('Responsive and service integration');
      await page.setViewportSize(scenario.viewport);
      await page.addInitScript((theme) => localStorage.setItem('prooflens-theme', theme), scenario.theme);
      const homeResponse = await page.goto('/');
      expect(homeResponse?.status()).toBe(200);
      await expect(page).toHaveTitle(/ProofLens AI/);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', scenario.theme);

      if (scenario.mode === 'sample workspace') {
        await page.getByRole('button', { name: 'Sign in' }).click();
        await page.getByRole('button', { name: /Explore sample workspace/ }).click();
        await expect(page.getByText('Sample reports only')).toBeVisible();
        await expect(page.getByText('SAMPLE-ONLY PREVIEW')).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
      } else {
        await expect(page.getByRole('button', { name: 'Analyze something' })).toBeVisible();
        if (scenario.viewport.width >= 768) {
          await expect(page.getByRole('navigation', { name: 'Public navigation' })).toBeVisible();
          await expect(page.getByRole('link', { name: 'What you can check' })).toBeVisible();
        }
      }

      const service = await request.get(new URL('/health', api).toString());
      expect(service.status(), 'ProofLens API health is reachable from the browser test').toBe(200);
      expect((await service.json()).data.status).toBe('ok');
      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
        bodyHeight: document.body.scrollHeight,
      }));
      expect(layout.content, `horizontal overflow at ${scenario.viewport.width}px`).toBeLessThanOrEqual(layout.viewport + 1);
      expect(layout.bodyHeight).toBeGreaterThan(scenario.viewport.height / 2);
      await testInfo.attach(`design-${scenario.theme}-${scenario.viewport.width}-${scenario.mode.replaceAll(' ', '-')}.png`, {
        body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
        contentType: 'image/png',
      });
    });
  });
});
