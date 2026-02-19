import { describe, expect, test } from 'vitest';
import { convertYeastPercentage, getRecipeYeastType } from '$lib/utils/yeast';
import type { Recipe } from '$lib/models';
import type { YeastInfo } from '$lib/models/reference.types';

function buildRecipe(
	yeastName: string,
	overrides?: Partial<Recipe>,
	yeastPercentage = 0.8,
	yeastType: YeastInfo['type'] = 'fresh'
): Recipe {
	return {
		id: 'recipe',
		name: 'Recipe',
		nameDa: 'Opskrift',
		category: 'direct',
		baseWeight: 250,
		hydration: 65,
		mixingSteps: [
			{
				id: 'main',
				name: 'Main dough',
				nameDa: 'Hoveddej',
				ingredients: [
					{ id: 'flour', name: 'Flour', nameDa: 'Mel', percentage: 100, type: 'flour' },
					{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' },
					{
						id: 'yeast',
						name: yeastName,
						nameDa: yeastName,
						percentage: yeastPercentage,
						type: 'yeast',
						yeastType
					}
				]
			}
		],
		timeline: [],
		...overrides
	};
}

describe('convertYeastPercentage', () => {
	test('converts fresh yeast to active dry using reference factors', () => {
		expect(convertYeastPercentage(1, 'fresh', 'active-dry')).toBeCloseTo(0.4, 3);
	});

	test('converts active dry to fresh', () => {
		expect(convertYeastPercentage(0.4, 'active-dry', 'fresh')).toBeCloseTo(1, 3);
		expect(convertYeastPercentage(1, 'active-dry', 'fresh')).toBeCloseTo(2.5, 3);
	});

	test('returns the same value when no conversion is needed', () => {
		expect(convertYeastPercentage(0, 'fresh', 'fresh')).toBe(0);
		expect(convertYeastPercentage(0.8, 'fresh', 'fresh')).toBe(0.8);
	});
});

describe('getRecipeYeastType', () => {
	test('prefers explicit yeastType on ingredient over name inference', () => {
		const recipe = buildRecipe('Instant yeast', {}, 0.8, 'active-dry');
		expect(getRecipeYeastType(recipe)).toBe('active-dry');
	});

	test('detects active-dry yeastType from ingredient', () => {
		const recipe = buildRecipe('Dry yeast', {}, 0.8, 'active-dry');
		expect(getRecipeYeastType(recipe)).toBe('active-dry');
	});

	test('detects instant yeastType from ingredient', () => {
		const recipe = buildRecipe('Instant yeast', {}, 0.8, 'instant');
		expect(getRecipeYeastType(recipe)).toBe('instant');
	});

	test('defaults to fresh yeast when yeastType is fresh', () => {
		const recipe = buildRecipe('Yeast', {}, 0.2, 'fresh');
		expect(getRecipeYeastType(recipe)).toBe('fresh');
	});
});
