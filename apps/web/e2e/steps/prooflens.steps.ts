import { expect, test } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import * as allure from 'allure-js-commons';

const { Given, When, Then, BeforeScenario, AfterScenario } = createBdd();

BeforeScenario(async ({ page }) => {
  const testInfo = test.info();
  await allure.step('Before hook · open ProofLens baseline and capture screenshot', async () => {
    await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001', { waitUntil: 'domcontentloaded' });
    await allure.attachment('before-hook.json', JSON.stringify({ phase: 'BeforeScenario', case: testInfo.title, project: testInfo.project.name, startedAt: new Date().toISOString() }, null, 2), { contentType: 'application/json' });
    await allure.attachment('before-screenshot.png', await page.screenshot({ animations: 'disabled' }), { contentType: 'image/png' });
  });
});

AfterScenario(async ({ page }) => {
  const testInfo = test.info();
  await allure.step('After hook · capture final scenario screenshot', async () => {
    let screenshotError: string | undefined;
    if (!page.isClosed()) {
      try {
        await allure.attachment('after-screenshot.png', await page.screenshot({ animations: 'disabled' }), { contentType: 'image/png' });
      } catch (error) {
        screenshotError = error instanceof Error ? error.message : String(error);
      }
    } else {
      screenshotError = 'Page was closed before the after hook.';
    }
    await allure.attachment('after-hook.json', JSON.stringify({ phase: 'AfterScenario', case: testInfo.title, status: testInfo.status, expectedStatus: testInfo.expectedStatus, durationMs: testInfo.duration, retry: testInfo.retry, screenshotError }, null, 2), { contentType: 'application/json' });
  });
});

Given('I open sample workspace with theme {string}', async ({ page }, theme: string) => {
  await page.addInitScript((value) => localStorage.setItem('prooflens-theme', value), theme);
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: /Explore sample workspace/ }).click();
  await expect(page.getByText('Sample reports only')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
});

When('I choose the {string} sample report', async ({ page }, type: string) => {
  await page.getByRole('button', { name: new RegExp(`${type} · EXAMPLE`, 'i') }).first().click();
});

Then('the {string} sample report is visibly labeled read only', async ({ page }, type: string) => {
  await expect(page.getByText('SAMPLE REPORT · NOT A LIVE CHECK')).toBeVisible();
  await expect(page.getByRole('heading', { name: new RegExp(`${type} example`, 'i') })).toBeVisible();
  await expect(page.getByText(/Sample report only: saving, sharing, and deleting are disabled/)).toBeVisible();
});

Given('I open the ProofLens account creation form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Create account/ }).first().click();
  await page.getByLabel('Full name').fill('ProofLens QA BDD User');
  await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible();
});

When('I enter the malformed email {string}', async ({ page }, email: string) => {
  await page.getByLabel('Email address').fill(email);
});

Then('the browser marks the email as invalid', async ({ page }) => {
  const email = page.getByLabel('Email address');
  expect(await email.evaluate((element: HTMLInputElement) => element.validity.typeMismatch || element.validity.valueMissing)).toBeTruthy();
});

Given('I view ProofLens at {int} by {int} using theme {string}', async ({ page }, width: number, height: number, theme: string) => {
  await page.setViewportSize({ width, height });
  await page.addInitScript((value) => localStorage.setItem('prooflens-theme', value), theme);
  await page.goto('/');
  await expect(page).toHaveTitle(/ProofLens AI/);
});

Then('the public page has no horizontal overflow and shows its main heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Check before you trust/ })).toBeVisible();
  const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
});

When('I open the {string} section', async ({ page }, section: string) => {
  await page.getByRole('button', { name: section, exact: true }).click();
});

Then('I see the section heading {string}', async ({ page }, heading: string) => {
  await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  if (heading === 'Scan history') await expect(page.getByText('DEMO-MESSAGE')).toBeVisible();
});
