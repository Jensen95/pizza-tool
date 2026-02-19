import type { FlourType, SauceRecipe, YeastInfo, Tip, YeastLookup } from '$lib/models';

import flourTypesData from './flour-types.json';
import sauceRecipesData from './sauce-recipes.json';
import yeastInfoData from './yeast-info.json';
import tipsData from './tips.json';
import pizzaSuggestionsData from './pizza-suggestions.json';
import yeastLookupData from './yeast-lookup.json';

export interface PizzaSuggestion {
	name: string;
	ingredients: string[];
	instructions: string;
}

export const flourTypes: FlourType[] = flourTypesData as FlourType[];
export const sauceRecipes: SauceRecipe[] = sauceRecipesData as SauceRecipe[];
export const yeastInfo: YeastInfo[] = yeastInfoData as YeastInfo[];
export const tips: Tip[] = tipsData as Tip[];
export const pizzaSuggestions: PizzaSuggestion[] = pizzaSuggestionsData as PizzaSuggestion[];
export const yeastLookup: YeastLookup = yeastLookupData as YeastLookup;

export function getFlourById(id: string): FlourType | undefined {
	return flourTypes.find((f) => f.id === id);
}

export function getSauceById(id: string): SauceRecipe | undefined {
	return sauceRecipes.find((s) => s.id === id);
}

export function getTipsByCategory(category: Tip['category']): Tip[] {
	return tips.filter((t) => t.category === category);
}
