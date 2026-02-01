import { test, expect } from '@playwright/test';

test.describe('PWA Service Worker', () => {
	test('should register service worker successfully', async ({ page, context }) => {
		// Grant notification permissions
		await context.grantPermissions(['notifications']);

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Wait a bit for service worker to register
		await page.waitForTimeout(2000);

		// Check if service worker is registered
		const swRegistered = await page.evaluate(async () => {
			if ('serviceWorker' in navigator) {
				const registration = await navigator.serviceWorker.getRegistration();
				return {
					registered: !!registration,
					state: registration?.active?.state,
					scope: registration?.scope
				};
			}
			return { registered: false };
		});

		expect(swRegistered.registered).toBe(true);
		expect(swRegistered.state).toBe('activated');
	});

	test('should have manifest.json accessible', async ({ page }) => {
		const response = await page.goto('/manifest.json');
		expect(response?.status()).toBe(200);

		const manifest = await response?.json();
		expect(manifest.name).toBe('Pizza Tool');
		expect(manifest.icons).toBeDefined();
		expect(manifest.icons.length).toBeGreaterThan(0);
	});

	test('should have all icon files accessible', async ({ page }) => {
		const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

		for (const size of iconSizes) {
			const response = await page.goto(`/icons/icon-${size}.png`);
			expect(response?.status()).toBe(200);
			expect(response?.headers()['content-type']).toContain('image/png');
		}
	});
});
