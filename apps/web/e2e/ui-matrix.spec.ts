import { expect, test } from './fixtures/ui-test';
import { faker } from '@faker-js/faker';

const themes = ['light', 'dark', 'slate', 'ocean', 'contrast'] as const;
const viewports = [
  { width: 320, height: 640 }, { width: 360, height: 740 }, { width: 375, height: 812 },
  { width: 390, height: 844 }, { width: 414, height: 896 }, { width: 600, height: 900 },
  { width: 768, height: 1024 }, { width: 900, height: 900 }, { width: 1024, height: 768 },
  { width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1440, height: 900 },
  { width: 1536, height: 960 }, { width: 1728, height: 1117 }, { width: 1920, height: 1080 },
];
const sampleTypes = [
  { label: 'URL-safe', type: 'URL', heading: /URL example/, cardIndex: 0 },
  { label: 'URL-caution', type: 'URL', heading: /URL example/, cardIndex: 1 },
  { label: 'MESSAGE', type: 'MESSAGE', heading: /MESSAGE example/ },
  { label: 'QR', type: 'QR', heading: /QR example/ },
];

async function openSample(page: import('@playwright/test').Page, theme = 'light') {
  await page.addInitScript((value) => localStorage.setItem('prooflens-theme', value), theme);
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: /Explore sample workspace/ }).click();
  await expect(page.getByText('Sample reports only')).toBeVisible();
}

test.use({ screenshot: 'on', video: 'on' });

test.describe('UI smoke · 60 report and responsive combinations', () => {
  const combos = viewports.flatMap((viewport, viewportIndex) => sampleTypes.map((sample, sampleIndex) => ({
    viewport, viewportIndex, sample, sampleIndex,
  })));

  for (const { viewport, viewportIndex, sample, sampleIndex } of combos) {
    test(`UI-SMOKE-${String(viewportIndex * 4 + sampleIndex + 1).padStart(3, '0')} · ${viewport.width}x${viewport.height} · ${sample.label} report`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openSample(page);
      await page.getByRole('button', { name: new RegExp(`${sample.type} · EXAMPLE`) }).first().click();
      await expect(page.getByText('SAMPLE REPORT · NOT A LIVE CHECK')).toBeVisible();
      await expect(page.getByRole('heading', { name: sample.heading })).toBeVisible();
      const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      expect(layout.scroll, `horizontal overflow at ${viewport.width}px`).toBeLessThanOrEqual(layout.width + 1);
    });
  }
});

test.describe('UI regression · 80 workspace, theme, and navigation combinations', () => {
  const destinations = [
    { nav: 'History', heading: /Scan history/ },
    { nav: 'Help', heading: /Use ProofLens with care\./ },
    { nav: 'Privacy', heading: /Know what happens to a check\./ },
    { nav: 'History', heading: /Scan history/ },
  ];
  const cases = Array.from({ length: 80 }, (_, index) => ({
    id: index + 1,
    theme: themes[index % themes.length],
    destination: destinations[index % destinations.length],
    viewport: viewports[(index * 7) % viewports.length],
  }));

  for (const scenario of cases) {
    test(`UI-REG-${String(scenario.id).padStart(3, '0')} · ${scenario.theme} · ${scenario.destination.nav}`, async ({ page }) => {
      await page.setViewportSize(scenario.viewport);
      await openSample(page, scenario.theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', scenario.theme);
      await page.getByRole('button', { name: scenario.destination.nav, exact: true }).click();
      await expect(page.getByRole('heading', { name: scenario.destination.heading })).toBeVisible();
      if (scenario.destination.nav === 'History') {
        await expect(page.getByText('DEMO-MESSAGE')).toBeVisible();
        await expect(page.getByText(/SAMPLE ONLY/).first()).toBeVisible();
      }
      const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      expect(layout.scroll, `horizontal overflow at ${scenario.viewport.width}px`).toBeLessThanOrEqual(layout.width + 1);
    });
  }
});

test.describe('UI negative · 110 invalid form and boundary cases', () => {
  async function signup(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.getByRole('button', { name: /Create account/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
  }

  const invalidEmails = Array.from({ length: 40 }, (_, index) => {
    const local = faker.string.alphanumeric({ length: 8 }).toLowerCase();
    const defects = [local, `@${local}.example`, `${local}@`, `${local}@@example.com`, `${local} example.com`, `${local}@example..com`, `${local} ${local}@example.com`, `${local}\n@example.com`];
    return { id: index + 1, value: defects[index % defects.length] };
  });
  for (const item of invalidEmails) {
    test(`UI-NEG-EMAIL-${String(item.id).padStart(3, '0')} · browser rejects malformed email`, async ({ page }) => {
      await signup(page);
      const email = page.getByLabel('Email address');
      await email.fill(item.value);
      expect(await email.evaluate((element: HTMLInputElement) => element.validity.typeMismatch || element.validity.valueMissing)).toBeTruthy();
    });
  }

  const requiredFields = ['Full name', 'Email address', 'Password', 'Confirm password'] as const;
  for (let index = 0; index < 40; index += 1) {
    const missing = requiredFields[index % requiredFields.length];
    test(`UI-NEG-REQUIRED-${String(index + 1).padStart(3, '0')} · ${missing} is required`, async ({ page }) => {
      await signup(page);
      await page.getByLabel('Full name').fill(faker.person.fullName());
      await page.getByLabel('Email address').fill(faker.internet.email({ provider: 'example.com' }));
      await page.locator('input[placeholder="At least 10 characters"]').fill('QA-Password-123!');
      await page.locator('input[placeholder="Repeat your password"]').fill('QA-Password-123!');
      const target = missing === 'Password'
        ? page.locator('input[placeholder="At least 10 characters"]')
        : missing === 'Confirm password'
          ? page.locator('input[placeholder="Repeat your password"]')
          : page.getByLabel(missing);
      await target.fill('');
      expect(await target.evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBeTruthy();
    });
  }

  for (let index = 0; index < 30; index += 1) {
    const value = faker.string.alphanumeric({ length: index % 10 });
    test(`UI-NEG-PASSWORD-${String(index + 1).padStart(3, '0')} · rejects ${value.length} character password`, async ({ page }) => {
      await signup(page);
      await page.getByLabel('Full name').fill(faker.person.fullName());
      await page.getByLabel('Email address').fill(faker.internet.email({ provider: 'example.com' }));
      const password = page.locator('input[placeholder="At least 10 characters"]');
      await password.fill(value);
      expect(await password.evaluate((element: HTMLInputElement) => element.validity.tooShort || element.validity.valueMissing)).toBeTruthy();
    });
  }
});
