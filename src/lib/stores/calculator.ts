import { writable, derived, get } from 'svelte/store';
import type { Recipe } from '$lib/types/recipe';
import type { CalculatorState, ScaledIngredient, RecipeControls } from '$lib/types/ingredient';
import {
	scaleRecipe,
	getOriginalPredoughRatio,
	getControllableIngredients,
	rebalanceFlourBlend,
	calculateHydration
} from '$lib/utils/baker-percentage';
import * as storage from '$lib/utils/storage';

const CALCULATOR_STORAGE_KEY = 'calculator';
const HYDRATION_STORAGE_KEY = 'hydration-overrides';

const defaultState: CalculatorState = {
	recipeId: null,
	numberOfPizzas: 4,
	doughBallWeight: 270,
	totalDoughWeight: 1080,
	totalFlourWeight: 0,
	hydration: null,
	predoughRatio: null,
	scaledIngredients: []
};

// Store for custom ingredient percentages per recipe
const customIngredientsStore = writable<Record<string, Record<string, number>>>({});

// Store for hydration overrides per recipe
const hydrationOverridesStore = writable<Record<string, number>>({});

function loadState(): CalculatorState {
	const stored = storage.get<Partial<CalculatorState>>(CALCULATOR_STORAGE_KEY, {});
	return {
		...defaultState,
		...stored,
		// Don't persist calculated values
		scaledIngredients: [],
		totalFlourWeight: 0,
		hydration: null,
		predoughRatio: null
	};
}

function loadCustomIngredients(): Record<string, Record<string, number>> {
	return storage.get<Record<string, Record<string, number>>>('custom-ingredients', {});
}

function saveCustomIngredients(data: Record<string, Record<string, number>>) {
	storage.set('custom-ingredients', data);
}

function loadHydrationOverrides(): Record<string, number> {
	return storage.get<Record<string, number>>(HYDRATION_STORAGE_KEY, {});
}

function saveHydrationOverrides(data: Record<string, number>) {
	storage.set(HYDRATION_STORAGE_KEY, data);
}

