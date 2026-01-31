import { writable, derived, get } from 'svelte/store';
import type { Recipe } from '$lib/types/recipe';
import type { CalculatorState, ScaledIngredient } from '$lib/types/ingredient';
import { scaleRecipe, getTotalPercentage } from '$lib/utils/baker-percentage';
import * as storage from '$lib/utils/storage';

const CALCULATOR_STORAGE_KEY = 'calculator';

const defaultState: CalculatorState = {
	recipeId: null,
	numberOfPizzas: 4,
	doughBallWeight: 270,
	totalDoughWeight: 1080,
	totalFlourWeight: 0,
	scaledIngredients: []
};

// Store for custom ingredient percentages per recipe
const customIngredientsStore = writable<Record<string, Record<string, number>>>({});

function loadState(): CalculatorState {
	const stored = storage.get<Partial<CalculatorState>>(CALCULATOR_STORAGE_KEY, {});
	return {
		...defaultState,
		...stored,
		// Don't persist calculated values
		scaledIngredients: [],
		totalFlourWeight: 0
	};
}

function loadCustomIngredients(): Record<string, Record<string, number>> {
	return storage.get<Record<string, Record<string, number>>>('custom-ingredients', {});
}

function saveCustomIngredients(data: Record<string, Record<string, number>>) {
	storage.set('custom-ingredients', data);
}

function createCalculatorStore() {
	const { subscribe, set, update } = writable<CalculatorState>(loadState());

	// Initialize custom ingredients from localStorage
	customIngredientsStore.set(loadCustomIngredients());

	let currentRecipe: Recipe | null = null;

	function recalculate(state: CalculatorState): CalculatorState {
		if (!currentRecipe) {
			return {
				...state,
				scaledIngredients: [],
				totalFlourWeight: 0,
				totalDoughWeight: state.numberOfPizzas * state.doughBallWeight
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

		const { scaledIngredients, totalFlourWeight, totalDoughWeight } = scaleRecipe(recipeWithCustoms, {
			numberOfPizzas: state.numberOfPizzas,
			doughBallWeight: state.doughBallWeight
		});

		return {
			...state,
			recipeId: currentRecipe.id,
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
		 */
		setRecipe(recipe: Recipe | null) {
			currentRecipe = recipe;
			update((state) => {
				const newState = recalculate({
					...state,
					recipeId: recipe?.id || null,
					doughBallWeight: recipe?.baseWeight || state.doughBallWeight,
					numberOfPizzas: recipe?.yieldPizzas || state.numberOfPizzas
				});
				saveState(newState);
				return newState;
			});
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
		 * Update a custom ingredient percentage
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

			// Trigger recalculation
			update((state) => recalculate(state));
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
			return customs !== undefined && Object.keys(customs).length > 0;
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
