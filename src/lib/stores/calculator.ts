import { writable, derived, get } from 'svelte/store';
import type { Recipe, RecipeIngredient, FermentationStage } from '$lib/types/recipe';
import type {
	CalculatorState,
	ScaledIngredient,
	RecipeControls,
	CustomFlour,
	CustomFlourState
} from '$lib/types/ingredient';
import type { FlourTypeOption } from '$lib/types/reference';
import {
	scaleRecipe,
	getOriginalPredoughRatio,
	getControllableIngredients,
	rebalanceFlourBlend,
	calculateHydration,
	addFlourToStage,
	removeFlourFromStage
} from '$lib/utils/baker-percentage';
import { flourTypes as flourTypeOptions } from '$lib/data/reference/flour-types';
import * as storage from '$lib/utils/storage';

const CALCULATOR_STORAGE_KEY = 'calculator';
const HYDRATION_STORAGE_KEY = 'hydration-overrides';
const CUSTOM_FLOUR_STORAGE_KEY = 'custom-flours';

const defaultState: CalculatorState = {
	recipeId: null,
	numberOfPizzas: 4,
	doughBallWeight: 270,
	totalDoughWeight: 1080,
	totalFlourWeight: 0,
	hydration: null,
	predoughRatio: null,
	scaledIngredients: [],
	customFlours: {}
};

// Store for custom ingredient percentages per recipe
const customIngredientsStore = writable<Record<string, Record<string, number>>>({});

// Store for custom flours per recipe and stage
const customFloursStore = writable<CustomFlourState>({});

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

function loadCustomFlours(): CustomFlourState {
	return storage.get<CustomFlourState>(CUSTOM_FLOUR_STORAGE_KEY, {});
}

function saveCustomFlours(data: CustomFlourState) {
	storage.set(CUSTOM_FLOUR_STORAGE_KEY, data);
}

function loadHydrationOverrides(): Record<string, number> {
	return storage.get<Record<string, number>>(HYDRATION_STORAGE_KEY, {});
}

function saveHydrationOverrides(data: Record<string, number>) {
	storage.set(HYDRATION_STORAGE_KEY, data);
}

function getStageKey(stage?: string): string {
	return stage || 'main';
}

