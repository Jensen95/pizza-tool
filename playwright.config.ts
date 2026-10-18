import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for browser testing
 * Run with: npm run test:e2e
 */
export default defineConfig({
	testDir: './src/tests/e2e',
	// Exclude screenshot tests from default runs, but allow them when SCREENSHOT_DIR is set
	testIgnore: process.env.SCREENSHOT_DIR ? undefined : '**/screenshots.spec.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry'
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		}
	],

	webServer: {
		command: 'npm run preview',
		// The visual comparison workflow points this at the base branch's checkout, to screenshot
		// its build with this branch's specs
		cwd: process.env.SCREENSHOT_APP_DIR,
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000
	}
});
