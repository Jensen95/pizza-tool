import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
test('should render the page and navigate', async ({ page }) => {
await page.goto('/');
await page.waitForLoadState('networkidle');
await expect(page).toHaveTitle(/Opskrifter - Pizza Tool/);
});
});

test.describe('Reference Page', () => {
test('should render and display tabs', async ({ page }) => {
await page.goto('/reference');
await page.waitForLoadState('networkidle');

// Check title
await expect(page).toHaveTitle(/Reference - Pizza Tool/);

// Check heading
const heading = page.getByRole('heading', { name: 'Reference' });
await expect(heading).toBeVisible();

// Check all tabs are visible
await expect(page.getByRole('button', { name: 'Pizzaer' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Mel' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Sauce' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Tips' })).toBeVisible();
});

test('should switch tabs when clicked', async ({ page }) => {
await page.goto('/reference');
await page.waitForLoadState('networkidle');

const melTab = page.getByRole('button', { name: 'Mel' });
await melTab.click();
await expect(melTab).toHaveClass(/active/);
});
});

test.describe('Timers Page', () => {
test('should render timer page', async ({ page }) => {
await page.goto('/timers');
await page.waitForLoadState('networkidle');

// Check title
await expect(page).toHaveTitle(/Timere - Pizza Tool/);

// Check main heading
const heading = page.getByRole('heading', { name: 'Timere', exact: true });
await expect(heading).toBeVisible();

// Check section heading
const sectionHeading = page.getByRole('heading', { name: 'Opret ny timer' });
await expect(sectionHeading).toBeVisible();
});
});
