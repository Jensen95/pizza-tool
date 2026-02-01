import type { Recipe, RecipeCategory, RecipeGroup, categoryLabels } from '$lib/types';

import vitoPoolish from './vito-poolish.json';
import gormsPizza from './gorms-pizza.json';
import umutsPizza from './umuts-pizza.json';
import tonyTigaPoolish from './tony-tiga-poolish.json';
import seb24t from './seb-24t.json';
import sebBiga from './seb-biga.json';
import ppahNy from './ppah-ny.json';
import nyStyle from './ny-style.json';
import nyPizzapal from './ny-pizzapal.json';
import bkHandaelt from './bk-handaelt.json';
import bkNapoli from './bk-napoli.json';
import bkPoolish from './bk-poolish.json';
import bkSurdej from './bk-surdej.json';
import bkBageenzym from './bk-bageenzym.json';
import bkBigaV1 from './bk-biga-v1.json';
import bkBigaV2 from './bk-biga-v2.json';
import bkDetroit from './bk-detroit.json';
import bkGlutenFree from './bk-gluten-free.json';

export const recipes: Recipe[] = [
	vitoPoolish as Recipe,
	gormsPizza as Recipe,
	umutsPizza as Recipe,
	tonyTigaPoolish as Recipe,
	seb24t as Recipe,
	sebBiga as Recipe,
	ppahNy as Recipe,
	nyStyle as Recipe,
	nyPizzapal as Recipe,
	bkHandaelt as Recipe,
	bkNapoli as Recipe,
	bkPoolish as Recipe,
	bkSurdej as Recipe,
	bkBageenzym as Recipe,
	bkBigaV1 as Recipe,
	bkBigaV2 as Recipe,
	bkDetroit as Recipe,
	bkGlutenFree as Recipe
];

export function getRecipeById(id: string): Recipe | undefined {
	return recipes.find((r) => r.id === id);
}

export function getRecipesByCategory(category: RecipeCategory): Recipe[] {
	return recipes.filter((r) => r.category === category);
}

export function getRecipeGroups(): RecipeGroup[] {
	const groups: Map<RecipeCategory, Recipe[]> = new Map();

	for (const recipe of recipes) {
		const existing = groups.get(recipe.category) || [];
		existing.push(recipe);
		groups.set(recipe.category, existing);
	}

	const categoryLabelsMap: Record<RecipeCategory, string> = {
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

	return Array.from(groups.entries()).map(([category, categoryRecipes]) => ({
		category,
		categoryDa: categoryLabelsMap[category],
		recipes: categoryRecipes
	}));
}

export default recipes;
