// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, it, expect } from 'vitest';
import IngredientCalculator from '$lib/components/recipe/IngredientCalculator.svelte';
import type { Recipe } from '$lib/models/recipe.types';
import * as storage from '$lib/utils/storage';
import { calculator } from '$lib/stores';

class MemoryStorage {
	private store = new Map<string, string>();

	get length() {
		return this.store.size;
	}

	clear() {
		this.store.clear();
	}

	getItem(key: string) {
		return this.store.get(key) ?? null;
	}

	key(index: number) {
		return Array.from(this.store.keys())[index] ?? null;
	}

	removeItem(key: string) {
		this.store.delete(key);
	}

	setItem(key: string, value: string) {
		this.store.set(key, value);
	}
}

const mixedStageRecipe: Recipe = {
	id: 'mixed-stage',
	name: 'Mixed Stage Dough',
	nameDa: 'Blandet dej',
	category: 'direct',
	baseWeight: 250,
	hydration: 65,
	mixingSteps: [
		{
			id: 'main',
			name: 'Main dough',
			nameDa: 'Hoveddej',
			ingredients: [
				{
					id: 'base-flour',
					percentage: 70,
					type: 'flour',
					flourType: 'tipo-00'
				},
				{
					id: 'main-flour',
					percentage: 30,
					type: 'flour',
					flourType: 'tipo-00'
				},
				{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' }
			]
		}
	],
	timeline: []
};

const poolishRecipe: Recipe = {
	id: 'poolish-stage',
	name: 'Poolish Dough',
	nameDa: 'Poolish Dej',
	category: 'poolish',
	baseWeight: 270,
	hydration: 65,
	mixingSteps: [
		{
			id: 'poolish',
			name: 'Poolish',
			nameDa: 'Poolish',
			predough: true,
			ingredients: [
				{
					id: 'poolish-flour-a',
					percentage: 10,
					type: 'flour',
					flourType: 'tipo-00'
				},
				{
					id: 'poolish-flour-b',
					percentage: 10,
					type: 'flour',
					flourType: 'tipo-00'
				},
				{
					id: 'poolish-water',
					name: 'Poolish water',
					nameDa: 'Vand (poolish)',
					percentage: 20,
					type: 'water'
				},
				{
					id: 'poolish-yeast',
					name: 'Poolish yeast',
					nameDa: 'Gaer (poolish)',
					percentage: 0.1,
					type: 'yeast',
					yeastType: 'fresh'
				}
			]
		},
		{
			id: 'main',
			name: 'Main dough',
			nameDa: 'Hoveddej',
			ingredients: [
				{
					id: 'main-flour',
					percentage: 80,
					type: 'flour',
					flourType: 'tipo-00'
				},
				{
					id: 'main-water',
					name: 'Main dough water',
					nameDa: 'Vand (hoveddej)',
					percentage: 45,
					type: 'water'
				},
				{ id: 'main-salt', name: 'Salt', nameDa: 'Salt', percentage: 2.5, type: 'salt' }
			]
		}
	],
	timeline: []
};

beforeEach(() => {
	const memoryStorage = new MemoryStorage();
	(window as unknown as { localStorage: MemoryStorage }).localStorage = memoryStorage;
	(globalThis as typeof globalThis & { localStorage?: MemoryStorage }).localStorage = memoryStorage;
	storage.clear();
});

describe('IngredientCalculator grouping', () => {
	it('shows a single main dough section when main and default stage ingredients are mixed', async () => {
		render(IngredientCalculator, { props: { recipe: mixedStageRecipe } });

		const headings = await screen.findAllByRole('heading', { name: 'Hoveddej' });
		expect(headings).toHaveLength(1);
	});

	it('adds predough summary into the main dough ingredient list', async () => {
		render(IngredientCalculator, { props: { recipe: poolishRecipe } });

		const mainHeading = await screen.findByRole('heading', { name: 'Hoveddej' });
		const mainGroup = mainHeading.closest('.ingredient-group');

		const predoughCell = Array.from(mainGroup?.querySelectorAll('td') || []).find((cell) =>
			cell.textContent?.trim().startsWith('Poolish')
		);

		expect(predoughCell).toBeTruthy();
	});

	it('groups flours under a single heading per stage', async () => {
		render(IngredientCalculator, { props: { recipe: poolishRecipe } });

		const poolishHeading = await screen.findByRole('heading', { name: 'Poolish' });
		const poolishGroup = poolishHeading.closest('.ingredient-group');
		const flourHeadings = poolishGroup?.querySelectorAll('.flour-heading');

		expect(flourHeadings?.length).toBe(1);
	});

	it('omits flour heading when a stage has only one flour', async () => {
		render(IngredientCalculator, { props: { recipe: poolishRecipe } });

		const mainHeading = await screen.findByRole('heading', { name: 'Hoveddej' });
		const mainGroup = mainHeading.closest('.ingredient-group');
		const flourHeadings = mainGroup?.querySelectorAll('.flour-heading');

		expect(flourHeadings?.length ?? 0).toBe(0);
	});

	it('applies flour grouping style only to ingredient column', async () => {
		render(IngredientCalculator, { props: { recipe: poolishRecipe } });

		const poolishHeading = await screen.findByRole('heading', { name: 'Poolish' });
		const poolishGroup = poolishHeading.closest('.ingredient-group');
		const flourRows = poolishGroup?.querySelectorAll('tr.flour-row');
		const firstFlourRow = flourRows?.[0];

		expect(firstFlourRow).toBeTruthy();

		const cells = firstFlourRow ? Array.from(firstFlourRow.querySelectorAll('td')) : [];

		expect(cells.length).toBeGreaterThanOrEqual(3);
		expect(cells[0]?.classList.contains('flour-bar')).toBe(true);
		expect(cells[1]?.classList.contains('flour-bar')).toBe(false);
		expect(cells[2]?.classList.contains('flour-bar')).toBe(false);
	});
});

const freshYeastRecipe: Recipe = {
	id: 'fresh-yeast-recipe',
	name: 'Fresh Yeast Recipe',
	nameDa: 'Frisk Gær Opskrift',
	category: 'direct',
	baseWeight: 250,
	hydration: 65,
	mixingSteps: [
		{
			id: 'main',
			name: 'Main dough',
			nameDa: 'Hoveddej',
			ingredients: [
				{ id: 'flour', percentage: 100, type: 'flour', flourType: 'tipo-00' },
				{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' },
				{
					id: 'yeast',
					name: 'Fresh yeast',
					nameDa: 'Frisk gær',
					percentage: 0.8,
					type: 'yeast',
					yeastType: 'fresh'
				}
			]
		}
	],
	timeline: []
};

describe('yeast type update in ingredients list', () => {
	it('updates yeast ingredient name when yeast type changes to instant', async () => {
		// Use a unique recipe id to avoid cross-test yeast-type-override pollution
		const recipe: Recipe = { ...freshYeastRecipe, id: 'yeast-test-instant' };
		render(IngredientCalculator, { props: { recipe } });

		const initialCells = await screen.findAllByText('Frisk gær');
		const initialTd = initialCells.find((el) => el.tagName === 'TD');
		expect(initialTd).toBeTruthy();

		calculator.setYeastType('instant');

		await waitFor(() => {
			const cells = screen.queryAllByText('Instant gær');
			const td = cells.find((el) => el.tagName === 'TD');
			expect(td).toBeTruthy();
		});
	});

	it('updates yeast ingredient name when yeast type changes to active-dry', async () => {
		// Use a unique recipe id to avoid cross-test yeast-type-override pollution
		const recipe: Recipe = { ...freshYeastRecipe, id: 'yeast-test-active-dry' };
		render(IngredientCalculator, { props: { recipe } });

		const initialCells = await screen.findAllByText('Frisk gær');
		const initialTd = initialCells.find((el) => el.tagName === 'TD');
		expect(initialTd).toBeTruthy();

		calculator.setYeastType('active-dry');

		await waitFor(() => {
			const cells = screen.queryAllByText('Aktiv tørgær');
			const td = cells.find((el) => el.tagName === 'TD');
			expect(td).toBeTruthy();
		});
	});
});
