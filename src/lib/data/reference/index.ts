import type {
	FlourType,
	SauceRecipe,
	YeastInfo,
	Tip,
	YeastLookup,
	SpreadRecipe,
	ReheatingMethod,
	WaterTempFormula,
	PizzaSizeGuide,
	ToppingAmounts,
	FlourReference,
	SeedType
} from '$lib/models';

import flourTypesData from './flour-types.json';
import sauceRecipesData from './sauce-recipes.json';
import yeastInfoData from './yeast-info.json';
import tipsData from './tips.json';
import pizzaSuggestionsData from './pizza-suggestions.json';
import yeastLookupData from './yeast-lookup.json';
import spreadRecipesData from './spread-recipes.json';
import reheatingData from './reheating.json';
import waterTempData from './water-temp.json';
import pizzaSizesData from './pizza-sizes.json';
import seedsData from './seeds.json';
import toppingAmountsData from './topping-amounts.json';
import flourReferenceData from './flour-reference.json';

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
export const spreadRecipes: SpreadRecipe[] = spreadRecipesData as SpreadRecipe[];
export const reheatingMethods: ReheatingMethod[] = reheatingData as ReheatingMethod[];
export const waterTempFormula: WaterTempFormula = waterTempData as WaterTempFormula;
export const pizzaSizes: PizzaSizeGuide = pizzaSizesData as PizzaSizeGuide;
export const seedTypes: SeedType[] = seedsData as SeedType[];
export const toppingAmounts: ToppingAmounts = toppingAmountsData as ToppingAmounts;
export const flourReference: FlourReference = flourReferenceData as FlourReference;

export function getFlourById(id: string): FlourType | undefined {
	return flourTypes.find((f) => f.id === id);
}

export function getSauceById(id: string): SauceRecipe | undefined {
	return sauceRecipes.find((s) => s.id === id);
}

export function getTipsByCategory(category: Tip['category']): Tip[] {
	return tips.filter((t) => t.category === category);
}
