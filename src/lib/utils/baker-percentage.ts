import type { Recipe, RecipeIngredient, FermentationStage } from '$lib/types/recipe';
import type {
	ScaledIngredient,
	CalculatorInput,
	RecipeControls,
	FlourBlendInfo,
	ExtraIngredientInfo
} from '$lib/types/ingredient';
import type { FlourTypeOption } from '$lib/types/reference';

// Predough stage types
const PREDOUGH_STAGES: FermentationStage[] = ['poolish', 'biga', 'preferment'];

// Non-controllable ingredient types (flour and water are controlled via hydration/blend)
const NON_EXTRA_TYPES = ['flour', 'water'] as const;

function getStageKey(stage?: string): string {
	return stage || 'main';
}

/**
 * Calculate ingredient weight from flour weight and percentage
 * Returns weight with two decimal precision
 */
export function calculateIngredientWeight(flourWeight: number, percentage: number): number {
	return Math.round(((flourWeight * percentage) / 100) * 100) / 100;
}

/**
 * Get total percentage of all ingredients (flour is always 100%)
 */
export function getTotalPercentage(ingredients: RecipeIngredient[]): number {
	return ingredients.reduce((sum, ing) => sum + ing.percentage, 0);
}

/**
 * Check if an ingredient belongs to a predough stage
 */
export function isPredoughStage(stage?: FermentationStage): boolean {
	return stage !== undefined && PREDOUGH_STAGES.includes(stage);
}

export function addFlourToStage(
	ingredients: RecipeIngredient[],
	stage: string,
	flourType: FlourTypeOption,
	percentage: number
): RecipeIngredient[] {
	const stageKey = getStageKey(stage);
	const floursInStage = ingredients.filter(
		(ing) => ing.type === 'flour' && getStageKey(ing.stage) === stageKey
	);

	if (floursInStage.length === 0) return ingredients;

	const flourId = `custom-flour-${stageKey}-${flourType.id}`;
	if (ingredients.some((ing) => ing.id === flourId)) return ingredients;

	const largest = floursInStage.reduce((max, current) =>
		current.percentage > max.percentage ? current : max
	);
	const adjustment = Math.min(percentage, largest.percentage);

	const updatedIngredients = ingredients.map((ing) => {
		if (ing.id === largest.id) {
			const newPct = Math.max(0, ing.percentage - adjustment);
			return { ...ing, percentage: Math.round(newPct * 100) / 100 };
		}
		return ing;
	});

	const newFlour: RecipeIngredient = {
		id: flourId,
		name: flourType.name,
		nameDa: flourType.nameDa,
		percentage: Math.round(adjustment * 100) / 100,
		type: 'flour',
		stage: stageKey === 'main' ? undefined : (stageKey as FermentationStage)
	};

	return [...updatedIngredients, newFlour];
}

export function removeFlourFromStage(
	ingredients: RecipeIngredient[],
	stage: string,
	flourId: string
): RecipeIngredient[] {
	const stageKey = getStageKey(stage);
	const floursInStage = ingredients.filter(
		(ing) => ing.type === 'flour' && getStageKey(ing.stage) === stageKey
	);

	if (floursInStage.length <= 1) return ingredients;

	const flourToRemove = floursInStage.find((f) => f.id === flourId);
	if (!flourToRemove) return ingredients;

	const remaining = floursInStage.filter((f) => f.id !== flourId);
	if (remaining.length === 0) return ingredients;

	const remainingTotal = remaining.reduce((sum, f) => sum + f.percentage, 0);
	const redistribute = flourToRemove.percentage;

	const updatedStageFlours = remaining.map((flour) => {
		const baseShare = remainingTotal > 0 ? flour.percentage / remainingTotal : 1 / remaining.length;
		const adjusted = flour.percentage + redistribute * baseShare;
		return { ...flour, percentage: Math.round(adjusted * 100) / 100 };
	});

	return ingredients
		.filter((ing) => ing.id !== flourId)
		.map((ing) => {
			if (ing.type === 'flour' && getStageKey(ing.stage) === stageKey) {
				const replacement = updatedStageFlours.find((f) => f.id === ing.id);
				if (replacement) return replacement;
			}
			return ing;
		});
}

/**
 * Get the predough stage name from a recipe (if any)
 */
export function getPredoughStageName(recipe: Recipe): FermentationStage | null {
	const predoughIngredient = recipe.ingredients.find((ing) => isPredoughStage(ing.stage));
	return predoughIngredient?.stage || null;
}

/**
 * Get the original predough flour ratio from a recipe
 * Returns the percentage of total flour that goes into the predough (as a decimal, e.g., 0.1935 for 19.35%)
 */
