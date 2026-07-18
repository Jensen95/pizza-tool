import { writable, derived, get } from 'svelte/store';
import * as storage from '$lib/utils/storage';
import type { Recipe } from '$lib/models/recipe.types';
import { defaultCalculatorInput } from '$lib/models/ingredient.types';
import { getAllIngredients } from '$lib/utils/baker-percentage';
import type { FlatIngredient } from '$lib/utils/baker-percentage';

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
	hydration?: number | null;
	predoughRatio?: number | null;
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
	const { subscribe, update, set } =
		writable<Record<string, RecipeCustomization>>(loadCustomizations());

	function save(customizations: Record<string, RecipeCustomization>) {
		storage.set(CUSTOMIZATIONS_KEY, customizations);
	}

	// Rehydrate when another tab changes this key so both tabs converge (§7.3).
	storage.subscribeToExternalChanges<Record<string, RecipeCustomization>>(
		CUSTOMIZATIONS_KEY,
		(value) => {
			set(value ?? {});
		}
	);

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
					numberOfPizzas: defaultCalculatorInput.numberOfPizzas,
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
		applyToIngredients(recipe: Recipe): FlatIngredient[] {
			const customization = get({ subscribe })[recipe.id];
			const allIngredients = getAllIngredients(recipe);
			if (!customization) return allIngredients;

			return allIngredients.map((ing) => {
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
	const { subscribe, set } = writable<RecipeHistoryEntry[]>(loadHistory());

	function save(history: RecipeHistoryEntry[]) {
		storage.set(HISTORY_KEY, history);
	}

	// Rehydrate when another tab changes history so both tabs converge (§7.3).
	storage.subscribeToExternalChanges<RecipeHistoryEntry[]>(HISTORY_KEY, (value) => {
		set(value ?? []);
	});

	return {
		subscribe,

		/**
		 * Save current customization to history
		 */
		saveToHistory(
			recipe: Recipe,
			customIngredients: Record<string, number>,
			numberOfPizzas: number,
			doughBallWeight: number,
			hydration: number | null = null,
			predoughRatio: number | null = null
		) {
			const entry: RecipeHistoryEntry = {
				id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				recipeId: recipe.id,
				recipeName: recipe.nameDa,
				ingredients: customIngredients,
				numberOfPizzas,
				doughBallWeight,
				hydration,
				predoughRatio,
				createdAt: new Date().toISOString()
			};

			// Re-read the freshest persisted list so a concurrent write from another
			// tab isn't blown away by a stale in-memory snapshot (§7.3). Keep last 50.
			const newState = [entry, ...loadHistory()].slice(0, 50);
			save(newState);
			set(newState);
		},

		/**
		 * Delete a history entry
		 */
		deleteEntry(entryId: string) {
			const newState = loadHistory().filter((e) => e.id !== entryId);
			save(newState);
			set(newState);
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