function createCalculatorStore() {
	const { subscribe, set, update } = writable<CalculatorState>(loadState());

	// Initialize custom ingredients from localStorage
	customIngredientsStore.set(loadCustomIngredients());
	customFloursStore.set(loadCustomFlours());
	hydrationOverridesStore.set(loadHydrationOverrides());

	let currentRecipe: Recipe | null = null;

	function getCustomFloursForRecipe(recipeId: string): Record<string, CustomFlour[]> {
		return get(customFloursStore)[recipeId] || {};
	}

	function buildIngredientsWithCustomizations(recipe: Recipe): RecipeIngredient[] {
		const customIngredients = get(customIngredientsStore)[recipe.id] || {};
		const recipeCustomFlours = getCustomFloursForRecipe(recipe.id);

		const baseIngredients = recipe.ingredients
			.map((ing) => {
				const override = customIngredients[ing.id];
				const percentage = override !== undefined ? override : ing.percentage;
				return { ...ing, percentage };
			})
			.filter((ing) => !(ing.type === 'flour' && customIngredients[ing.id] === 0));

		const customFlourIngredients: RecipeIngredient[] = [];
		for (const [stage, flours] of Object.entries(recipeCustomFlours)) {
			const stageKey = getStageKey(stage);
			for (const flour of flours) {
				const flourType = flourTypeOptions.find((f) => f.id === flour.flourTypeId);
				const override = customIngredients[flour.flourId];
				const percentage = override !== undefined ? override : flour.percentage;
				const customName = flour.customName;
				const name = customName || flourType?.name || flour.flourTypeId;
				const nameDa = customName || flourType?.nameDa || flourType?.name || flour.flourTypeId;
				customFlourIngredients.push({
					id: flour.flourId,
					name,
					nameDa,
					percentage,
					type: 'flour',
					stage: stageKey === 'main' ? undefined : (stageKey as FermentationStage)
				});
			}
		}

		return [...baseIngredients, ...customFlourIngredients];
	}

	function persistStageFlours(
		recipeId: string,
		stage: string,
		updatedIngredients: RecipeIngredient[],
		removedFlourId?: string,
		customFlourMeta: Record<string, Partial<CustomFlour>> = {}
	) {
		const stageKey = getStageKey(stage);
		const stageFlours = updatedIngredients.filter(
			(ing) => ing.type === 'flour' && getStageKey(ing.stage) === stageKey
		);

		customIngredientsStore.update((state) => {
			const recipeCustoms = { ...(state[recipeId] || {}) };

			if (removedFlourId && !removedFlourId.startsWith('custom-flour-')) {
				recipeCustoms[removedFlourId] = 0;
			}

			for (const flour of stageFlours) {
				if (!flour.id.startsWith('custom-flour-')) {
					recipeCustoms[flour.id] = flour.percentage;
				}
			}

			const newState = { ...state, [recipeId]: recipeCustoms };
			saveCustomIngredients(newState);
			return newState;
		});

		customFloursStore.update((state) => {
			const recipeFlours = { ...(state[recipeId] || {}) };
			const existingStageFlours = recipeFlours[stageKey] || [];

			const updatedStageCustoms: CustomFlour[] = stageFlours
				.filter((flour) => flour.id.startsWith('custom-flour-'))
				.map((flour) => {
					const meta = customFlourMeta[flour.id] || {};
					const existing = existingStageFlours.find((f) => f.flourId === flour.id);
					const flourTypeId =
						meta.flourTypeId ||
						existing?.flourTypeId ||
						flour.id.replace(`custom-flour-${stageKey}-`, '');
					return {
						flourId: flour.id,
						flourTypeId,
						percentage: flour.percentage,
						customName: meta.customName ?? existing?.customName,
						flourType: meta.flourType ?? existing?.flourType
					};
				});

			const newState = {
				...state,
				[recipeId]: {
					...recipeFlours,
					[stageKey]: updatedStageCustoms
				}
			};
			saveCustomFlours(newState);
			return newState;
		});
	}

	function recalculate(state: CalculatorState): CalculatorState {
		if (!currentRecipe) {
			return {
				...state,
				scaledIngredients: [],
				totalFlourWeight: 0,
				totalDoughWeight: state.numberOfPizzas * state.doughBallWeight,
				hydration: null,
				predoughRatio: null,
				customFlours: {}
			};
		}

		// Apply custom ingredients if available
		const customIngredients = get(customIngredientsStore)[currentRecipe.id] || {};
		const recipeCustomFlours = getCustomFloursForRecipe(currentRecipe.id);
		const recipeIngredients = buildIngredientsWithCustomizations(currentRecipe);
		const recipeWithCustoms: Recipe = {
			...currentRecipe,
			ingredients: recipeIngredients.map((ing) => ({
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
			totalDoughWeight,
			customFlours: recipeCustomFlours
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

			const activeIngredients = buildIngredientsWithCustomizations(currentRecipe);
			const flour = activeIngredients.find((i) => i.id === flourId && i.type === 'flour');
			if (!flour) return;

			const stage = getStageKey(flour.stage);

			const rebalanced = rebalanceFlourBlend(activeIngredients, flourId, newPercentage, stage);

			persistStageFlours(currentRecipe.id, stage, rebalanced);

			// Trigger recalculation
			update((state) => recalculate(state));
		},

		addFlourType(
			stage: string,
			flourTypeId: string,
			initialPercentage: number,
			options?: Pick<CustomFlour, 'customName' | 'flourType'>
		) {
			if (!currentRecipe) return;

			const flourType =
				options?.customName !== undefined
					? { id: flourTypeId, name: options.customName, nameDa: options.customName }
					: flourTypeOptions.find((f) => f.id === flourTypeId);
			if (!flourType) return;

			const stageKey = getStageKey(stage);
			const flourId = `custom-flour-${stageKey}-${flourType.id}`;
			const currentIngredients = buildIngredientsWithCustomizations(currentRecipe);
			const updatedIngredients = addFlourToStage(
				currentIngredients,
				stageKey,
				flourType,
				initialPercentage
			);

			if (
				updatedIngredients === currentIngredients ||
				updatedIngredients.length === currentIngredients.length
			) {
				return;
			}

			const customMeta =
				options?.customName || options?.flourType
					? {
							[flourId]: {
								flourTypeId: flourType.id,
								customName: options?.customName,
								flourType: options?.flourType
							}
						}
					: {};

			persistStageFlours(currentRecipe.id, stageKey, updatedIngredients, undefined, customMeta);

			update((state) => recalculate(state));
		},

		removeFlourType(stage: string, flourId: string) {
			if (!currentRecipe) return;

			const stageKey = getStageKey(stage);
			const currentIngredients = buildIngredientsWithCustomizations(currentRecipe);

			const updatedIngredients = removeFlourFromStage(currentIngredients, stageKey, flourId);
			if (updatedIngredients.length === currentIngredients.length) return;

			persistStageFlours(currentRecipe.id, stageKey, updatedIngredients, flourId);

			customIngredientsStore.update((state) => {
				const recipeCustoms = { ...(state[currentRecipe!.id] || {}) };
				if (recipeCustoms[flourId] !== undefined) {
					const { [flourId]: _, ...rest } = recipeCustoms;
					const newState = { ...state, [currentRecipe!.id]: rest };
					saveCustomIngredients(newState);
					return newState;
				}
				return state;
			});

			update((state) => recalculate(state));
		},

		getAvailableFlourTypes(stage: string): FlourTypeOption[] {
			if (!currentRecipe) return [];
			const stageKey = getStageKey(stage);
			const recipeFlours = get(customFloursStore)[currentRecipe.id] || {};
			const usedIds = new Set((recipeFlours[stageKey] || []).map((f) => f.flourTypeId));
			const baseStageFlours = currentRecipe.ingredients.filter(
				(ing) => ing.type === 'flour' && getStageKey(ing.stage) === stageKey
			);
			for (const flour of baseStageFlours) {
				usedIds.add(flour.id);
			}
			return flourTypeOptions.filter((type) => !usedIds.has(type.id));
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
			const recipeWithCustoms: Recipe = {
				...currentRecipe,
				ingredients: buildIngredientsWithCustomizations(currentRecipe)
			};
			return getControllableIngredients(recipeWithCustoms, customIngredients);
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

			customFloursStore.update((state) => {
				const { [currentRecipe!.id]: _, ...rest } = state;
				saveCustomFlours(rest);
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
			const customFlours = get(customFloursStore)[currentRecipe.id];
			const hasCustomFlours = customFlours
				? Object.values(customFlours).some((flours) => flours.length > 0)
				: false;
			return hasIngredientCustoms || hasHydrationCustom || hasCustomFlours;
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