export function getOriginalPredoughRatio(recipe: Recipe): number | null {
	const predoughFlourTotal = recipe.ingredients
		.filter((ing) => ing.type === 'flour' && isPredoughStage(ing.stage))
		.reduce((sum, ing) => sum + ing.percentage, 0);

	if (predoughFlourTotal === 0) return null;

	return predoughFlourTotal / 100;
}

/**
 * Redistribute water ingredients when hydration changes.
 * Preserves proportional split between stages (if poolish had 30% of total water, it keeps 30%).
 */
export function redistributeWater(
	ingredients: RecipeIngredient[],
	newHydration: number,
	oldHydration: number
): RecipeIngredient[] {
	if (oldHydration === 0) return ingredients;

	const ratio = newHydration / oldHydration;

	return ingredients.map((ing) => {
		if (ing.type === 'water') {
			return { ...ing, percentage: Math.round(ing.percentage * ratio * 100) / 100 };
		}
		return ing;
	});
}

/**
 * Rebalance flour blend when one flour in a stage changes.
 * For 2 flours: other flour = stageTotal - newPercentage.
 * For 3+ flours: distribute the delta proportionally across remaining flours.
 */
export function rebalanceFlourBlend(
	ingredients: RecipeIngredient[],
	changedFlourId: string,
	newPercentage: number,
	stage: string
): RecipeIngredient[] {
	const stageKey = getStageKey(stage);
	const floursInStage = ingredients.filter(
		(ing) => ing.type === 'flour' && getStageKey(ing.stage) === stageKey
	);

	if (floursInStage.length < 2) return ingredients;

	const stageFlourTotal = floursInStage.reduce((sum, ing) => sum + ing.percentage, 0);
	const changedFlour = floursInStage.find((f) => f.id === changedFlourId);
	if (!changedFlour) return ingredients;

	const oldPercentage = changedFlour.percentage;
	const delta = newPercentage - oldPercentage;
	const otherFlours = floursInStage.filter((f) => f.id !== changedFlourId);

	if (otherFlours.length === 1) {
		// For 2 flours: simply set the other to the remaining
		const otherNewPct = stageFlourTotal - newPercentage;
		return ingredients.map((ing) => {
			if (ing.id === changedFlourId) {
				return { ...ing, percentage: newPercentage };
			}
			if (ing.id === otherFlours[0].id) {
				return { ...ing, percentage: Math.max(0, otherNewPct) };
			}
			return ing;
		});
	}

	// For 3+ flours: distribute delta proportionally across remaining flours
	const otherTotal = otherFlours.reduce((sum, f) => sum + f.percentage, 0);

	return ingredients.map((ing) => {
		if (ing.id === changedFlourId) {
			return { ...ing, percentage: newPercentage };
		}
		const isOtherFlour = otherFlours.some((f) => f.id === ing.id);
		if (isOtherFlour && otherTotal > 0) {
			const proportion = ing.percentage / otherTotal;
			const adjusted = ing.percentage - delta * proportion;
			return { ...ing, percentage: Math.max(0, Math.round(adjusted * 100) / 100) };
		}
		return ing;
	});
}

/**
 * Extract controllable ingredients from a recipe for the UI to render.
 */
export function getControllableIngredients(
	recipe: Recipe,
	customIngredients?: Record<string, number>
): RecipeControls {
	const customs = customIngredients || {};

	// Calculate hydration from current ingredients (considering customizations)
	const ingredientsWithCustoms = recipe.ingredients.map((ing) => ({
		...ing,
		percentage: customs[ing.id] ?? ing.percentage
	}));
	const hydration = calculateHydration(ingredientsWithCustoms);

	// Predough ratio
	const predoughRatio = getOriginalPredoughRatio(recipe);

	// Flour blends: stages with flour types (single or multiple)
	const flours: FlourBlendInfo[] = [];
	const stageMap = new Map<string, RecipeIngredient[]>();
	for (const ing of recipe.ingredients) {
		if (ing.type === 'flour') {
			const stage = ing.stage || 'main';
			const existing = stageMap.get(stage) || [];
			existing.push(ing);
			stageMap.set(stage, existing);
		}
	}
	for (const [stage, stageFlours] of stageMap) {
		if (stageFlours.length >= 1) {
			flours.push({
				stage,
				flours: stageFlours.map((f) => ({
					id: f.id,
					name: f.name,
					nameDa: f.nameDa,
					percentage: customs[f.id] ?? f.percentage
				}))
			});
		}
	}

	// Extra ingredients: every non-flour, non-water ingredient as its own control
	const extras: ExtraIngredientInfo[] = [];
	for (const ing of recipe.ingredients) {
		if (!(NON_EXTRA_TYPES as readonly string[]).includes(ing.type)) {
			extras.push({
				id: ing.id,
				name: ing.name,
				nameDa: ing.nameDa,
				type: ing.type,
				stage: ing.stage,
				percentage: customs[ing.id] ?? ing.percentage,
				originalPercentage: ing.percentage
			});
		}
	}

	return {
		hydration,
		predoughRatio,
		flours,
		extras
	};
}

