import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Screenshot capture tests for visual comparison workflow
 * These tests capture screenshots to files for upload to ImgBB
 */

// Get screenshot output directory from env or use default
const outputDir = process.env.SCREENSHOT_DIR || 'screenshots';

async function captureFullPage(
	page: import('@playwright/test').Page,
	url: string,
	filename: string
) {
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.locator('main').waitFor({ state: 'visible' });
	await page.waitForTimeout(500);

	fs.mkdirSync(outputDir, { recursive: true });

	await page.screenshot({
		path: path.join(outputDir, filename),
		fullPage: true,
		animations: 'disabled'
	});
}

async function captureElement(
	page: import('@playwright/test').Page,
	url: string,
	selector: string,
	filename: string
) {
	await page.goto(url, { waitUntil: 'networkidle' });
	const element = page.locator(selector).first();
	await element.waitFor({ state: 'visible' });
	await element.scrollIntoViewIfNeeded();

	fs.mkdirSync(outputDir, { recursive: true });

	await element.screenshot({
		path: path.join(outputDir, filename)
	});
}

test.describe('Visual Screenshots @screenshot', () => {
	// Add screenshot mode class before each test to fix navigation positioning
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 2400 });
		await page.addInitScript(() => {
			// This runs before page load, so we need to add the class after DOM is ready
			document.addEventListener('DOMContentLoaded', () => {
				document.body.classList.add('screenshot-mode');
			});
		});
	});

	test('should capture main recipe page screenshot', async ({ page }) => {
		await captureFullPage(page, '/', 'main-recipe-page.png');
	});

	test('should capture specific recipe page screenshot', async ({ page }) => {
		await captureFullPage(page, '/recipe/vito-poolish', 'recipe-vito-poolish.png');
	});

	test('should capture biga recipe screenshot', async ({ page }) => {
		await captureFullPage(page, '/recipe/seb-biga', 'recipe-seb-biga.png');
	});

	test('should capture direct dough recipe screenshot', async ({ page }) => {
		await captureFullPage(page, '/recipe/bk-bageenzym', 'recipe-bk-bageenzym.png');
	});

	test('should capture gluten-free recipe screenshot', async ({ page }) => {
		await captureFullPage(page, '/recipe/bk-gluten-free', 'recipe-bk-gluten-free.png');
	});

	test('should capture timers page screenshot', async ({ page }) => {
		await captureFullPage(page, '/timers', 'timers-page.png');
	});

	test('should capture reference page screenshot', async ({ page }) => {
		await captureFullPage(page, '/reference', 'reference-page.png');
	});

	test('should capture tools page screenshot', async ({ page }) => {
		await captureFullPage(page, '/tools', 'tools-page.png');
	});

	test('should capture yeast converter tool', async ({ page }) => {
		await captureElement(
			page,
			'/tools',
			'[data-testid="yeast-converter"]',
			'tools-yeast-converter.png'
		);
	});

	test('should capture baker math tool', async ({ page }) => {
		await captureElement(page, '/tools', '[data-testid="baker-math-lab"]', 'tools-baker-math.png');
	});
});
