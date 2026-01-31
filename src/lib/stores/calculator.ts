import { writable, derived } from 'svelte/store';
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

function createCalculatorStore() {
	const { subscribe, set, update } = writable<CalculatorState>(loadState());

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

		const { scaledIngredients, totalFlourWeight, totalDoughWeight } = scaleRecipe(currentRecipe, {
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
