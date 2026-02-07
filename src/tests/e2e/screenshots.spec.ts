import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Screenshot capture tests for visual comparison workflow
 * These tests capture screenshots to files for upload to ImgBB
 */

// Get screenshot output directory from env or use default
const outputDir = process.env.SCREENSHOT_DIR || 'screenshots';

test.describe('Visual Screenshots @screenshot', () => {
	test('should capture main recipe page screenshot', async ({ page }) => {
		await page.goto('/', { waitUntil: 'load' });
		await page.locator('main').waitFor({ state: 'visible' });

		// Create output directory if it doesn't exist
		fs.mkdirSync(outputDir, { recursive: true });

		// Capture screenshot to file
		await page.screenshot({
			path: path.join(outputDir, 'main-recipe-page.png'),
			fullPage: true,
			animations: 'disabled'
		});
	});

	test('should capture specific recipe page screenshot', async ({ page }) => {
		await page.goto('/recipe/vito-poolish', { waitUntil: 'load' });
		await page.locator('main').waitFor({ state: 'visible' });

		fs.mkdirSync(outputDir, { recursive: true });

		await page.screenshot({
			path: path.join(outputDir, 'recipe-vito-poolish.png'),
			fullPage: true,
			animations: 'disabled'
		});
	});

	test('should capture timers page screenshot', async ({ page }) => {
		await page.goto('/timers', { waitUntil: 'load' });
		await page.locator('main').waitFor({ state: 'visible' });

		fs.mkdirSync(outputDir, { recursive: true });

		await page.screenshot({
			path: path.join(outputDir, 'timers-page.png'),
			fullPage: true,
			animations: 'disabled'
		});
	});

	test('should capture reference page screenshot', async ({ page }) => {
		await page.goto('/reference', { waitUntil: 'load' });
		await page.locator('main').waitFor({ state: 'visible' });

		fs.mkdirSync(outputDir, { recursive: true });

		await page.screenshot({
			path: path.join(outputDir, 'reference-page.png'),
			fullPage: true,
			animations: 'disabled'
		});
	});
});
