import { describe, it, expect } from 'vitest';
import {
	calculateIngredientWeight,
	getTotalPercentage,
	calculateTotalFlour,
	scaleRecipe,
	calculateHydration,
	validateRecipe,
	formatWeight,
	getAllIngredients
} from '$lib/utils/baker-percentage';
import type { Recipe, RecipeIngredient } from '$lib/types/recipe';

describe("Baker's Percentage - Basic Calculations", () => {
	describe('calculateIngredientWeight', () => {
		it('should calculate correct weight for 100% (flour)', () => {
			expect(calculateIngredientWeight(1000, 100)).toBe(1000);
		});

		it('should calculate correct weight for water at 65%', () => {
			expect(calculateIngredientWeight(1000, 65)).toBe(650);
		});

		it('should calculate correct weight for salt at 2.7%', () => {
			expect(calculateIngredientWeight(1000, 2.7)).toBe(27);
		});

		it('should calculate with two decimal precision', () => {
			expect(calculateIngredientWeight(1000, 2.75)).toBe(27.5);
			expect(calculateIngredientWeight(1000, 2.74)).toBe(27.4);
		});

		it('should handle small percentages', () => {
			expect(calculateIngredientWeight(1000, 0.1)).toBe(1);
		});
	});

	describe('getTotalPercentage', () => {
		it('should sum all ingredient percentages', () => {
			const ingredients: RecipeIngredient[] = [
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
				},
				{
					id: 'salt',
					name: 'Salt',
					nameDa: 'Salt',
					percentage: 2.7,
					type: 'salt'
				}
			];
			expect(getTotalPercentage(ingredients)).toBe(167.7);
		});

		it('should handle empty ingredient list', () => {
			expect(getTotalPercentage([])).toBe(0);
		});
	});

	describe('calculateTotalFlour', () => {
		it('should calculate flour for simple recipe (4 pizzas at 270g)', () => {
			// Total dough: 4 * 270 = 1080g
			// With 167.7% total: 1080 * 100 / 167.7 = 644g flour
			const flourWeight = calculateTotalFlour(4, 270, 167.7);
			expect(flourWeight).toBe(644);
		});

		it('should calculate flour for high hydration dough', () => {
			// 2 pizzas at 300g = 600g total dough
			// With 180% total: 600 * 100 / 180 = 333g flour
			const flourWeight = calculateTotalFlour(2, 300, 180);
			expect(flourWeight).toBe(333);
		});

		it('should round to nearest gram', () => {
			const flourWeight = calculateTotalFlour(3, 250, 170);
			expect(Number.isInteger(flourWeight)).toBe(true);
		});
	});

	describe('formatWeight', () => {
		it('should format grams for weights under 1kg', () => {
			expect(formatWeight(500)).toBe('500 g');
			expect(formatWeight(27)).toBe('27 g');
		});

		it('should format kilograms for weights 1kg and above', () => {
			expect(formatWeight(1000)).toBe('1.00 kg');
			expect(formatWeight(1500)).toBe('1.50 kg');
			expect(formatWeight(2350)).toBe('2.35 kg');
		});

		it('should display grams with two decimals when not an integer', () => {
			expect(formatWeight(123.7)).toBe('123.70 g');
			expect(formatWeight(123.75)).toBe('123.75 g');
			expect(formatWeight(123)).toBe('123 g'); // Integers show without decimals
		});
	});
});

describe("Baker's Percentage - Recipe Scaling", () => {
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
					},
					{
						id: 'salt',
						name: 'Salt',
						nameDa: 'Salt',
						percentage: 2.7,
						type: 'salt'
					},
					{
						id: 'yeast',
						name: 'Yeast',
						nameDa: 'Gær',
						percentage: 0.3,
						type: 'yeast',
						yeastType: 'fresh'
					}
				]
			}
		],
		timeline: []
	};

	describe('scaleRecipe', () => {
		it('should scale simple recipe correctly', () => {
			const result = scaleRecipe(simpleRecipe, {
				numberOfPizzas: 4,
				doughBallWeight: 270
			});

			expect(result.totalDoughWeight).toBe(1080);
			expect(result.totalFlourWeight).toBe(643); // 1080 * 100 / 168 ≈ 643

			// Check scaled ingredients (now with two decimal precision)
			const flour = result.scaledIngredients.find((i) => i.id === 'flour');
			const water = result.scaledIngredients.find((i) => i.id === 'water');
			const salt = result.scaledIngredients.find((i) => i.id === 'salt');

			expect(flour?.weight).toBe(643);
			expect(water?.weight).toBe(417.95); // 643 * 0.65
			expect(salt?.weight).toBe(17.36); // 643 * 0.027
		});

		it('should maintain percentages in scaled ingredients', () => {
			const result = scaleRecipe(simpleRecipe, {
				numberOfPizzas: 2,
				doughBallWeight: 300
			});

			result.scaledIngredients.forEach((ingredient) => {
				const original = getAllIngredients(simpleRecipe).find((i) => i.id === ingredient.id);
				expect(ingredient.percentage).toBe(original?.percentage);
			});
		});

		it('normalizes flour blends that exceed 100% and keeps hydration stable', () => {
			const messyRecipe: Recipe = {
				id: 'messy-flour-blend',
				name: 'Messy Blend',
				nameDa: 'Rodet blanding',
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
								id: 'main-flour',
								name: 'Flour',
								nameDa: 'Mel',
								percentage: 100,
								type: 'flour'
							},
							{
								id: 'tipo-00',
								name: 'Tipo 00',
								nameDa: 'Tipo 00',
								percentage: 60,
								type: 'flour'
							},
							{
								id: 'tipo-0',
								name: 'Tipo 0',
								nameDa: 'Tipo 0',
								percentage: 40,
								type: 'flour'
							},
							{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' },
							{ id: 'salt', name: 'Salt', nameDa: 'Salt', percentage: 2.7, type: 'salt' }
						]
					}
				],
				timeline: []
			};

			const result = scaleRecipe(messyRecipe, {
				numberOfPizzas: 2,
				doughBallWeight: 250
			});

			const flourIngredients = result.scaledIngredients.filter((i) => i.type === 'flour');
			const totalFlourPct = flourIngredients.reduce((sum, i) => sum + i.percentage, 0);
			expect(totalFlourPct).toBeCloseTo(100, 2);

			const totalFlourWeight = flourIngredients.reduce((sum, i) => sum + i.weight, 0);
			expect(totalFlourWeight).toBeCloseTo(result.totalFlourWeight, 2);

			const totalWaterPct = result.scaledIngredients
				.filter((i) => i.type === 'water')
				.reduce((sum, i) => sum + i.percentage, 0);
			expect(totalWaterPct).toBeCloseTo(65, 2);
		});

		it('should scale to different pizza counts', () => {
			const result = scaleRecipe(simpleRecipe, {
				numberOfPizzas: 10,
				doughBallWeight: 270
			});

			expect(result.totalDoughWeight).toBe(2700);
			expect(result.totalFlourWeight).toBeGreaterThan(1500);
		});
	});
});

