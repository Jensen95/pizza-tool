import { describe, it, expect } from 'vitest';
import { scaleRecipe, isPredoughStep, getOriginalPredoughRatio } from '$lib/utils/baker-percentage';
import type { Recipe } from '$lib/models/recipe.types';

// Standard poolish recipe: 20% predough flour, 80% main flour
const poolishRecipe: Recipe = {
	id: 'test-poolish',
	name: 'Test Poolish',
	nameDa: 'Test Poolish',
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
					nameDa: 'Mel (poolish)',
					percentage: 20,
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

// 100% biga recipe: all flour in predough, no main flour
const biga100Recipe: Recipe = {
	id: 'test-biga-100',
	name: 'Test Biga 100%',
	nameDa: 'Test Biga 100%',
	category: 'biga',
	baseWeight: 270,
	hydration: 65,
	mixingSteps: [
		{
			id: 'biga',
			name: 'Biga',
			nameDa: 'Biga',
			predough: true,
			ingredients: [
				{
					id: 'biga-flour',
					name: 'Biga flour',
					nameDa: 'Mel (biga)',
					percentage: 100,
					type: 'flour'
				},
				{
					id: 'biga-water',
					name: 'Biga water',
					nameDa: 'Vand (biga)',
					percentage: 44,
					type: 'water'
				},
				{
					id: 'biga-yeast',
					name: 'Biga yeast',
					nameDa: 'Gaer (biga)',
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
					id: 'main-water',
					name: 'Main water',
					nameDa: 'Vand (hoveddej)',
					percentage: 21,
					type: 'water'
				},
				{
					id: 'main-salt',
					name: 'Salt',
					nameDa: 'Salt',
					percentage: 2.7,
					type: 'salt'
				}
			]
		}
	],
	timeline: []
};

const blendedPoolishRecipe: Recipe = {
	id: 'test-poolish-blend',
	name: 'Test Poolish Blend',
	nameDa: 'Test Poolish Blend',
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
					percentage: 12,
					type: 'flour'
				},
				{
					id: 'poolish-flour-b',
					name: 'Poolish flour B',
					nameDa: 'Poolish mel B',
					percentage: 8,
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
					id: 'main-flour-a',
					name: 'Main flour A',
					nameDa: 'Mel A (hoveddej)',
					percentage: 60,
					type: 'flour'
				},
				{
					id: 'main-flour-b',
					name: 'Main flour B',
					nameDa: 'Mel B (hoveddej)',
					percentage: 20,
					type: 'flour'
				},
				{
					id: 'main-water',
					name: 'Main dough water',
					nameDa: 'Vand (hoveddej)',
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

const defaultInput = { numberOfPizzas: 4, doughBallWeight: 270 };

describe('Predough flour split - UI data layer', () => {
	describe('Predough flour percentage and weight for split row in main section', () => {
		it('should provide predough flour percentage from scaled ingredients', () => {
			const result = scaleRecipe(poolishRecipe, defaultInput);

			const predoughFlourPercent = result.scaledIngredients
				.filter((i) => i.type === 'flour' && isPredoughStep(poolishRecipe, i.mixingStepId))
				.reduce((sum, i) => sum + i.percentage, 0);

			expect(predoughFlourPercent).toBe(20);
		});

		it('should provide predough flour weight from scaled ingredients', () => {
			const result = scaleRecipe(poolishRecipe, defaultInput);

			const predoughFlourWeight = result.scaledIngredients
				.filter((i) => i.type === 'flour' && isPredoughStep(poolishRecipe, i.mixingStepId))
				.reduce((sum, i) => sum + i.weight, 0);

			// Predough flour should be 20% of total flour
			expect(predoughFlourWeight).toBeCloseTo(result.totalFlourWeight * 0.2, 0);
		});

		it('should update predough flour when predoughRatio changes', () => {
			const result = scaleRecipe(poolishRecipe, {
				...defaultInput,
				predoughRatio: 0.4
			});

			const predoughFlour = result.scaledIngredients.find(
				(i) => i.type === 'flour' && isPredoughStep(poolishRecipe, i.mixingStepId)
			);
			const mainFlour = result.scaledIngredients.find(
				(i) => i.type === 'flour' && !isPredoughStep(poolishRecipe, i.mixingStepId)
			);

			// Predough flour should now be 40% of total
			expect(predoughFlour?.percentage).toBe(40);
			// Main flour should be 60%
			expect(mainFlour?.percentage).toBe(60);
		});
	});

	describe('Flour ratio badge in predough section', () => {
		it('should have percentage field for predough flour showing total flour share', () => {
			const result = scaleRecipe(poolishRecipe, defaultInput);

			const poolishFlour = result.scaledIngredients.find((i) => i.id === 'poolish-flour');

			// percentage = share of total flour (what badge shows)
			expect(poolishFlour?.percentage).toBe(20);
			// stagePercentage = relative to stage flour (100% since it's the only flour in poolish)
			expect(poolishFlour?.stagePercentage).toBe(100);
		});

		it('should update badge percentage when split changes', () => {
			const result = scaleRecipe(poolishRecipe, {
				...defaultInput,
				predoughRatio: 0.35
			});

			const poolishFlour = result.scaledIngredients.find((i) => i.id === 'poolish-flour');

			expect(poolishFlour?.percentage).toBe(35);
			// Still 100% of poolish stage flour
			expect(poolishFlour?.stagePercentage).toBe(100);
		});
	});

	describe('Main flour hidden when predough is 100%', () => {
		it('should have 0 weight main flour when predough ratio is 1.0', () => {
			const result = scaleRecipe(poolishRecipe, {
				...defaultInput,
				predoughRatio: 1.0
			});

			const mainFlour = result.scaledIngredients.find((i) => i.id === 'main-flour');

			// Main flour should have 0% and 0 weight
			expect(mainFlour?.percentage).toBe(0);
			expect(mainFlour?.weight).toBe(0);
		});

		it('should not add main flour for 100% biga recipe at default ratio', () => {
			const result = scaleRecipe(biga100Recipe, defaultInput);

			const mainFlour = result.scaledIngredients.find((i) => i.id === 'main-flour');

			// No main flour should exist
			expect(mainFlour).toBeUndefined();
		});

		it('should add main flour when 100% biga is reduced to 50%', () => {
			const result = scaleRecipe(biga100Recipe, {
				...defaultInput,
				predoughRatio: 0.5
			});

			const mainFlour = result.scaledIngredients.find((i) => i.id === 'main-flour');

			expect(mainFlour).toBeDefined();
			expect(mainFlour?.percentage).toBe(50);
			expect(mainFlour!.weight).toBeGreaterThan(0);
		});
	});

	describe('Stage percentage display for ingredients', () => {
		it('should show stagePercentage relative to stage flour for non-flour ingredients', () => {
			const result = scaleRecipe(poolishRecipe, defaultInput);

			const poolishWater = result.scaledIngredients.find((i) => i.id === 'poolish-water');
			const mainSalt = result.scaledIngredients.find((i) => i.id === 'main-salt');

			// Poolish water: 20% of total flour, but 100% relative to poolish flour (20%)
			expect(poolishWater?.stagePercentage).toBe(100);

			// Main salt: 2.5% of total flour, but relative to main flour (80%)
			// stagePercentage = (2.5% * totalFlour / (80% * totalFlour)) * 100 = 3.125%
			expect(mainSalt?.stagePercentage).toBeCloseTo(3.13, 1);
		});

		it('stagePercentage for flour should always be 100% within its stage', () => {
			const result = scaleRecipe(poolishRecipe, defaultInput);

			const poolishFlour = result.scaledIngredients.find((i) => i.id === 'poolish-flour');
			const mainFlour = result.scaledIngredients.find((i) => i.id === 'main-flour');

			expect(poolishFlour?.stagePercentage).toBe(100);
			expect(mainFlour?.stagePercentage).toBe(100);
		});
	});

	describe('Original predough ratio for reset', () => {
		it('should return original predough ratio from recipe', () => {
			const ratio = getOriginalPredoughRatio(poolishRecipe);
			expect(ratio).toBe(0.2); // 20% predough flour
		});

		it('should return 1.0 for 100% biga recipe', () => {
			const ratio = getOriginalPredoughRatio(biga100Recipe);
			expect(ratio).toBe(1.0);
		});

		it('should return null for recipe without predough', () => {
			const directRecipe: Recipe = {
				id: 'test-direct',
				name: 'Test Direct',
				nameDa: 'Test Direct',
				category: 'direct',
				baseWeight: 270,
				hydration: 65,
				mixingSteps: [
					{
						id: 'main',
						name: 'Main dough',
						nameDa: 'Hoveddej',
						ingredients: [
							{
								id: 'flour',
								name: 'Flour',
								nameDa: 'Mel',
								percentage: 100,
								type: 'flour'
							},
							{
								id: 'water',
								name: 'Water',
								nameDa: 'Vand',
								percentage: 65,
								type: 'water'
							}
						]
					}
				],
				timeline: []
			};

			const ratio = getOriginalPredoughRatio(directRecipe);
			expect(ratio).toBeNull();
		});
	});

	describe('Editing predough split via predoughRatio', () => {
		it('should recalculate all flour when predough ratio changes from 20% to 40%', () => {
			const original = scaleRecipe(poolishRecipe, defaultInput);
			const adjusted = scaleRecipe(poolishRecipe, {
				...defaultInput,
				predoughRatio: 0.4
			});

			const origPoolishFlour = original.scaledIngredients.find((i) => i.id === 'poolish-flour');
			const adjPoolishFlour = adjusted.scaledIngredients.find((i) => i.id === 'poolish-flour');

			// Original: 20% predough flour
			expect(origPoolishFlour?.percentage).toBe(20);
			// Adjusted: 40% predough flour
			expect(adjPoolishFlour?.percentage).toBe(40);

			// Main flour should be complementary
			const adjMainFlour = adjusted.scaledIngredients.find((i) => i.id === 'main-flour');
			expect(adjMainFlour?.percentage).toBe(60);
		});

		it('should maintain total hydration when split changes', () => {
			const original = scaleRecipe(poolishRecipe, defaultInput);
			const adjusted = scaleRecipe(poolishRecipe, {
				...defaultInput,
				predoughRatio: 0.5
			});

			const getWaterWeight = (result: ReturnType<typeof scaleRecipe>) =>
				result.scaledIngredients
					.filter((i) => i.type === 'water')
					.reduce((sum, i) => sum + i.weight, 0);

			const origWater = getWaterWeight(original);
			const adjWater = getWaterWeight(adjusted);

			// Total water should remain approximately the same
			expect(adjWater).toBeCloseTo(origWater, 0);
		});

		it('should clamp predoughRatio between 0 and 1', () => {
			// Setting predoughRatio to 0 means no predough flour
			const noSplit = scaleRecipe(poolishRecipe, {
				...defaultInput,
				predoughRatio: 0
			});

			const predoughFlour = noSplit.scaledIngredients.find((i) => i.id === 'poolish-flour');
			const mainFlour = noSplit.scaledIngredients.find((i) => i.id === 'main-flour');

			expect(predoughFlour?.percentage).toBe(0);
			expect(predoughFlour?.weight).toBe(0);
			expect(mainFlour?.percentage).toBe(100);
		});
	});

	describe('Multiple flours keep proportions when split changes', () => {
		it('scales each flour by its stage share instead of resetting to 100%', () => {
			const result = scaleRecipe(blendedPoolishRecipe, {
				...defaultInput,
				predoughRatio: 0.35
			});

			const predoughFlours = result.scaledIngredients.filter(
				(i) => i.type === 'flour' && isPredoughStep(blendedPoolishRecipe, i.mixingStepId)
			);
			const mainFlours = result.scaledIngredients.filter(
				(i) => i.type === 'flour' && !isPredoughStep(blendedPoolishRecipe, i.mixingStepId)
			);

			const predoughTotal = predoughFlours.reduce((sum, f) => sum + f.percentage, 0);
			const mainTotal = mainFlours.reduce((sum, f) => sum + f.percentage, 0);

			expect(predoughTotal).toBeCloseTo(35, 2);
			expect(mainTotal).toBeCloseTo(65, 2);

			expect(predoughFlours.find((f) => f.id === 'poolish-flour-a')?.stagePercentage).toBeCloseTo(
				60,
				2
			);
			expect(predoughFlours.find((f) => f.id === 'poolish-flour-b')?.stagePercentage).toBeCloseTo(
				40,
				2
			);
			expect(mainFlours.find((f) => f.id === 'main-flour-a')?.stagePercentage).toBeCloseTo(75, 2);
			expect(mainFlours.find((f) => f.id === 'main-flour-b')?.stagePercentage).toBeCloseTo(25, 2);
		});
	});
});
