import { writable, derived, get } from 'svelte/store';
import * as storage from '$lib/utils/storage';
import type { Recipe, RecipeIngredient } from '$lib/types/recipe';

const CUSTOMIZATIONS_KEY = 'recipe-customizations';
const HISTORY_KEY = 'recipe-history';

export interface RecipeCustomization {
	recipeId: string;
	recipeName: string;
	ingredients: Record<string, number>; // ingredientId -> custom percentage
	numberOfPizzas: number;
	doughBallWeight: number;
	createdAt: string;
}

export interface RecipeHistoryEntry {
	id: string;
	recipeId: string;
	recipeName: string;
	ingredients: Record<string, number>;
	numberOfPizzas: number;
	doughBallWeight: number;
	createdAt: string;
}

// Load customizations from localStorage
function loadCustomizations(): Record<string, RecipeCustomization> {
	return storage.get<Record<string, RecipeCustomization>>(CUSTOMIZATIONS_KEY, {});
}

// Load history from localStorage
function loadHistory(): RecipeHistoryEntry[] {
	return storage.get<RecipeHistoryEntry[]>(HISTORY_KEY, []);
}

// Create the customizations store
function createCustomizationsStore() {
	const { subscribe, set, update } =
		writable<Record<string, RecipeCustomization>>(loadCustomizations());

	function save(customizations: Record<string, RecipeCustomization>) {
		storage.set(CUSTOMIZATIONS_KEY, customizations);
	}

	return {
		subscribe,

		/**
		 * Get customization for a specific recipe
		 */
		getForRecipe(recipeId: string): RecipeCustomization | undefined {
			return get({ subscribe })[recipeId];
		},

		/**
		 * Update ingredient percentage for a recipe
		 */
		setIngredientPercentage(recipe: Recipe, ingredientId: string, percentage: number) {
			update((state) => {
				const existing = state[recipe.id] || {
					recipeId: recipe.id,
					recipeName: recipe.nameDa,
					ingredients: {},
					numberOfPizzas: recipe.yieldPizzas,
					doughBallWeight: recipe.baseWeight,
					createdAt: new Date().toISOString()
				};

				const newState = {
					...state,
					[recipe.id]: {
						...existing,
						ingredients: {
							...existing.ingredients,
							[ingredientId]: percentage
						}
					}
				};

				save(newState);
				return newState;
			});
		},

		/**
		 * Reset ingredient to original percentage
		 */
		resetIngredient(recipeId: string, ingredientId: string) {
			update((state) => {
				const existing = state[recipeId];
				if (!existing) return state;

				const { [ingredientId]: _, ...rest } = existing.ingredients;

				// If no more customizations, remove the recipe entry
				if (Object.keys(rest).length === 0) {
					const { [recipeId]: __, ...newState } = state;
					save(newState);
					return newState;
				}

				const newState = {
					...state,
					[recipeId]: {
						...existing,
						ingredients: rest
					}
				};

				save(newState);
				return newState;
			});
		},

		/**
		 * Reset all customizations for a recipe
		 */
		resetRecipe(recipeId: string) {
			update((state) => {
				const { [recipeId]: _, ...newState } = state;
				save(newState);
				return newState;
			});
		},

		/**
		 * Apply customizations to recipe ingredients
		 */
		applyToIngredients(recipe: Recipe): RecipeIngredient[] {
			const customization = get({ subscribe })[recipe.id];
			if (!customization) return recipe.ingredients;

			return recipe.ingredients.map((ing) => {
				const customPercentage = customization.ingredients[ing.id];
				if (customPercentage !== undefined) {
					return { ...ing, percentage: customPercentage };
				}
				return ing;
			});
		},

		/**
		 * Check if a recipe has customizations
		 */
		hasCustomizations(recipeId: string): boolean {
			const customization = get({ subscribe })[recipeId];
			return customization !== undefined && Object.keys(customization.ingredients).length > 0;
		}
	};
}

// Create the history store
function createHistoryStore() {
	const { subscribe, set, update } = writable<RecipeHistoryEntry[]>(loadHistory());

	function save(history: RecipeHistoryEntry[]) {
		storage.set(HISTORY_KEY, history);
	}

	return {
		subscribe,

		/**
		 * Save current customization to history
		 */
		saveToHistory(
			recipe: Recipe,
			customIngredients: Record<string, number>,
			numberOfPizzas: number,
			doughBallWeight: number
		) {
			update((state) => {
				const entry: RecipeHistoryEntry = {
					id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					recipeId: recipe.id,
					recipeName: recipe.nameDa,
					ingredients: customIngredients,
					numberOfPizzas,
					doughBallWeight,
					createdAt: new Date().toISOString()
				};

				// Keep last 50 entries
				const newState = [entry, ...state].slice(0, 50);
				save(newState);
				return newState;
			});
		},

		/**
		 * Delete a history entry
		 */
		deleteEntry(entryId: string) {
			update((state) => {
				const newState = state.filter((e) => e.id !== entryId);
				save(newState);
				return newState;
			});
		},

		/**
		 * Clear all history
		 */
		clearHistory() {
			set([]);
			save([]);
		},

		/**
		 * Get history for a specific recipe
		 */
		getForRecipe(recipeId: string): RecipeHistoryEntry[] {
			return get({ subscribe }).filter((e) => e.recipeId === recipeId);
		}
	};
}

export const customizations = createCustomizationsStore();
export const recipeHistory = createHistoryStore();

// Derived store to check if any recipe has customizations
export const hasAnyCustomizations = derived(
	customizations,
	($customizations) => Object.keys($customizations).length > 0
);
