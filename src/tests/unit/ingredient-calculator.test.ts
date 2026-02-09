// @vitest-environment happy-dom
import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, it, expect } from 'vitest';
import IngredientCalculator from '$lib/components/recipe/IngredientCalculator.svelte';
import type { Recipe } from '$lib/types/recipe';
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
	yieldPizzas: 2,
	ingredients: [
		{ id: 'base-flour', name: 'Flour', nameDa: 'Mel', percentage: 70, type: 'flour' },
		{
			id: 'main-flour',
			name: 'Main flour',
			nameDa: 'Mel (hoveddej)',
			percentage: 30,
			type: 'flour',
			stage: 'main'
		},
		{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' }
	],
	schedule: { stages: [], totalTime: 0 }
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
});
