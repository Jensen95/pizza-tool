import { describe, it, expect } from 'vitest';
import {
	redistributeWater,
	scaleRecipe,
	calculateHydration,
	getAllIngredients
} from '$lib/utils/baker-percentage';
import type { FlatIngredient } from '$lib/utils/baker-percentage';
import type { Recipe } from '$lib/types/recipe';

// Simple recipe: 65% hydration, no predough
const simpleRecipe: Recipe = {
	id: 'test-simple',
	name: 'Simple Dough',
	nameDa: 'Simpel dej',
	category: 'direct',
	baseWeight: 270,
	hydration: 65,
	mixingSteps: [
		{
			id: 'main',
			name: 'Main dough',
			nameDa: 'Hoveddej',
			ingredients: [
				{ id: 'flour', name: 'Flour', nameDa: 'Mel', percentage: 100, type: 'flour' },
				{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' },
				{ id: 'salt', name: 'Salt', nameDa: 'Salt', percentage: 2.7, type: 'salt' },
				{
					id: 'yeast',
					name: 'Yeast',
					nameDa: 'Gaer',
					percentage: 0.3,
					type: 'yeast',
					yeastType: 'fresh'
				}
			]
		}
	],
	timeline: []
};

// Poolish recipe: 65% hydration, 20% predough flour
const poolishRecipe: Recipe = {
	id: 'test-poolish',
	name: 'Poolish Dough',
	nameDa: 'Poolish dej',
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
					nameDa: 'Mel',
					percentage: 20,
					type: 'flour'
				},
				{
					id: 'poolish-water',
					name: 'Poolish water',
					nameDa: 'Vand',
					percentage: 20,
					type: 'water'
				},
				{
					id: 'poolish-yeast',
					name: 'Poolish yeast',
					nameDa: 'Gaer',
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
					id: 'main-salt',
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

describe('redistributeWater', () => {
	it('should increase water proportionally when hydration increases', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'flour',
				name: 'Flour',
				nameDa: 'Mel',
				percentage: 100,
				type: 'flour',
				mixingStepId: 'main'
			},
			{
				id: 'water',
				name: 'Water',
				nameDa: 'Vand',
				percentage: 65,
				type: 'water',
				mixingStepId: 'main'
			}
		];

		const result = redistributeWater(ingredients, 70, 65);
		const water = result.find((i) => i.id === 'water');
		const flour = result.find((i) => i.id === 'flour');

		// Water should scale by 70/65 ratio
		expect(water?.percentage).toBeCloseTo(70, 0);
		// Flour should not change
		expect(flour?.percentage).toBe(100);
	});

	it('should preserve proportional split between stages for poolish recipe', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'poolish-water',
				name: 'Poolish water',
				nameDa: 'Vand',
				percentage: 20,
				type: 'water',
				mixingStepId: 'poolish'
			},
			{
				id: 'main-water',
				name: 'Main water',
				nameDa: 'Vand',
				percentage: 45,
				type: 'water',
				mixingStepId: 'main'
			},
			{
				id: 'flour',
				name: 'Flour',
				nameDa: 'Mel',
				percentage: 100,
				type: 'flour',
				mixingStepId: 'main'
			}
		];

		// Total water: 65%, change to 70%
		const result = redistributeWater(ingredients, 70, 65);
		const poolishWater = result.find((i) => i.id === 'poolish-water');
		const mainWater = result.find((i) => i.id === 'main-water');

		// Total new water should be ~70%
		const totalWater = (poolishWater?.percentage || 0) + (mainWater?.percentage || 0);
		expect(totalWater).toBeCloseTo(70, 0);

		// Ratio should be preserved: poolish had 20/65 = 30.77% of total water
		const originalRatio = 20 / 65;
		const newRatio = (poolishWater?.percentage || 0) / totalWater;
		expect(newRatio).toBeCloseTo(originalRatio, 2);
	});

	it('should handle 0% old hydration gracefully', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'flour',
				name: 'Flour',
				nameDa: 'Mel',
				percentage: 100,
				type: 'flour',
				mixingStepId: 'main'
			}
		];

		const result = redistributeWater(ingredients, 70, 0);
		// Should return unchanged ingredients
		expect(result).toEqual(ingredients);
	});

	it('should set all water to 0 when new hydration is 0', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'flour',
				name: 'Flour',
				nameDa: 'Mel',
				percentage: 100,
				type: 'flour',
				mixingStepId: 'main'
			},
			{
				id: 'water',
				name: 'Water',
				nameDa: 'Vand',
				percentage: 65,
				type: 'water',
				mixingStepId: 'main'
			}
		];

		const result = redistributeWater(ingredients, 0, 65);
		const water = result.find((i) => i.id === 'water');
		expect(water?.percentage).toBe(0);
	});

	it('should handle recipe with no water ingredients', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'flour',
				name: 'Flour',
				nameDa: 'Mel',
				percentage: 100,
				type: 'flour',
				mixingStepId: 'main'
			},
			{
				id: 'salt',
				name: 'Salt',
				nameDa: 'Salt',
				percentage: 2.5,
				type: 'salt',
				mixingStepId: 'main'
			}
		];

		const result = redistributeWater(ingredients, 70, 65);
		// Nothing should change since there are no water ingredients
		expect(result).toEqual(ingredients);
	});

	it('should handle high hydration change: 65% to 90%', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'flour',
				name: 'Flour',
				nameDa: 'Mel',
				percentage: 100,
				type: 'flour',
				mixingStepId: 'main'
			},
			{
				id: 'water',
				name: 'Water',
				nameDa: 'Vand',
				percentage: 65,
				type: 'water',
				mixingStepId: 'main'
			}
		];

		const result = redistributeWater(ingredients, 90, 65);
		const water = result.find((i) => i.id === 'water');

		// Water should be ~90%
		expect(water?.percentage).toBeCloseTo(90, 0);
	});

	it('should verify total water percentage matches new hydration value', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'flour',
				name: 'Flour',
				nameDa: 'Mel',
				percentage: 100,
				type: 'flour',
				mixingStepId: 'main'
			},
			{
				id: 'poolish-water',
				name: 'Poolish water',
				nameDa: 'Vand',
				percentage: 20,
				type: 'water',
				mixingStepId: 'poolish'
			},
			{
				id: 'main-water',
				name: 'Main water',
				nameDa: 'Vand',
				percentage: 45,
				type: 'water',
				mixingStepId: 'main'
			}
		];

		const result = redistributeWater(ingredients, 70, 65);
		const totalWater = result
			.filter((i) => i.type === 'water')
			.reduce((sum, i) => sum + i.percentage, 0);

		expect(totalWater).toBeCloseTo(70, 0);
	});
});

