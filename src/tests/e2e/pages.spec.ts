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

test.describe('Dough Planner Page', () => {
	test('should render the planner', async ({ page }) => {
		await page.goto('/dough');
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveTitle(/Dej - Pizza Tool/);
		await expect(page.getByRole('heading', { name: 'Planlæg dejen' })).toBeVisible();
		await expect(page.getByTestId('dough-result')).toContainText('Resultat');
	});

	test('should switch to planning from a deadline', async ({ page }) => {
		await page.goto('/dough');
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: 'Klar til' }).click();
		await expect(page.getByLabel('Tidspunkt dejen skal være klar')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Natten over, stuetemperatur' })).toBeVisible();
	});

	test('should size the dough in balls', async ({ page }) => {
		await page.goto('/dough');
		await page.waitForLoadState('networkidle');

		await page.getByLabel('Antal kugler').fill('4');
		await page.getByLabel('Vægt pr. kugle i gram').fill('250');
		await expect(page.getByTestId('dough-form')).toContainText('mel');
	});

	test('should add an autolyse rest without changing the weights', async ({ page }) => {
		await page.goto('/dough');
		await page.waitForLoadState('networkidle');

		const total = page.locator('.stat', { hasText: 'Samlet dej' });
		const before = await total.innerText();

		await page.getByLabel('Brug autolyse').check();

		await expect(page.getByTestId('dough-result')).toContainText('Bland mel og vand');
		await expect(page.getByTestId('dough-result')).toContainText('Tilsæt gær og salt');
		await expect(total).toHaveText(before);
	});
	test('should warn when the flour blend gets too weak to hold seeds', async ({ page }) => {
		await page.goto('/dough');
		await page.waitForLoadState('networkidle');

		const panel = page.getByTestId('dough-result');
		await expect(panel).not.toContainText('Dejens styrke');

		await page.getByRole('button', { name: '+ Tilføj mel' }).click();
		await page.getByRole('button', { name: '+ Tilføj mel' }).click();
		const shares = page.locator('.row.wide input[type="number"]');
		await shares.nth(0).fill('50');
		await shares.nth(1).fill('50');
		await page.locator('.row.wide select').nth(1).selectOption('rye');

		await expect(panel).toContainText('Dejens styrke');
		await expect(panel).toContainText('50 % rugmel');
		await expect(panel).toContainText('50 % fuldkorn');
	});

	test('should work out the water thirsty seeds will bind', async ({ page }) => {
		await page.goto('/dough');
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: '+ Frø/kerner' }).click();
		await page.locator('select[id$="-seed"]').first().selectOption('chia');

		const panel = page.getByTestId('dough-result');
		await expect(panel).toContainText('chiafrø binder');
		await expect(panel).toContainText('soaker');
	});
});