describe("Baker's Percentage - Hydration Calculation", () => {
	it('should calculate hydration for simple recipe', () => {
		const ingredients: RecipeIngredient[] = [
			{ id: '1', name: 'Flour', nameDa: 'Mel', percentage: 100, type: 'flour' },
			{ id: '2', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' }
		];
		expect(calculateHydration(ingredients)).toBe(65);
	});

	it('should calculate hydration with multiple water sources', () => {
		const ingredients: RecipeIngredient[] = [
			{ id: '1', name: 'Flour', nameDa: 'Mel', percentage: 100, type: 'flour' },
			{ id: '2', name: 'Water 1', nameDa: 'Vand 1', percentage: 40, type: 'water' },
			{ id: '3', name: 'Water 2', nameDa: 'Vand 2', percentage: 25, type: 'water' }
		];
		expect(calculateHydration(ingredients)).toBe(65);
	});

	it('should return 0 for recipes without flour', () => {
		const ingredients: RecipeIngredient[] = [
			{ id: '1', name: 'Water', nameDa: 'Vand', percentage: 100, type: 'water' }
		];
		expect(calculateHydration(ingredients)).toBe(0);
	});
});

describe("Baker's Percentage - Recipe Validation", () => {
	it('should validate correct recipe', () => {
		const recipe: Recipe = {
			id: 'test',
			name: 'Test',
			nameDa: 'Test',
			category: 'direct',
			baseWeight: 270,
			hydration: 65,
			mixingSteps: [
				{
					id: 'main',
					name: 'Main dough',
					nameDa: 'Hoveddej',
					ingredients: [
						{ id: '1', name: 'Flour', nameDa: 'Mel', percentage: 100, type: 'flour' },
						{ id: '2', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' },
						{ id: '3', name: 'Salt', nameDa: 'Salt', percentage: 2.7, type: 'salt' }
					]
				}
			],
			timeline: []
		};

		const result = validateRecipe(recipe);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should reject recipe without flour', () => {
		const recipe: Recipe = {
			id: 'test',
			name: 'Test',
			nameDa: 'Test',
			category: 'direct',
			baseWeight: 270,
			hydration: 65,
			mixingSteps: [
				{
					id: 'main',
					name: 'Main dough',
					nameDa: 'Hoveddej',
					ingredients: [{ id: '1', name: 'Water', nameDa: 'Vand', percentage: 100, type: 'water' }]
				}
			],
			timeline: []
		};

		const result = validateRecipe(recipe);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Opskriften mangler mel');
	});

	it('should reject recipe without water', () => {
		const recipe: Recipe = {
			id: 'test',
			name: 'Test',
			nameDa: 'Test',
			category: 'direct',
			baseWeight: 270,
			hydration: 65,
			mixingSteps: [
				{
					id: 'main',
					name: 'Main dough',
					nameDa: 'Hoveddej',
					ingredients: [{ id: '1', name: 'Flour', nameDa: 'Mel', percentage: 100, type: 'flour' }]
				}
			],
			timeline: []
		};

		const result = validateRecipe(recipe);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Opskriften mangler vand');
	});

	it('should reject recipe with unreasonable percentages', () => {
		const recipe: Recipe = {
			id: 'test',
			name: 'Test',
			nameDa: 'Test',
			category: 'direct',
			baseWeight: 270,
			hydration: 65,
			mixingSteps: [
				{
					id: 'main',
					name: 'Main dough',
					nameDa: 'Hoveddej',
					ingredients: [
						{ id: '1', name: 'Flour', nameDa: 'Mel', percentage: 100, type: 'flour' },
						{ id: '2', name: 'Water', nameDa: 'Vand', percentage: 10, type: 'water' }
					]
				}
			],
			timeline: []
		};

		const result = validateRecipe(recipe);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});
});
