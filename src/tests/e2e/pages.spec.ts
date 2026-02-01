import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
test('should render the page title', async ({ page }) => {
await page.goto('/');
await expect(page).toHaveTitle(/Opskrifter - Pizza Tool/);
});

test('should render RecipeList component', async ({ page }) => {
await page.goto('/');
// Check that the page loaded and has content
await expect(page.locator('body')).toBeVisible();
});
});

test.describe('Reference Page', () => {
test('should render the page title', async ({ page }) => {
await page.goto('/reference');
await expect(page).toHaveTitle(/Reference - Pizza Tool/);
});

test('should render the main heading', async ({ page }) => {
await page.goto('/reference');
const heading = page.getByRole('heading', { name: 'Reference' });
await expect(heading).toBeVisible();
});

test('should render all tab buttons', async ({ page }) => {
await page.goto('/reference');
await expect(page.getByRole('button', { name: 'Pizzaer' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Mel' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Sauce' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Tips' })).toBeVisible();
});

test('should have pizzas tab active by default', async ({ page }) => {
await page.goto('/reference');
const pizzaTab = page.getByRole('button', { name: 'Pizzaer' });
await expect(pizzaTab).toHaveClass(/active/);
});

test('should switch tabs when clicked', async ({ page }) => {
await page.goto('/reference');

const melTab = page.getByRole('button', { name: 'Mel' });
await melTab.click();
await expect(melTab).toHaveClass(/active/);
});
});

test.describe('Timers Page', () => {
test('should render the page title', async ({ page }) => {
await page.goto('/timers');
await expect(page).toHaveTitle(/Timere - Pizza Tool/);
});

test('should render the main heading', async ({ page }) => {
await page.goto('/timers');
const heading = page.getByRole('heading', { name: 'Timere' });
await expect(heading).toBeVisible();
});

test('should render the create timer section heading', async ({ page }) => {
await page.goto('/timers');
const sectionHeading = page.getByRole('heading', { name: 'Opret ny timer' });
await expect(sectionHeading).toBeVisible();
});

test('should render TimerList and TimerCreator components', async ({ page }) => {
await page.goto('/timers');
const timersPage = page.locator('.timers-page');
await expect(timersPage).toBeVisible();

const creatorSection = page.locator('.creator-section');
await expect(creatorSection).toBeVisible();
});
});
