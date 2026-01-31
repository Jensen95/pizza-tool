import type { FlourType, SauceRecipe, Topping, YeastInfo, Tip } from '$lib/types';

import flourTypesData from './flour-types.json';
import sauceRecipesData from './sauce-recipes.json';
import toppingsData from './toppings.json';
import yeastInfoData from './yeast-info.json';
import tipsData from './tips.json';

export const flourTypes: FlourType[] = flourTypesData as FlourType[];
export const sauceRecipes: SauceRecipe[] = sauceRecipesData as SauceRecipe[];
export const toppings: Topping[] = toppingsData as Topping[];
export const yeastInfo: YeastInfo[] = yeastInfoData as YeastInfo[];
export const tips: Tip[] = tipsData as Tip[];

export function getFlourById(id: string): FlourType | undefined {
	return flourTypes.find((f) => f.id === id);
}

export function getSauceById(id: string): SauceRecipe | undefined {
	return sauceRecipes.find((s) => s.id === id);
}

export function getToppingById(id: string): Topping | undefined {
	return toppings.find((t) => t.id === id);
}

export function getToppingsByCategory(category: Topping['category']): Topping[] {
	return toppings.filter((t) => t.category === category);
}

export function getTipsByCategory(category: Tip['category']): Tip[] {
	return tips.filter((t) => t.category === category);
}