function createCalculatorStore() {
	const { subscribe, set, update } = writable<CalculatorState>(loadState());

	// Initialize custom ingredients from localStorage
	customIngredientsStore.set(loadCustomIngredients());
	hydrationOverridesStore.set(loadHydrationOverrides());

	let currentRecipe: Recipe | null = null;

	function recalculate(state: CalculatorState): CalculatorState {
		if (!currentRecipe) {
			return {
				...state,
				scaledIngredients: [],
				totalFlourWeight: 0,
				totalDoughWeight: state.numberOfPizzas * state.doughBallWeight,
				hydration: null,
				predoughRatio: null
			};
		}

		// Apply custom ingredients if available
		const customIngredients = get(customIngredientsStore)[currentRecipe.id] || {};
		const recipeWithCustoms: Recipe = {
			...currentRecipe,
			ingredients: currentRecipe.ingredients.map((ing) => ({
				...ing,
				percentage: customIngredients[ing.id] ?? ing.percentage
			}))
		};

		// Get hydration override for this recipe
		const hydrationOverride =
			state.hydration ?? get(hydrationOverridesStore)[currentRecipe.id] ?? null;

		const { scaledIngredients, totalFlourWeight, totalDoughWeight } = scaleRecipe(
			recipeWithCustoms,
			{
				numberOfPizzas: state.numberOfPizzas,
				doughBallWeight: state.doughBallWeight,
				hydration: hydrationOverride,
				predoughRatio: state.predoughRatio
			}
		);

		return {
			...state,
			recipeId: currentRecipe.id,
			hydration: hydrationOverride,
			scaledIngredients,
			totalFlourWeight,
			totalDoughWeight
		};
	}

	function saveState(state: CalculatorState) {
		storage.set(CALCULATOR_STORAGE_KEY, {
			numberOfPizzas: state.numberOfPizzas,
			doughBallWeight: state.doughBallWeight
		});
	}

	return {
		subscribe,

		/**
		 * Set the current recipe
		 * Keeps current pizza count and weight (doesn't reset to recipe defaults)
		 * Resets predoughRatio to null (uses recipe default)
		 * Loads persisted hydration override for this recipe
		 */
		setRecipe(recipe: Recipe | null) {
			currentRecipe = recipe;
			const hydrationOverride = recipe ? (get(hydrationOverridesStore)[recipe.id] ?? null) : null;
			update((state) => {
				const newState = recalculate({
					...state,
					recipeId: recipe?.id || null,
					hydration: hydrationOverride,
					predoughRatio: null // Reset to recipe default when switching recipes
				});
				return newState;
			});
		},

		/**
		 * Set hydration percentage override
		 * Clamps to 40-100%, recalculates water distribution
		 */
		setHydration(percentage: number) {
			if (!currentRecipe) return;

			percentage = Math.max(40, Math.min(100, percentage));

			// Persist hydration override per recipe
			hydrationOverridesStore.update((state) => {
				const newState = { ...state, [currentRecipe!.id]: percentage };
				saveHydrationOverrides(newState);
				return newState;
			});

			update((state) =>
				recalculate({
					...state,
					hydration: percentage
				})
			);
		},

		/**
		 * Reset hydration to recipe default
		 */
		resetHydration() {
			if (!currentRecipe) return;

			hydrationOverridesStore.update((state) => {
				const { [currentRecipe!.id]: _, ...rest } = state;
				saveHydrationOverrides(rest);
				return rest;
			});

			update((state) =>
				recalculate({
					...state,
					hydration: null
				})
			);
		},

		/**
		 * Get the current effective hydration
		 */
		getEffectiveHydration(): number {
			if (!currentRecipe) return 0;

			const hydrationOverride = get(hydrationOverridesStore)[currentRecipe.id];
			if (hydrationOverride !== undefined) return hydrationOverride;

			return calculateHydration(currentRecipe.ingredients);
		},

		/**
		 * Get the recipe's original hydration
		 */
		getOriginalHydration(): number {
			if (!currentRecipe) return 0;
			return currentRecipe.hydration;
		},

		/**
		 * Set flour blend for a specific flour in a stage
		 * Auto-adjusts other flour(s) in the same stage
		 */
		setFlourBlend(flourId: string, newPercentage: number) {
			if (!currentRecipe) return;

			// Find the flour ingredient and its stage
			const flour = currentRecipe.ingredients.find((i) => i.id === flourId);
			if (!flour || flour.type !== 'flour') return;

			const stage = flour.stage || 'main';

			// Get current custom ingredients
			const customIngredients = get(customIngredientsStore)[currentRecipe.id] || {};
			const currentIngredients = currentRecipe.ingredients.map((ing) => ({
				...ing,
				percentage: customIngredients[ing.id] ?? ing.percentage
			}));

			// Rebalance the flour blend
			const rebalanced = rebalanceFlourBlend(currentIngredients, flourId, newPercentage, stage);

			// Save all changed flour percentages as custom ingredients
			customIngredientsStore.update((state) => {
				const recipeId = currentRecipe!.id;
				const recipeCustoms = { ...(state[recipeId] || {}) };

				for (const ing of rebalanced) {
					if (ing.type === 'flour' && (ing.stage || 'main') === stage) {
						recipeCustoms[ing.id] = ing.percentage;
					}
				}

				const newState = { ...state, [recipeId]: recipeCustoms };
				saveCustomIngredients(newState);
				return newState;
			});

			// Trigger recalculation
			update((state) => recalculate(state));
		},

		/**
		 * Set predough ratio (percentage of total flour in predough)
		 * @param ratio - ratio as decimal (e.g., 0.2 for 20%), or null to use recipe default
		 */
		setPredoughRatio(ratio: number | null) {
			if (ratio !== null) {
				if (ratio < 0) ratio = 0;
				if (ratio > 1) ratio = 1;
			}

			update((state) => {
				const newState = recalculate({
					...state,
					predoughRatio: ratio
				});
				return newState;
			});
		},

		/**
		 * Get the original predough ratio from the current recipe
		 * Returns null if no predough in recipe
		 */
		getOriginalPredoughRatio(): number | null {
			if (!currentRecipe) return null;
			return getOriginalPredoughRatio(currentRecipe);
		},

		/**
		 * Get recipe controls (controllable ingredients for the UI)
		 */
		getRecipeControls(): RecipeControls | null {
			if (!currentRecipe) return null;
			const customIngredients = get(customIngredientsStore)[currentRecipe.id] || {};
			return getControllableIngredients(currentRecipe, customIngredients);
		},

		/**
		 * Set number of pizzas
		 */
		setNumberOfPizzas(count: number) {
			if (count < 1) count = 1;
			if (count > 100) count = 100;

			update((state) => {
				const newState = recalculate({
					...state,
					numberOfPizzas: count
				});
				saveState(newState);
				return newState;
			});
		},

		/**
		 * Set dough ball weight
		 */
		setDoughBallWeight(weight: number) {
			if (weight < 100) weight = 100;
			if (weight > 500) weight = 500;

			update((state) => {
				const newState = recalculate({
					...state,
					doughBallWeight: weight
				});
				saveState(newState);
				return newState;
			});
		},

		/**
		 * Reset to defaults
		 */
		reset() {
			currentRecipe = null;
			const state = {
				...defaultState
			};
			saveState(state);
			set(state);
		},

		/**
		 * Get current recipe
		 */
		getCurrentRecipe(): Recipe | null {
			return currentRecipe;
		},

		/**
		 * Update a custom ingredient percentage (for salt/yeast/oil/sugar)
		 */
		setIngredientPercentage(ingredientId: string, percentage: number) {
			if (!currentRecipe) return;

			customIngredientsStore.update((state) => {
				const recipeId = currentRecipe!.id;
				const recipeCustoms = state[recipeId] || {};
				const newState = {
					...state,
					[recipeId]: {
						...recipeCustoms,
						[ingredientId]: percentage
					}
				};
				saveCustomIngredients(newState);
				return newState;
			});

			// Trigger recalculation
			update((state) => recalculate(state));
		},

		/**
		 * Reset ingredient to original percentage
		 */
		resetIngredient(ingredientId: string) {
			if (!currentRecipe) return;

			customIngredientsStore.update((state) => {
				const recipeId = currentRecipe!.id;
				const recipeCustoms = { ...state[recipeId] };
				delete recipeCustoms[ingredientId];

				// If no more customizations, remove the recipe entry
				if (Object.keys(recipeCustoms).length === 0) {
					const { [recipeId]: _, ...rest } = state;
					saveCustomIngredients(rest);
					return rest;
				}

				const newState = {
					...state,
					[recipeId]: recipeCustoms
				};
				saveCustomIngredients(newState);
				return newState;
			});

			// Trigger recalculation
			update((state) => recalculate(state));
		},

		/**
		 * Reset all customizations for current recipe
		 */
		resetAllCustomizations() {
			if (!currentRecipe) return;

			customIngredientsStore.update((state) => {
				const { [currentRecipe!.id]: _, ...rest } = state;
				saveCustomIngredients(rest);
				return rest;
			});

			// Also reset hydration
			hydrationOverridesStore.update((state) => {
				const { [currentRecipe!.id]: _, ...rest } = state;
				saveHydrationOverrides(rest);
				return rest;
			});

			// Trigger recalculation
			update((state) =>
				recalculate({
					...state,
					hydration: null,
					predoughRatio: null
				})
			);
		},

		/**
		 * Get custom ingredients for current recipe
		 */
		getCustomIngredients(): Record<string, number> {
			if (!currentRecipe) return {};
			return get(customIngredientsStore)[currentRecipe.id] || {};
		},

		/**
		 * Check if recipe has customizations
		 */
		hasCustomizations(): boolean {
			if (!currentRecipe) return false;
			const customs = get(customIngredientsStore)[currentRecipe.id];
			const hasIngredientCustoms = customs !== undefined && Object.keys(customs).length > 0;
			const hasHydrationCustom = get(hydrationOverridesStore)[currentRecipe.id] !== undefined;
			return hasIngredientCustoms || hasHydrationCustom;
		},

		/**
		 * Apply a set of custom ingredient percentages (from history)
		 */
		applyCustomIngredients(ingredients: Record<string, number>) {
			if (!currentRecipe) return;

			customIngredientsStore.update((state) => {
				const recipeId = currentRecipe!.id;
				const newState = {
					...state,
					[recipeId]: { ...ingredients }
				};
				saveCustomIngredients(newState);
				return newState;
			});

			// Trigger recalculation
			update((state) => recalculate(state));
		}
	};
}

export const calculator = createCalculatorStore();

/**
 * Derived store for total weight
 */
export const totalWeight = derived(
	calculator,
	($calculator) => $calculator.numberOfPizzas * $calculator.doughBallWeight
);

/**
 * Derived store for flour weight
 */
export const flourWeight = derived(calculator, ($calculator) => $calculator.totalFlourWeight);

/**
 * Derived store for ingredients grouped by stage
 */
export const ingredientsByStage = derived(calculator, ($calculator) => {
	const stages = new Map<string, ScaledIngredient[]>();

	for (const ingredient of $calculator.scaledIngredients) {
		const stage = ingredient.stage || 'main';
		const existing = stages.get(stage) || [];
		existing.push(ingredient);
		stages.set(stage, existing);
	}

	return stages;
});

/**
 * Derived store for predough ratio
 */
export const predoughRatio = derived(calculator, ($calculator) => $calculator.predoughRatio);

/**
 * Derived store for hydration
 */
export const hydration = derived(calculator, ($calculator) => $calculator.hydration);
