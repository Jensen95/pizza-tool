import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for screenshot comparison
 * These tests are tagged with @screenshot to be used by the visual-comparison workflow
 */

test.describe('Visual Screenshots @screenshot', () => {
	test('should capture home page screenshot', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Take full page screenshot
		await expect(page).toHaveScreenshot('home-page.png', {
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

	test('should capture timers page screenshot', async ({ page }) => {
		await page.goto('/timers');
		await page.waitForLoadState('networkidle');

		// Take full page screenshot
		await expect(page).toHaveScreenshot('timers-page.png', {
			fullPage: true,
			animations: 'disabled'
		});
	});

	test('should capture calculator interaction screenshot', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Interact with calculator if visible
		const numberInput = page.locator('input[type="number"]').first();
		if (await numberInput.isVisible()) {
			await numberInput.fill('6');
			await page.waitForLoadState('networkidle');

			await expect(page).toHaveScreenshot('calculator-with-data.png', {
				fullPage: true,
				animations: 'disabled'
			});
		}
	});
});
