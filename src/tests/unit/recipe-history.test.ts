import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { calculator, recipeHistory } from '$lib/stores';
import type { Recipe } from '$lib/types';
import * as storage from '$lib/utils/storage';

const baseRecipe: Recipe = {
	id: 'history-test',
	name: 'History Test',
	nameDa: 'Historik test',
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
					id: 'poolish-flour',
					name: 'Poolish flour',
					nameDa: 'Poolish mel',
					percentage: 20,
					type: 'flour'
				},
				{
					id: 'poolish-water',
					name: 'Poolish water',
					nameDa: 'Poolish vand',
					percentage: 20,
					type: 'water'
				},
				{
					id: 'poolish-yeast',
					name: 'Poolish yeast',
					nameDa: 'Poolish gær',
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
					name: 'Main flour',
					nameDa: 'Mel',
					percentage: 80,
					type: 'flour'
				},
				{
					id: 'main-water',
					name: 'Main water',
					nameDa: 'Vand',
					percentage: 45,
					type: 'water'
				},
				{
					id: 'salt',
					name: 'Salt',
					nameDa: 'Salt',
					percentage: 2.5,
					type: 'salt'
				}
			]
		}
	],
	timeline: []
};

beforeEach(() => {
	storage.clear();
	recipeHistory.clearHistory();
	calculator.reset();
	calculator.setRecipe(baseRecipe);
});

describe('recipe history', () => {
	it('saves current recipe setup and reapplies it', () => {
		calculator.setNumberOfPizzas(6);
		calculator.setDoughBallWeight(300);
		calculator.setHydration(70);
		calculator.setPredoughRatio(0.25);
		calculator.setIngredientPercentage('salt', 3.2);

		const state = get(calculator);

		recipeHistory.saveToHistory(
			baseRecipe,
			calculator.getCustomIngredients(),
			state.numberOfPizzas,
			state.doughBallWeight,
			state.hydration,
			state.predoughRatio
		);

		const entries = recipeHistory.getForRecipe(baseRecipe.id);
		expect(entries).toHaveLength(1);
		const entry = entries[0];
		expect(entry.numberOfPizzas).toBe(6);
		expect(entry.doughBallWeight).toBe(300);
		expect(entry.hydration).toBe(70);
		expect(entry.predoughRatio).toBeCloseTo(0.25);
		expect(entry.ingredients.salt).toBeCloseTo(3.2);

		calculator.resetAllCustomizations();
		calculator.setNumberOfPizzas(4);
		calculator.setDoughBallWeight(baseRecipe.baseWeight);
		calculator.resetHydration();
		calculator.setPredoughRatio(null);

		calculator.applyCustomIngredients(entry.ingredients);
		calculator.setNumberOfPizzas(entry.numberOfPizzas);
		calculator.setDoughBallWeight(entry.doughBallWeight);
		if (entry.hydration === null || entry.hydration === undefined) {
			calculator.resetHydration();
		} else {
			calculator.setHydration(entry.hydration);
		}
		calculator.setPredoughRatio(entry.predoughRatio ?? null);

		const reapplied = get(calculator);
		expect(reapplied.numberOfPizzas).toBe(6);
		expect(reapplied.doughBallWeight).toBe(300);
		expect(reapplied.hydration).toBe(70);
		expect(reapplied.predoughRatio).toBeCloseTo(0.25);
		expect(calculator.getCustomIngredients().salt).toBeCloseTo(3.2);
	});
});
