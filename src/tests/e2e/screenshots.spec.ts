import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for screenshot comparison
 * These tests are tagged with @screenshot to be used by the visual-comparison workflow
 */

test.describe('Visual Screenshots @screenshot', () => {
	test('should capture main recipe page screenshot', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Take full page screenshot of the main recipe list page
		await expect(page).toHaveScreenshot('main-recipe-page.png', {
			fullPage: true,
			animations: 'disabled'
		});
	});

	test('should capture specific recipe page screenshot', async ({ page }) => {
		// Navigate to a specific recipe (using vito-poolish as example)
		await page.goto('/recipe/vito-poolish');
		await page.waitForLoadState('networkidle');

		// Take full page screenshot of the recipe detail page
		await expect(page).toHaveScreenshot('recipe-vito-poolish.png', {
			fullPage: true,
			animations: 'disabled'
		});
	});

	test('should capture timers page screenshot', async ({ page }) => {
		await page.goto('/timers');
		await page.waitForLoadState('networkidle');

		// Take full page screenshot
		await expect(page).toHaveScreenshot('timers-page.png', {
			fullPage: true,
			animations: 'disabled'
		});
	});

	test('should capture reference page screenshot', async ({ page }) => {
		await page.goto('/reference');
		await page.waitForLoadState('networkidle');

		// Take full page screenshot
		await expect(page).toHaveScreenshot('reference-page.png', {
			fullPage: true,
			animations: 'disabled'
		});
	});
});