describe('scaleRecipe with hydration override', () => {
	it('should change water weights when hydration is overridden', () => {
		const defaultResult = scaleRecipe(simpleRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270
		});

		const overrideResult = scaleRecipe(simpleRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			hydration: 70
		});

		const defaultWater = defaultResult.scaledIngredients.find((i) => i.id === 'water');
		const overrideWater = overrideResult.scaledIngredients.find((i) => i.id === 'water');

		// Overridden water should be higher
		expect(overrideWater!.weight).toBeGreaterThan(defaultWater!.weight);

		// Flour should not change meaningfully (might differ due to total % change)
		const defaultFlour = defaultResult.scaledIngredients.find((i) => i.id === 'flour');
		const overrideFlour = overrideResult.scaledIngredients.find((i) => i.id === 'flour');

		// Both should still be flour
		expect(defaultFlour?.type).toBe('flour');
		expect(overrideFlour?.type).toBe('flour');
	});

	it('should preserve proportional water split in poolish recipe when hydration changes', () => {
		const result = scaleRecipe(poolishRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			hydration: 70
		});

		const poolishWater = result.scaledIngredients.find((i) => i.id === 'poolish-water');
		const mainWater = result.scaledIngredients.find((i) => i.id === 'main-water');

		// Total water should match ~70% hydration
		const totalWater = (poolishWater?.percentage || 0) + (mainWater?.percentage || 0);
		expect(totalWater).toBeCloseTo(70, 0);

		// Poolish water ratio should be preserved (originally 20/65 = ~30.77%)
		const expectedRatio = 20 / 65;
		const actualRatio = (poolishWater?.percentage || 0) / totalWater;
		expect(actualRatio).toBeCloseTo(expectedRatio, 2);
	});

	it('should not change anything when hydration override matches recipe default', () => {
		const defaultResult = scaleRecipe(simpleRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270
		});

		const overrideResult = scaleRecipe(simpleRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			hydration: 65
		});

		const defaultWater = defaultResult.scaledIngredients.find((i) => i.id === 'water');
		const overrideWater = overrideResult.scaledIngredients.find((i) => i.id === 'water');

		expect(overrideWater?.percentage).toBeCloseTo(defaultWater!.percentage, 1);
	});

	it('should work with null hydration override (use recipe default)', () => {
		const nullResult = scaleRecipe(simpleRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			hydration: null
		});

		const noOverrideResult = scaleRecipe(simpleRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270
		});

		const nullWater = nullResult.scaledIngredients.find((i) => i.id === 'water');
		const defaultWater = noOverrideResult.scaledIngredients.find((i) => i.id === 'water');

		expect(nullWater?.percentage).toBe(defaultWater?.percentage);
	});
});

describe('Hydration clamping', () => {
	it('should calculate hydration correctly from ingredients', () => {
		expect(calculateHydration(getAllIngredients(simpleRecipe))).toBe(65);
	});

	it('should calculate hydration for poolish recipe', () => {
		expect(calculateHydration(getAllIngredients(poolishRecipe))).toBe(65);
	});
});
