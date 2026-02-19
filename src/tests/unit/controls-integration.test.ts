import { describe, it, expect } from 'vitest';
import { scaleRecipe, calculateHydration } from '$lib/utils/baker-percentage';
import type { Recipe } from '$lib/types/recipe';

// Test recipe: 65% hydration, 20% poolish
const poolishRecipe: Recipe = {
	id: 'test-integration',
	name: 'Integration Test',
	nameDa: 'Integrationstest',
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

// Simple recipe: 65% hydration, no predough
const simpleRecipe: Recipe = {
	id: 'test-simple-integration',
	name: 'Simple Integration',
	nameDa: 'Simpel integration',
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

describe('End-to-end calculation tests', () => {
	it('should set hydration to 70% on a 65% recipe and verify weights', () => {
		const result = scaleRecipe(simpleRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			hydration: 70
		});

		// Total dough stays the same
		expect(result.totalDoughWeight).toBe(1080);

		// Water percentage should be 70
		const water = result.scaledIngredients.find((i) => i.id === 'water');
		expect(water?.percentage).toBeCloseTo(70, 0);

		// Verify the scaled hydration
		const scaledHydration = calculateHydration(
			result.scaledIngredients.map((i) => ({
				id: i.id,
				name: i.name,
				nameDa: i.nameDa,
				percentage: i.percentage,
				type: i.type
			}))
		);
		expect(scaledHydration).toBe(70);
	});

	it('should set predough split to 30% and verify flour/water redistribution', () => {
		const result = scaleRecipe(poolishRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			predoughRatio: 0.3
		});

		const poolishFlour = result.scaledIngredients.find((i) => i.id === 'poolish-flour');
		const mainFlour = result.scaledIngredients.find((i) => i.id === 'main-flour');

		// Poolish flour should be 30%
		expect(poolishFlour?.percentage).toBe(30);
		// Main flour should be 70%
		expect(mainFlour?.percentage).toBe(70);

		// Total flour should add up
		const totalFlourPct = (poolishFlour?.percentage || 0) + (mainFlour?.percentage || 0);
		expect(totalFlourPct).toBe(100);

		// Hydration should be maintained
		const totalWaterPct = result.scaledIngredients
			.filter((i) => i.type === 'water')
			.reduce((sum, i) => sum + i.percentage, 0);
		expect(totalWaterPct).toBeCloseTo(65, 0);
	});

	it('should set salt to 3% and verify weight updates', () => {
		// Apply custom salt percentage by modifying recipe
		const customRecipe: Recipe = {
			...simpleRecipe,
			mixingSteps: simpleRecipe.mixingSteps.map((step) => ({
				...step,
				ingredients: step.ingredients.map((i) => (i.id === 'salt' ? { ...i, percentage: 3 } : i))
			}))
		};

		const result = scaleRecipe(customRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270
		});

		const salt = result.scaledIngredients.find((i) => i.id === 'salt');
		expect(salt?.percentage).toBe(3);
		// Salt weight should be flour * 3%
		expect(salt?.weight).toBeCloseTo(result.totalFlourWeight * 0.03, 1);
	});

	it('should combine hydration + predough changes and verify consistency', () => {
		const result = scaleRecipe(poolishRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			hydration: 70,
			predoughRatio: 0.3
		});

		// Total dough should be 1080g
		expect(result.totalDoughWeight).toBe(1080);

		// Predough flour should be 30%
		const poolishFlour = result.scaledIngredients.find((i) => i.id === 'poolish-flour');
		expect(poolishFlour?.percentage).toBe(30);

		// Total water should match 70% hydration
		const totalWater = result.scaledIngredients
			.filter((i) => i.type === 'water')
			.reduce((sum, i) => sum + i.percentage, 0);
		expect(totalWater).toBeCloseTo(70, 0);
	});

	it('should reset to recipe defaults when no overrides provided', () => {
		const defaultResult = scaleRecipe(poolishRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270
		});

		const resetResult = scaleRecipe(poolishRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			hydration: null,
			predoughRatio: null
		});

		// Should produce identical results
		expect(resetResult.totalFlourWeight).toBe(defaultResult.totalFlourWeight);
		expect(resetResult.totalDoughWeight).toBe(defaultResult.totalDoughWeight);

		for (const ing of defaultResult.scaledIngredients) {
			const resetIng = resetResult.scaledIngredients.find((i) => i.id === ing.id);
			expect(resetIng?.percentage).toBe(ing.percentage);
			expect(resetIng?.weight).toBe(ing.weight);
		}
	});
});

describe('scaleRecipe with hydration input (updated baker-percentage tests)', () => {
	it('should accept hydration in CalculatorInput and apply water redistribution', () => {
		const result = scaleRecipe(simpleRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			hydration: 75
		});

		const water = result.scaledIngredients.find((i) => i.id === 'water');

		// Water should be ~75% of flour
		expect(water?.percentage).toBeCloseTo(75, 0);
	});

	it('should not change ingredients when hydration is undefined', () => {
		const result = scaleRecipe(simpleRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270
		});

		const water = result.scaledIngredients.find((i) => i.id === 'water');
		expect(water?.percentage).toBe(65);
	});
});

describe('Predough ratio with hydration preservation', () => {
	it('should preserve hydration when predough split changes', () => {
		// Default hydration
		const defaultResult = scaleRecipe(poolishRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270
		});

		// Changed predough ratio
		const changedResult = scaleRecipe(poolishRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			predoughRatio: 0.5
		});

		const getWaterPct = (result: ReturnType<typeof scaleRecipe>) =>
			result.scaledIngredients
				.filter((i) => i.type === 'water')
				.reduce((sum, i) => sum + i.percentage, 0);

		// Hydration should be preserved
		expect(getWaterPct(changedResult)).toBeCloseTo(getWaterPct(defaultResult), 0);
	});

	it('should allow both hydration and predough changes simultaneously', () => {
		const result = scaleRecipe(poolishRecipe, {
			numberOfPizzas: 4,
			doughBallWeight: 270,
			hydration: 72,
			predoughRatio: 0.4
		});

		const poolishFlour = result.scaledIngredients.find((i) => i.id === 'poolish-flour');
		expect(poolishFlour?.percentage).toBe(40);

		const totalWater = result.scaledIngredients
			.filter((i) => i.type === 'water')
			.reduce((sum, i) => sum + i.percentage, 0);
		expect(totalWater).toBeCloseTo(72, 0);
	});
});
