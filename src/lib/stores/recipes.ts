import { readable, derived } from 'svelte/store';
import type { Recipe, RecipeCategory, RecipeGroup } from '$lib/models';
import { recipes as recipeData, getRecipeById as getById } from '$lib/data/recipes';

/**
 * Readable store containing all recipes
 */
export const recipes = readable<Recipe[]>(recipeData);

/**
 * Derived store grouping recipes by category
 */
export const recipesByCategory = derived(recipes, ($recipes) => {
	const groups = new Map<RecipeCategory, Recipe[]>();

	for (const recipe of $recipes) {
		const existing = groups.get(recipe.category) || [];
		existing.push(recipe);
		groups.set(recipe.category, existing);
	}

	return groups;
});

/**
 * Derived store with recipe groups for display
 */
export const recipeGroups = derived(recipes, ($recipes) => {
	const categoryLabels: Record<RecipeCategory, string> = {
		neapolitan: 'Napolitansk',
		'ny-style': 'New York Style',
		poolish: 'Poolish',
		biga: 'Biga',
		sourdough: 'Surdej',
		detroit: 'Detroit',
		sicilian: 'Siciliansk',
		roman: 'Romersk',
		direct: 'Direkte dej'
	};

	const groups = new Map<RecipeCategory, Recipe[]>();

	for (const recipe of $recipes) {
		const existing = groups.get(recipe.category) || [];
		existing.push(recipe);
		groups.set(recipe.category, existing);
	}

	const result: RecipeGroup[] = [];
	for (const [category, categoryRecipes] of groups) {
		result.push({
			category,
			categoryDa: categoryLabels[category],
			recipes: categoryRecipes
		});
	}

	// Sort by category name
	result.sort((a, b) => a.categoryDa.localeCompare(b.categoryDa, 'da'));

	return result;
});

/**
 * Get a recipe by ID
 */
export function getRecipeById(id: string): Recipe | undefined {
	return getById(id);
}

/**
 * Get all unique categories
 */
export function getCategories(): RecipeCategory[] {
	const categories = new Set<RecipeCategory>();
	for (const recipe of recipeData) {
		categories.add(recipe.category);
	}
	return Array.from(categories);
}

/**
 * Search recipes by name
 */
export function searchRecipes(query: string): Recipe[] {
	if (!query.trim()) return recipeData;

	const lowerQuery = query.toLowerCase();
	return recipeData.filter(
		(recipe) =>
			recipe.name.toLowerCase().includes(lowerQuery) ||
			recipe.nameDa.toLowerCase().includes(lowerQuery)
	);
}
