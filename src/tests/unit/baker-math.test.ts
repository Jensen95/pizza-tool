import { describe, expect, test } from 'vitest';
import type { BakerMathIngredient } from '$lib/utils/baker-math.types';
import {
	attachIngredientWeights,
	calculateDoughTotalWeight,
	calculateHydrationPercentage,
	calculateIngredientWeight,
	calculateTargetWater,
	summarizeBakerMath
} from '$lib/utils/baker-math';

const baseIngredients: BakerMathIngredient[] = [
	{ id: 'water', name: 'Water', percentage: 65, type: 'water' },
	{ id: 'salt', name: 'Salt', percentage: 2.8, type: 'other' },
	{ id: 'oil', name: 'Olive oil', percentage: 2, type: 'other' }
];

describe('baker math utilities', () => {
	test('calculates ingredient weights from percentages', () => {
		expect(calculateIngredientWeight(750, 62.5)).toBe(468.75);
		expect(calculateIngredientWeight(0, 50)).toBe(0);
		expect(calculateIngredientWeight(500, -10)).toBe(0);
	});

	test('attaches weights to ingredients', () => {
		const withWeights = attachIngredientWeights(1000, baseIngredients);
		expect(withWeights.map((i) => i.weight)).toEqual([650, 28, 20]);
	});

	test('calculates hydration from water ingredients only', () => {
		expect(calculateHydrationPercentage(baseIngredients)).toBe(65);

		const withPoolishWater: BakerMathIngredient[] = [
			...baseIngredients,
			{ id: 'poolish-water', name: 'Poolish water', percentage: 20, type: 'water' }
		];
		expect(calculateHydrationPercentage(withPoolishWater)).toBe(85);
	});

	test('calculates total dough weight with flour included', () => {
		const totalWeight = calculateDoughTotalWeight(1000, baseIngredients);
		// Flour (1000g) + water (650g) + salt (28g) + oil (20g)
		expect(totalWeight).toBe(1698);
	});

	test('summarizes baker math with hydration and water weight', () => {
		const summary = summarizeBakerMath(980, baseIngredients);
		expect(summary.hydration).toBe(65);
		expect(summary.waterWeight).toBe(637);
		expect(summary.totalDoughWeight).toBe(1664.04);
		expect(summary.ingredients).toHaveLength(baseIngredients.length);
	});

	test('calculates target water for a desired hydration', () => {
		expect(calculateTargetWater(1000, 70)).toEqual({
			waterWeight: 700,
			waterPercentage: 70
		});

		expect(calculateTargetWater(1000, -5)).toEqual({
			waterWeight: 0,
			waterPercentage: 0
		});
	});
});
