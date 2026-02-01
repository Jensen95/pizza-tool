import { describe, it, expect } from 'vitest';
import { scaleRecipe, getTotalPercentage, calculateHydration } from '$lib/utils/baker-percentage';
import type { Recipe } from '$lib/types/recipe';

describe('Predough Percentage Calculations', () => {
	describe('100% Biga Recipe', () => {
		// This recipe has 100% of flour in the biga (predough stage)
		const bigaRecipe: Recipe = {
			id: 'test-biga-100',
			name: 'Test Biga 100%',
			nameDa: 'Test Biga 100%',
			category: 'biga',
			baseWeight: 270,
			hydration: 65,
			yieldPizzas: 4,
			ingredients: [
				// Biga stage (100% of total flour)
				{
					id: 'biga-flour',
					name: 'Biga flour',
					nameDa: 'Mel (biga)',
					percentage: 100,
					type: 'flour',
					stage: 'biga'
				},
				{
					id: 'biga-water',
					name: 'Biga water',
					nameDa: 'Vand (biga)',
					percentage: 44,
					type: 'water',
					stage: 'biga'
				},
				{
					id: 'biga-yeast',
					name: 'Biga yeast',
					nameDa: 'Gær (biga)',
					percentage: 0.1,
					type: 'yeast',
					stage: 'biga'
				},
				// Main dough stage
				{
					id: 'main-water',
					name: 'Main dough water',
					nameDa: 'Vand (hoveddej)',
					percentage: 21,
					type: 'water',
					stage: 'main'
				},
				{
					id: 'main-salt',
					name: 'Salt',
					nameDa: 'Salt',
					percentage: 2.7,
					type: 'salt',
					stage: 'main'
				}
			],
			schedule: {
				stages: [],
				totalTime: 0
			}
		};

		it('should calculate total percentage correctly', () => {
			const total = getTotalPercentage(bigaRecipe.ingredients);
			// 100 (flour) + 44 (biga water) + 0.1 (yeast) + 21 (main water) + 2.7 (salt) = 167.8
			expect(total).toBeCloseTo(167.8, 1);
		});

		it('should scale correctly with 100% flour in predough', () => {
			const result = scaleRecipe(bigaRecipe, {
				numberOfPizzas: 4,
				doughBallWeight: 270
			});

			// Total dough: 4 * 270 = 1080g
			// Total percentage: 167.8%
			// Flour weight: 1080 * 100 / 167.8 ≈ 644g
			expect(result.totalFlourWeight).toBe(644);

			const bigaFlour = result.scaledIngredients.find((i) => i.id === 'biga-flour');
			const bigaWater = result.scaledIngredients.find((i) => i.id === 'biga-water');
			const mainWater = result.scaledIngredients.find((i) => i.id === 'main-water');

			// All flour goes to biga
			expect(bigaFlour?.weight).toBe(644);

			// Water split between biga and main dough
			expect(bigaWater?.weight).toBe(283); // 644 * 0.44
			expect(mainWater?.weight).toBe(135); // 644 * 0.21

			// Total water should equal hydration
			const totalWater = (bigaWater?.weight || 0) + (mainWater?.weight || 0);
			expect(totalWater).toBe(418); // 644 * 0.65
		});

		it('should calculate hydration correctly', () => {
			const hydration = calculateHydration(bigaRecipe.ingredients);
			// Total water: 44% + 21% = 65%
			expect(hydration).toBe(65);
		});
	});

	describe('50% Poolish Recipe', () => {
		// Recipe with 50% of flour in poolish
		const poolishRecipe: Recipe = {
			id: 'test-poolish-50',
			name: 'Test Poolish 50%',
			nameDa: 'Test Poolish 50%',
			category: 'poolish',
			baseWeight: 270,
			hydration: 70,
			yieldPizzas: 4,
			ingredients: [
				// Poolish stage (50% of total flour)
				{
					id: 'poolish-flour',
					name: 'Poolish flour',
					nameDa: 'Mel (poolish)',
					percentage: 50,
					type: 'flour',
					stage: 'poolish'
				},
				{
					id: 'poolish-water',
					name: 'Poolish water',
					nameDa: 'Vand (poolish)',
					percentage: 50,
					type: 'water',
					stage: 'poolish'
				},
				{
					id: 'poolish-yeast',
					name: 'Poolish yeast',
					nameDa: 'Gær (poolish)',
					percentage: 0.1,
					type: 'yeast',
					stage: 'poolish'
				},
				// Main dough stage (remaining 50% flour)
				{
					id: 'main-flour',
					name: 'Main dough flour',
					nameDa: 'Mel (hoveddej)',
					percentage: 50,
					type: 'flour',
					stage: 'main'
				},
				{
					id: 'main-water',
					name: 'Main dough water',
					nameDa: 'Vand (hoveddej)',
					percentage: 20,
					type: 'water',
					stage: 'main'
				},
				{
					id: 'main-salt',
					name: 'Salt',
					nameDa: 'Salt',
					percentage: 2.5,
					type: 'salt',
					stage: 'main'
				}
			],
			schedule: {
				stages: [],
				totalTime: 0
			}
		};

		it('should calculate total percentage correctly', () => {
			const total = getTotalPercentage(poolishRecipe.ingredients);
			// 50 (poolish flour) + 50 (poolish water) + 0.1 (yeast) + 50 (main flour) + 20 (main water) + 2.5 (salt) = 172.6
			expect(total).toBe(172.6);
		});

		it('should split flour 50/50 between poolish and main dough', () => {
			const result = scaleRecipe(poolishRecipe, {
				numberOfPizzas: 4,
				doughBallWeight: 270
			});

			const poolishFlour = result.scaledIngredients.find((i) => i.id === 'poolish-flour');
			const mainFlour = result.scaledIngredients.find((i) => i.id === 'main-flour');

			// Both should have equal weight (50% each)
			expect(poolishFlour?.weight).toBe(mainFlour?.weight);

			// Together they should equal total flour
			const totalFlour = (poolishFlour?.weight || 0) + (mainFlour?.weight || 0);
			expect(totalFlour).toBe(result.totalFlourWeight);
		});

		it('should calculate hydration correctly for poolish recipe', () => {
			const hydration = calculateHydration(poolishRecipe.ingredients);
			// Total water: 50% (poolish) + 20% (main) = 70%
			expect(hydration).toBe(70);
		});

		it('should have 100% hydration in poolish stage', () => {
			const result = scaleRecipe(poolishRecipe, {
				numberOfPizzas: 4,
				doughBallWeight: 270
			});

			const poolishFlour = result.scaledIngredients.find((i) => i.id === 'poolish-flour');
			const poolishWater = result.scaledIngredients.find((i) => i.id === 'poolish-water');

			// Poolish should have equal flour and water (100% hydration)
			expect(poolishFlour?.weight).toBe(poolishWater?.weight);
		});
	});

	describe('Adjusting Predough Percentage', () => {
		it('should correctly adjust from 100% biga to 50% biga', () => {
			// Start with 100% biga recipe
			const original: Recipe = {
				id: 'test-adjust',
				name: 'Test Adjust',
				nameDa: 'Test Adjust',
				category: 'biga',
				baseWeight: 270,
				hydration: 65,
				yieldPizzas: 4,
				ingredients: [
					{
						id: 'biga-flour',
						name: 'Biga flour',
						nameDa: 'Mel (biga)',
						percentage: 100,
						type: 'flour',
						stage: 'biga'
					},
					{
						id: 'biga-water',
						name: 'Biga water',
						nameDa: 'Vand (biga)',
						percentage: 44,
						type: 'water',
						stage: 'biga'
					},
					{
						id: 'biga-yeast',
						name: 'Biga yeast',
						nameDa: 'Gær (biga)',
						percentage: 0.1,
						type: 'yeast',
						stage: 'biga'
					},
					{
						id: 'main-water',
						name: 'Main water',
						nameDa: 'Vand (hoveddej)',
						percentage: 21,
						type: 'water',
						stage: 'main'
					},
					{
						id: 'main-salt',
						name: 'Salt',
						nameDa: 'Salt',
						percentage: 2.7,
						type: 'salt',
						stage: 'main'
					}
				],
				schedule: { stages: [], totalTime: 0 }
			};

			// Adjust to 50% biga (add 50% flour to main dough)
			const adjusted: Recipe = {
				...original,
				ingredients: [
					// Reduce biga flour from 100% to 50%
					{
						...original.ingredients[0],
						percentage: 50
					},
					// Keep biga water same relative to biga flour (44% of biga flour becomes 22% total)
					{
						...original.ingredients[1],
						percentage: 22
					},
					original.ingredients[2], // Keep yeast
					// Add main dough flour (50% of total)
					{
						id: 'main-flour',
						name: 'Main flour',
						nameDa: 'Mel (hoveddej)',
						percentage: 50,
						type: 'flour',
						stage: 'main'
					},
					// Adjust main water to maintain overall hydration
					// Original total water: 65%, biga now has 22%, so main needs 43%
					{
						...original.ingredients[3],
						percentage: 43
					},
					original.ingredients[4] // Keep salt
				]
			};

			const originalResult = scaleRecipe(original, {
				numberOfPizzas: 4,
				doughBallWeight: 270
			});

			const adjustedResult = scaleRecipe(adjusted, {
				numberOfPizzas: 4,
				doughBallWeight: 270
			});

			// Total flour weight should be similar
			expect(
				Math.abs(originalResult.totalFlourWeight - adjustedResult.totalFlourWeight)
			).toBeLessThan(5);

			// Total dough weight should be same
			expect(originalResult.totalDoughWeight).toBe(adjustedResult.totalDoughWeight);

			// Check flour distribution in adjusted recipe
			const adjustedBigaFlour = adjustedResult.scaledIngredients.find((i) => i.id === 'biga-flour');
			const adjustedMainFlour = adjustedResult.scaledIngredients.find((i) => i.id === 'main-flour');

			// Should be roughly 50/50 split
			expect(adjustedBigaFlour?.weight).toBe(adjustedMainFlour?.weight);

			// Total hydration should be maintained
			const originalHydration = calculateHydration(original.ingredients);
			const adjustedHydration = calculateHydration(adjusted.ingredients);
			expect(adjustedHydration).toBe(originalHydration);
		});

		it('should handle converting from 100% to 30% predough', () => {
			const recipe100: Recipe = {
				id: 'test',
				name: 'Test',
				nameDa: 'Test',
				category: 'poolish',
				baseWeight: 270,
				hydration: 65,
				yieldPizzas: 4,
				ingredients: [
					{
						id: 'poolish-flour',
						name: 'Flour',
						nameDa: 'Mel',
						percentage: 100,
						type: 'flour',
						stage: 'poolish'
					},
					{
						id: 'poolish-water',
						name: 'Water',
						nameDa: 'Vand',
						percentage: 50,
						type: 'water',
						stage: 'poolish'
					},
					{
						id: 'main-water',
						name: 'Water',
						nameDa: 'Vand',
						percentage: 15,
						type: 'water',
						stage: 'main'
					},
					{ id: 'salt', name: 'Salt', nameDa: 'Salt', percentage: 2.5, type: 'salt', stage: 'main' }
				],
				schedule: { stages: [], totalTime: 0 }
			};

			const recipe30: Recipe = {
				...recipe100,
				ingredients: [
					{
						id: 'poolish-flour',
						name: 'Flour',
						nameDa: 'Mel',
						percentage: 30,
						type: 'flour',
						stage: 'poolish'
					},
					{
						id: 'poolish-water',
						name: 'Water',
						nameDa: 'Vand',
						percentage: 15,
						type: 'water',
						stage: 'poolish'
					},
					{
						id: 'main-flour',
						name: 'Flour',
						nameDa: 'Mel',
						percentage: 70,
						type: 'flour',
						stage: 'main'
					},
					{
						id: 'main-water',
						name: 'Water',
						nameDa: 'Vand',
						percentage: 50,
						type: 'water',
						stage: 'main'
					},
					{ id: 'salt', name: 'Salt', nameDa: 'Salt', percentage: 2.5, type: 'salt', stage: 'main' }
				]
			};

			const result100 = scaleRecipe(recipe100, { numberOfPizzas: 4, doughBallWeight: 270 });
			const result30 = scaleRecipe(recipe30, { numberOfPizzas: 4, doughBallWeight: 270 });

			// Same total dough weight
			expect(result100.totalDoughWeight).toBe(result30.totalDoughWeight);

			// Similar total flour (might differ slightly due to rounding)
			expect(Math.abs(result100.totalFlourWeight - result30.totalFlourWeight)).toBeLessThan(5);

			// Check flour split in 30% recipe
			const poolishFlour = result30.scaledIngredients.find((i) => i.id === 'poolish-flour');
			const mainFlour = result30.scaledIngredients.find((i) => i.id === 'main-flour');
			const totalFlour = (poolishFlour?.weight || 0) + (mainFlour?.weight || 0);

			// Poolish should have ~30% of total flour
			expect((poolishFlour?.weight || 0) / totalFlour).toBeCloseTo(0.3, 1);
		});
	});

	describe('Complex Multi-Stage Recipes', () => {
		it('should handle recipe with autolyse stage', () => {
			const autolysRecipe: Recipe = {
				id: 'test-autolyse',
				name: 'Test Autolyse',
				nameDa: 'Test Autolyse',
				category: 'direct',
				baseWeight: 270,
				hydration: 70,
				yieldPizzas: 4,
				ingredients: [
					// Autolyse stage
					{
						id: 'autolyse-flour',
						name: 'Flour',
						nameDa: 'Mel',
						percentage: 100,
						type: 'flour',
						stage: 'autolyse'
					},
					{
						id: 'autolyse-water',
						name: 'Water',
						nameDa: 'Vand',
						percentage: 60,
						type: 'water',
						stage: 'autolyse'
					},
					// Main stage
					{
						id: 'main-water',
						name: 'Water',
						nameDa: 'Vand',
						percentage: 10,
						type: 'water',
						stage: 'main'
					},
					{
						id: 'main-salt',
						name: 'Salt',
						nameDa: 'Salt',
						percentage: 2.5,
						type: 'salt',
						stage: 'main'
					},
					{
						id: 'main-yeast',
						name: 'Yeast',
						nameDa: 'Gær',
						percentage: 0.2,
						type: 'yeast',
						stage: 'main'
					}
				],
				schedule: { stages: [], totalTime: 0 }
			};

			const result = scaleRecipe(autolysRecipe, { numberOfPizzas: 4, doughBallWeight: 270 });

			const autolysFlour = result.scaledIngredients.find((i) => i.id === 'autolyse-flour');
			const autolysWater = result.scaledIngredients.find((i) => i.id === 'autolyse-water');
			const mainWater = result.scaledIngredients.find((i) => i.id === 'main-water');

			// All flour in autolyse
			expect(autolysFlour?.weight).toBe(result.totalFlourWeight);

			// Total water should be 70% hydration
			const totalWater = (autolysWater?.weight || 0) + (mainWater?.weight || 0);
			const expectedWater = Math.round(result.totalFlourWeight * 0.7);
			expect(totalWater).toBe(expectedWater);
		});
	});
});
