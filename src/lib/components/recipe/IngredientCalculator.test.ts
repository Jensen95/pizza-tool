// @vitest-environment happy-dom
import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, it, expect } from 'vitest';
import IngredientCalculator from '$lib/components/recipe/IngredientCalculator.svelte';
import type { Recipe } from '$lib/models/recipe.types';
import * as storage from '$lib/utils/storage';

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
					name: 'Flour',
					nameDa: 'Mel',
					percentage: 70,
					type: 'flour'
				},
				{
					id: 'main-flour',
					name: 'Main flour',
					nameDa: 'Mel (hoveddej)',
					percentage: 30,
					type: 'flour'
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
					name: 'Poolish flour A',
					nameDa: 'Poolish mel A',
					percentage: 10,
					type: 'flour'
				},
				{
					id: 'poolish-flour-b',
					name: 'Poolish flour B',
					nameDa: 'Poolish mel B',
					percentage: 10,
					type: 'flour'
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
					name: 'Main dough flour',
					nameDa: 'Mel (hoveddej)',
					percentage: 80,
					type: 'flour'
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
