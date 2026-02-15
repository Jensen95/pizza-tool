import { describe, expect, test } from 'vitest';
import { convertYeastPercentage, getRecipeYeastType } from '$lib/utils/yeast';
import type { Recipe } from '$lib/types';

const baseSchedule: Recipe['schedule'] = {
	stages: [
		{
			id: 'stage-1',
			name: 'Bulk',
			nameDa: 'Bulk',
			duration: 60,
			temperature: 22,
			canSetTimer: false
		}
	],
	totalTime: 60
};

function buildRecipe(
	yeastName: string,
	overrides?: Partial<Recipe>,
	yeastPercentage = 0.8
): Recipe {
	return {
		id: 'recipe',
		name: 'Recipe',
		nameDa: 'Opskrift',
		category: 'direct',
		baseWeight: 250,
		hydration: 65,
		yieldPizzas: 2,
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
				id: 'yeast',
				name: yeastName,
				nameDa: yeastName,
				percentage: yeastPercentage,
				type: 'yeast'
			}
		],
		schedule: baseSchedule,
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
	test('prefers explicit yeastType flag on recipe', () => {
		const recipe = buildRecipe('Instant yeast', { yeastType: 'active-dry' });
		expect(getRecipeYeastType(recipe)).toBe('active-dry');
	});

	test('infers active dry yeast from ingredient naming', () => {
		const recipe = buildRecipe('Dry yeast');
		expect(getRecipeYeastType(recipe)).toBe('active-dry');
	});

	test('infers instant yeast from ingredient naming', () => {
		const recipe = buildRecipe('Instant yeast');
		expect(getRecipeYeastType(recipe)).toBe('instant');
	});

	test('defaults to fresh yeast when no hints are present', () => {
		const recipe = buildRecipe('Yeast', {}, 0.2);
		expect(getRecipeYeastType(recipe)).toBe('fresh');
	});
});
