import { describe, expect, it } from 'vitest';
import { recipes, getRecipeById } from '$lib/data/recipes';

describe('roman style recipes', () => {
	it('includes Bonci direct teglia recipe with attribution', () => {
		const recipe = getRecipeById('roma-teglia-bonci');
		expect(recipe).toBeTruthy();
		expect(recipe?.category).toBe('roman');
		expect(recipe?.name).toContain('Bonci');
	});

	it('includes Giorilli biga variation with a preferment stage', () => {
		const recipe = getRecipeById('roma-teglia-biga-giorilli');
		expect(recipe).toBeTruthy();
		expect(recipe?.category).toBe('roman');
		expect(recipe?.name).toContain('Giorilli');
		const hasBigaStage =
			recipe?.ingredients.some((ingredient) => ingredient.stage === 'biga') ?? false;
		expect(hasBigaStage).toBe(true);
	});

	it('groups roman recipes together', () => {
		const romanRecipes = recipes.filter((recipe) => recipe.category === 'roman');
		expect(romanRecipes.length).toBeGreaterThanOrEqual(2);
	});

	it('adds structured metadata for each recipe', () => {
		for (const recipe of recipes) {
			expect(recipe._meta).toBeDefined();
			expect(recipe._meta?.collection).toBe('recipes');
			expect(recipe._meta?.id).toBe(recipe.id);
			expect(recipe._meta?.slug).toBe(recipe.id);
			expect(recipe._meta?.source).toContain(recipe.id);
		}
	});
});
