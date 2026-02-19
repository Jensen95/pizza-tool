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
		const hasBigaStep =
			recipe?.mixingSteps.some((step) => step.id === 'biga' && step.predough) ?? false;
		expect(hasBigaStep).toBe(true);
	});

	it('groups roman recipes together', () => {
		const romanRecipes = recipes.filter((recipe) => recipe.category === 'roman');
		expect(romanRecipes.length).toBeGreaterThanOrEqual(2);
	});
});
