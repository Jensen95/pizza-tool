import { describe, it, expect } from 'vitest';
import { rebalanceFlourBlend, getControllableIngredients } from '$lib/utils/baker-percentage';
import type { Recipe, RecipeIngredient } from '$lib/types/recipe';

describe('rebalanceFlourBlend', () => {
	it('should adjust other flour when one is changed (2 flours)', () => {
		const ingredients: RecipeIngredient[] = [
			{
				id: 'nuvola',
				name: 'Nuvola',
				nameDa: 'Mel - Caputo Nuvola',
				percentage: 70,
				type: 'flour',
				stage: 'main'
			},
			{
				id: 'semola',
				name: 'Semola',
				nameDa: 'Mel - Semola',
				percentage: 30,
				type: 'flour',
				stage: 'main'
			},
			{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water', stage: 'main' }
		];

		// Change nuvola from 70% to 60%
		const result = rebalanceFlourBlend(ingredients, 'nuvola', 60, 'main');

		const nuvola = result.find((i) => i.id === 'nuvola');
		const semola = result.find((i) => i.id === 'semola');

		expect(nuvola?.percentage).toBe(60);
		expect(semola?.percentage).toBe(40);
	});

	it('should handle setting one flour to 0%', () => {
		const ingredients: RecipeIngredient[] = [
			{
				id: 'nuvola',
				name: 'Nuvola',
				nameDa: 'Mel - Caputo Nuvola',
				percentage: 70,
				type: 'flour',
				stage: 'main'
			},
			{
				id: 'semola',
				name: 'Semola',
				nameDa: 'Mel - Semola',
				percentage: 30,
				type: 'flour',
				stage: 'main'
			}
		];

		const result = rebalanceFlourBlend(ingredients, 'nuvola', 0, 'main');

		const nuvola = result.find((i) => i.id === 'nuvola');
		const semola = result.find((i) => i.id === 'semola');

		expect(nuvola?.percentage).toBe(0);
		expect(semola?.percentage).toBe(100);
	});

	it('should handle setting one flour to 100%', () => {
		const ingredients: RecipeIngredient[] = [
			{
				id: 'nuvola',
				name: 'Nuvola',
				nameDa: 'Mel - Caputo Nuvola',
				percentage: 70,
				type: 'flour',
				stage: 'main'
			},
			{
				id: 'semola',
				name: 'Semola',
				nameDa: 'Mel - Semola',
				percentage: 30,
				type: 'flour',
				stage: 'main'
			}
		];

		const result = rebalanceFlourBlend(ingredients, 'nuvola', 100, 'main');

		const nuvola = result.find((i) => i.id === 'nuvola');
		const semola = result.find((i) => i.id === 'semola');

		expect(nuvola?.percentage).toBe(100);
		expect(semola?.percentage).toBe(0);
	});

	it('should keep total flour constant', () => {
		const ingredients: RecipeIngredient[] = [
			{
				id: 'nuvola',
				name: 'Nuvola',
				nameDa: 'Mel - Caputo Nuvola',
				percentage: 70,
				type: 'flour',
				stage: 'main'
			},
			{
				id: 'semola',
				name: 'Semola',
				nameDa: 'Mel - Semola',
				percentage: 30,
				type: 'flour',
				stage: 'main'
			}
		];

		const originalTotal = 100;

		const result = rebalanceFlourBlend(ingredients, 'nuvola', 55, 'main');
		const newTotal = result
			.filter((i) => i.type === 'flour')
			.reduce((sum, i) => sum + i.percentage, 0);

		expect(newTotal).toBeCloseTo(originalTotal, 1);
	});

	it('should not affect flour in different stages', () => {
		const ingredients: RecipeIngredient[] = [
			// Main stage flours
			{
				id: 'main-nuvola',
				name: 'Main Nuvola',
				nameDa: 'Mel - Caputo Nuvola',
				percentage: 20,
				type: 'flour',
				stage: 'main'
			},
			{
				id: 'main-pizzeria',
				name: 'Main Pizzeria',
				nameDa: 'Mel - Caputo Pizzeria',
				percentage: 30,
				type: 'flour',
				stage: 'main'
			},
			// Biga stage flour (single, should not be affected)
			{
				id: 'biga-flour',
				name: 'Biga flour',
				nameDa: 'Mel',
				percentage: 50,
				type: 'flour',
				stage: 'biga'
			}
		];

		const result = rebalanceFlourBlend(ingredients, 'main-nuvola', 30, 'main');

		const bigaFlour = result.find((i) => i.id === 'biga-flour');
		const mainNuvola = result.find((i) => i.id === 'main-nuvola');
		const mainPizzeria = result.find((i) => i.id === 'main-pizzeria');

		// Biga flour should be unchanged
		expect(bigaFlour?.percentage).toBe(50);

		// Main stage flours should rebalance
		expect(mainNuvola?.percentage).toBe(30);
		expect(mainPizzeria?.percentage).toBe(20);
	});

	it('should handle 3+ flours with proportional distribution', () => {
		const ingredients: RecipeIngredient[] = [
			{
				id: 'flour-a',
				name: 'Flour A',
				nameDa: 'Mel A',
				percentage: 50,
				type: 'flour',
				stage: 'main'
			},
			{
				id: 'flour-b',
				name: 'Flour B',
				nameDa: 'Mel B',
				percentage: 30,
				type: 'flour',
				stage: 'main'
			},
			{
				id: 'flour-c',
				name: 'Flour C',
				nameDa: 'Mel C',
				percentage: 20,
				type: 'flour',
				stage: 'main'
			}
		];

		// Change flour-a from 50 to 60 (delta = +10)
		const result = rebalanceFlourBlend(ingredients, 'flour-a', 60, 'main');

		const flourA = result.find((i) => i.id === 'flour-a');
		const flourB = result.find((i) => i.id === 'flour-b');
		const flourC = result.find((i) => i.id === 'flour-c');

		expect(flourA?.percentage).toBe(60);

		// B had 30/50 = 60% of the remaining, C had 20/50 = 40%
		// Delta = 10, B loses 10 * 0.6 = 6, C loses 10 * 0.4 = 4
		expect(flourB?.percentage).toBeCloseTo(24, 0);
		expect(flourC?.percentage).toBeCloseTo(16, 0);

		// Total should stay at 100
		const total = (flourA?.percentage || 0) + (flourB?.percentage || 0) + (flourC?.percentage || 0);
		expect(total).toBeCloseTo(100, 0);
	});

	it('should return ingredients unchanged if only one flour in stage', () => {
		const ingredients: RecipeIngredient[] = [
			{
				id: 'flour',
				name: 'Flour',
				nameDa: 'Mel',
				percentage: 100,
				type: 'flour',
				stage: 'main'
			},
			{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water', stage: 'main' }
		];

		const result = rebalanceFlourBlend(ingredients, 'flour', 80, 'main');

		// Should return unchanged since there's only one flour
		const flour = result.find((i) => i.id === 'flour');
		expect(flour?.percentage).toBe(100);
	});
});

describe('getControllableIngredients', () => {
	const simpleRecipe: Recipe = {
		id: 'test-simple',
		name: 'Simple',
		nameDa: 'Simpel',
		category: 'direct',
		baseWeight: 270,
		hydration: 65,
		yieldPizzas: 4,
		ingredients: [
			{ id: 'flour', name: 'Flour', nameDa: 'Mel', percentage: 100, type: 'flour' },
			{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' },
			{ id: 'salt', name: 'Salt', nameDa: 'Salt', percentage: 2.7, type: 'salt' },
			{ id: 'yeast', name: 'Yeast', nameDa: 'Gaer', percentage: 0.3, type: 'yeast' }
		],
		schedule: { stages: [], totalTime: 0 }
	};

	const poolishRecipe: Recipe = {
		id: 'test-poolish',
		name: 'Poolish',
		nameDa: 'Poolish',
		category: 'poolish',
		baseWeight: 270,
		hydration: 65,
		yieldPizzas: 4,
		ingredients: [
			{
				id: 'poolish-flour',
				name: 'Poolish flour',
				nameDa: 'Mel',
				percentage: 20,
				type: 'flour',
				stage: 'poolish'
			},
			{
				id: 'poolish-water',
				name: 'Poolish water',
				nameDa: 'Vand',
				percentage: 20,
				type: 'water',
				stage: 'poolish'
			},
			{
				id: 'poolish-yeast',
				name: 'Poolish yeast',
				nameDa: 'Gaer',
				percentage: 0.1,
				type: 'yeast',
				stage: 'poolish'
			},
			{
				id: 'main-flour',
				name: 'Main flour',
				nameDa: 'Mel',
				percentage: 80,
				type: 'flour',
				stage: 'main'
			},
			{
				id: 'main-water',
				name: 'Main water',
				nameDa: 'Vand',
				percentage: 45,
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
		schedule: { stages: [], totalTime: 0 }
	};

	const multiFlourRecipe: Recipe = {
		id: 'test-multi-flour',
		name: 'Multi Flour',
		nameDa: 'Multi Mel',
		category: 'biga',
		baseWeight: 270,
		hydration: 72,
		yieldPizzas: 4,
		ingredients: [
			{
				id: 'biga-flour',
				name: 'Biga flour',
				nameDa: 'Mel - Nuvola',
				percentage: 50,
				type: 'flour',
				stage: 'biga'
			},
			{
				id: 'main-nuvola',
				name: 'Nuvola',
				nameDa: 'Mel - Nuvola',
				percentage: 20,
				type: 'flour',
				stage: 'main'
			},
			{
				id: 'main-pizzeria',
				name: 'Pizzeria',
				nameDa: 'Mel - Pizzeria',
				percentage: 30,
				type: 'flour',
				stage: 'main'
			},
			{
				id: 'water',
				name: 'Water',
				nameDa: 'Vand',
				percentage: 72,
				type: 'water',
				stage: 'main'
			},
			{
				id: 'salt',
				name: 'Salt',
				nameDa: 'Salt',
				percentage: 2.5,
				type: 'salt',
				stage: 'main'
			}
		],
		schedule: { stages: [], totalTime: 0 }
	};

	const oilRecipe: Recipe = {
		id: 'test-oil',
		name: 'Oil Recipe',
		nameDa: 'Olie opskrift',
		category: 'direct',
		baseWeight: 270,
		hydration: 65,
		yieldPizzas: 4,
		ingredients: [
			{ id: 'flour', name: 'Flour', nameDa: 'Mel', percentage: 100, type: 'flour' },
			{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' },
			{ id: 'salt', name: 'Salt', nameDa: 'Salt', percentage: 2.5, type: 'salt' },
			{ id: 'yeast', name: 'Yeast', nameDa: 'Gaer', percentage: 0.3, type: 'yeast' },
			{ id: 'oil', name: 'Oil', nameDa: 'Olivenolie', percentage: 1, type: 'oil' }
		],
		schedule: { stages: [], totalTime: 0 }
	};

	it('should return hydration, salt, yeast, no flour blend, no predough for simple recipe', () => {
		const controls = getControllableIngredients(simpleRecipe);

		expect(controls.hydration).toBe(65);
		expect(controls.predoughRatio).toBeNull();
		expect(controls.flours).toHaveLength(0);
		expect(controls.extras.length).toBeGreaterThanOrEqual(2);

		const salt = controls.extras.find((e) => e.type === 'salt');
		const yeast = controls.extras.find((e) => e.type === 'yeast');
		expect(salt).toBeDefined();
		expect(yeast).toBeDefined();
		expect(salt?.percentage).toBe(2.7);
		expect(yeast?.percentage).toBe(0.3);
	});

	it('should return predough ratio for poolish recipe', () => {
		const controls = getControllableIngredients(poolishRecipe);

		expect(controls.hydration).toBe(65);
		expect(controls.predoughRatio).toBeCloseTo(0.2, 2);
		expect(controls.extras.length).toBeGreaterThanOrEqual(1);
	});

	it('should return flour blend info for multi-flour recipe', () => {
		const controls = getControllableIngredients(multiFlourRecipe);

		expect(controls.flours).toHaveLength(1); // only main stage has 2+ flours
		expect(controls.flours[0].stage).toBe('main');
		expect(controls.flours[0].flours).toHaveLength(2);

		const nuvola = controls.flours[0].flours.find((f) => f.id === 'main-nuvola');
		const pizzeria = controls.flours[0].flours.find((f) => f.id === 'main-pizzeria');
		expect(nuvola?.percentage).toBe(20);
		expect(pizzeria?.percentage).toBe(30);
	});

	it('should include oil in extras for recipes with oil', () => {
		const controls = getControllableIngredients(oilRecipe);

		const oil = controls.extras.find((e) => e.type === 'oil');
		expect(oil).toBeDefined();
		expect(oil?.percentage).toBe(1);
	});

	it('should not include oil for recipes without oil', () => {
		const controls = getControllableIngredients(simpleRecipe);

		const oil = controls.extras.find((e) => e.type === 'oil');
		expect(oil).toBeUndefined();
	});

	it('should apply custom ingredients to controls', () => {
		const controls = getControllableIngredients(simpleRecipe, { salt: 3.0 });

		const salt = controls.extras.find((e) => e.type === 'salt');
		expect(salt?.percentage).toBe(3.0);
		expect(salt?.originalPercentage).toBe(2.7);
	});
});