/**
 * Calculate total flour weight needed for target dough weight
 * Formula: flourWeight = totalDoughWeight / (totalPercentage / 100)
 */
export function calculateTotalFlour(
	numberOfPizzas: number,
	doughBallWeight: number,
	totalPercentage: number
): number {
	const totalDoughWeight = numberOfPizzas * doughBallWeight;
	const flourWeight = (totalDoughWeight * 100) / totalPercentage;
	return Math.round(flourWeight);
}

/**
 * Scale entire recipe to desired number of pizzas and ball weight
 * Supports adjustable predough ratio and hydration override
 */
export function scaleRecipe(
	recipe: Recipe,
	input: CalculatorInput
): { scaledIngredients: ScaledIngredient[]; totalFlourWeight: number; totalDoughWeight: number } {
	const { numberOfPizzas, doughBallWeight, predoughRatio, hydration: hydrationOverride } = input;
	const totalDoughWeight = numberOfPizzas * doughBallWeight;

	// Get original predough ratio from recipe
	const originalPredoughRatio = getOriginalPredoughRatio(recipe);
	const predoughStage = getPredoughStageName(recipe);

	// Determine if we need to adjust predough percentages
	const hasPredough = originalPredoughRatio !== null && predoughStage !== null;
	const effectivePredoughRatio =
		hasPredough && predoughRatio !== null && predoughRatio !== undefined
			? predoughRatio
			: originalPredoughRatio;

	// Calculate adjusted ingredients if predough ratio changed
	let adjustedIngredients: RecipeIngredient[] = [...recipe.ingredients];
	if (
		hasPredough &&
		effectivePredoughRatio !== null &&
		originalPredoughRatio !== null &&
		predoughRatio !== null &&
		predoughRatio !== undefined
	) {
		const ratioMultiplier = predoughRatio / originalPredoughRatio;
		const targetPredoughFlourPct = predoughRatio * 100;
		const targetMainFlourPct = 100 - targetPredoughFlourPct;

		const originalPredoughFlourTotal = recipe.ingredients
			.filter((ing) => ing.type === 'flour' && isPredoughStage(ing.stage))
			.reduce((sum, ing) => sum + ing.percentage, 0);
		const originalMainFlourTotal = recipe.ingredients
			.filter((ing) => ing.type === 'flour' && !isPredoughStage(ing.stage))
			.reduce((sum, ing) => sum + ing.percentage, 0);
		const predoughFlourMultiplier =
			originalPredoughFlourTotal > 0 ? targetPredoughFlourPct / originalPredoughFlourTotal : 0;
		const mainFlourMultiplier =
			originalMainFlourTotal > 0 ? targetMainFlourPct / originalMainFlourTotal : 0;

		// Calculate original predough water percentage to maintain total hydration
		const originalPredoughWater = recipe.ingredients
			.filter((ing) => ing.type === 'water' && isPredoughStage(ing.stage))
			.reduce((sum, ing) => sum + ing.percentage, 0);

		// Calculate new predough water percentage after scaling
		const newPredoughWater = originalPredoughWater * ratioMultiplier;

		// Calculate how much water was removed from predough
		const waterDifference = originalPredoughWater - newPredoughWater;

		// Check if main flour exists
		const hasMainFlour = recipe.ingredients.some(
			(ing) => ing.type === 'flour' && !isPredoughStage(ing.stage)
		);

		const mainStage =
			recipe.ingredients.find((ing) => !isPredoughStage(ing.stage))?.stage ?? 'main';

		adjustedIngredients = recipe.ingredients.map((ing) => {
			if (isPredoughStage(ing.stage)) {
				// Scale predough ingredients by the ratio change
				if (ing.type === 'flour') {
					return { ...ing, percentage: ing.percentage * predoughFlourMultiplier };
				}
				// Scale other predough ingredients proportionally
				return { ...ing, percentage: ing.percentage * ratioMultiplier };
			} else if (ing.type === 'flour' && !isPredoughStage(ing.stage)) {
				// Adjust main dough flour proportionally to maintain total flour at 100%
				return { ...ing, percentage: ing.percentage * mainFlourMultiplier };
			} else if (ing.type === 'water' && !isPredoughStage(ing.stage)) {
				// Adjust main dough water to maintain total hydration
				return { ...ing, percentage: ing.percentage + waterDifference };
			}
			return ing;
		});

		// Add main flour if it doesn't exist and predough ratio is less than 100%
		if (!hasMainFlour && predoughRatio < 1) {
			const newMainFlourPct = 100 - predoughRatio * 100;
			adjustedIngredients.push({
				id: 'main-flour',
				name: 'Main dough flour',
				nameDa: 'Mel',
				percentage: newMainFlourPct,
				type: 'flour',
				stage: mainStage
			});
		}

		// Add main water if it doesn't exist and there's water to redistribute
		const hasMainWater = recipe.ingredients.some(
			(ing) => ing.type === 'water' && !isPredoughStage(ing.stage)
		);
		if (!hasMainWater && waterDifference > 0) {
			adjustedIngredients.push({
				id: 'main-water',
				name: 'Main dough water',
				nameDa: 'Vand',
				percentage: waterDifference,
				type: 'water',
				stage: mainStage
			});
		}
	}

	// Apply hydration override if provided
	if (hydrationOverride !== null && hydrationOverride !== undefined) {
		const currentHydration = calculateHydration(adjustedIngredients);
		if (currentHydration > 0) {
			adjustedIngredients = redistributeWater(
				adjustedIngredients,
				hydrationOverride,
				currentHydration
			);
		}
	}

	// Get total percentage from adjusted ingredients
	const totalPercentage = getTotalPercentage(adjustedIngredients);

	// Calculate flour weight needed
	const totalFlourWeight = calculateTotalFlour(numberOfPizzas, doughBallWeight, totalPercentage);

	// Calculate predough flour weight for stage percentage calculation
	const predoughFlourWeight =
		hasPredough && effectivePredoughRatio !== null ? totalFlourWeight * effectivePredoughRatio : 0;
	const mainFlourWeight = totalFlourWeight - predoughFlourWeight;

	// Scale each ingredient and calculate stage percentages
	const scaledIngredients: ScaledIngredient[] = adjustedIngredients.map((ing) => {
		const weight = calculateIngredientWeight(totalFlourWeight, ing.percentage);

		// Calculate stage percentage (relative to the stage's flour)
		let stagePercentage = ing.percentage;
		if (isPredoughStage(ing.stage) && predoughFlourWeight > 0) {
			// For predough ingredients, calculate percentage relative to predough flour
			stagePercentage = (weight / predoughFlourWeight) * 100;
		} else if (!isPredoughStage(ing.stage) && mainFlourWeight > 0) {
			// For main dough ingredients, calculate percentage relative to main flour
			stagePercentage = (weight / mainFlourWeight) * 100;
		}

		return {
			id: ing.id,
			name: ing.name,
			nameDa: ing.nameDa,
			percentage: ing.percentage,
			stagePercentage: Math.round(stagePercentage * 100) / 100,
			weight,
			type: ing.type,
			stage: ing.stage,
			notes: ing.notes
		};
	});

	return {
		scaledIngredients,
		totalFlourWeight,
		totalDoughWeight
	};
}

/**
 * Format weight for display (with unit)
 */
export function formatWeight(grams: number): string {
	if (grams >= 1000) {
		return `${(grams / 1000).toFixed(2)} kg`;
	}
	// Show two decimals for precision
	const rounded = Math.round(grams * 100) / 100;
	// Only show decimals if they exist
	if (rounded === Math.floor(rounded)) {
		return `${rounded} g`;
	}
	return `${rounded.toFixed(2)} g`;
}

/**
 * Calculate hydration percentage from ingredients
 */
export function calculateHydration(ingredients: RecipeIngredient[]): number {
	const flourIngredients = ingredients.filter((i) => i.type === 'flour');
	const waterIngredients = ingredients.filter((i) => i.type === 'water');

	const totalFlourPercentage = flourIngredients.reduce((sum, i) => sum + i.percentage, 0);
	const totalWaterPercentage = waterIngredients.reduce((sum, i) => sum + i.percentage, 0);

	if (totalFlourPercentage === 0) return 0;

	// Hydration = (water / flour) * 100
	// Since flour is base 100%, water percentage is already the hydration
	return Math.round(totalWaterPercentage);
}

/**
 * Validate recipe ingredients
 */
export function validateRecipe(recipe: Recipe): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Check for flour
	const hasFlour = recipe.ingredients.some((i) => i.type === 'flour');
	if (!hasFlour) {
		errors.push('Opskriften mangler mel');
	}

	// Check for water
	const hasWater = recipe.ingredients.some((i) => i.type === 'water');
	if (!hasWater) {
		errors.push('Opskriften mangler vand');
	}

	// Check percentages are reasonable
	const totalPercentage = getTotalPercentage(recipe.ingredients);
	if (totalPercentage < 150 || totalPercentage > 300) {
		errors.push('Ingrediens-procenterne ser ikke korrekte ud');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
