// ABOUTME: Baker's percentage calculations, recipe scaling, and ingredient management
import type { Recipe, RecipeIngredient, MixingStep } from '$lib/types/recipe';
import type {
	ScaledIngredient,
	CalculatorInput,
	RecipeControls,
	FlourBlendInfo,
	ExtraIngredientInfo
} from '$lib/types/ingredient';
import type { FlourTypeOption } from '$lib/types/reference';

// Non-controllable ingredient types (flour and water are controlled via hydration/blend)
const NON_EXTRA_TYPES = ['flour', 'water'] as const;

// A recipe ingredient tagged with its mixing step
export interface FlatIngredient extends RecipeIngredient {
	mixingStepId: string;
}

/**
 * Flatten all ingredients from a recipe's mixing steps into a single array.
 * Each ingredient is tagged with its mixingStepId for grouping.
 */
export function getAllIngredients(recipe: Recipe): FlatIngredient[] {
	const result: FlatIngredient[] = [];
	for (const step of recipe.mixingSteps) {
		for (const ing of step.ingredients) {
			result.push({ ...ing, mixingStepId: step.id });
		}
	}
	return result;
}

/**
 * Check if a mixing step is a predough step
 */
export function isPredoughStep(recipe: Recipe, mixingStepId: string): boolean {
	return recipe.mixingSteps.find((s) => s.id === mixingStepId)?.predough === true;
}

/**
 * Get the predough mixing step from a recipe (if any)
 */
export function getPredoughStep(recipe: Recipe): MixingStep | undefined {
	return recipe.mixingSteps.find((s) => s.predough === true);
}

function getTotalFlourPercentage(ingredients: FlatIngredient[]): number {
	return ingredients
		.filter((ing) => ing.type === 'flour')
		.reduce((sum, ing) => sum + ing.percentage, 0);
}

function normalizeFlourPercentages(ingredients: FlatIngredient[]): {
	ingredients: FlatIngredient[];
	flourTotal: number;
} {
	const flourTotal = getTotalFlourPercentage(ingredients);
	if (flourTotal === 0 || Math.abs(flourTotal - 100) < 0.001) {
		return { ingredients, flourTotal };
	}

	const normalizationFactor = 100 / flourTotal;
	const normalizedIngredients = ingredients.map((ing) => {
		if (ing.type !== 'flour') return ing;
		const normalized = ing.percentage * normalizationFactor;
		return { ...ing, percentage: Math.round(normalized * 100) / 100 };
	});

	return { ingredients: normalizedIngredients, flourTotal };
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

export function addFlourToStage(
	ingredients: FlatIngredient[],
	mixingStepId: string,
	flourType: FlourTypeOption,
	percentage: number
): FlatIngredient[] {
	const floursInStep = ingredients.filter(
		(ing) => ing.type === 'flour' && ing.mixingStepId === mixingStepId
	);

	if (floursInStep.length === 0) return ingredients;

	const flourId = `custom-flour-${mixingStepId}-${flourType.id}`;
	if (ingredients.some((ing) => ing.id === flourId)) return ingredients;

	const largest = floursInStep.reduce((max, current) =>
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

	const newFlour: FlatIngredient = {
		id: flourId,
		name: flourType.name,
		nameDa: flourType.nameDa,
		percentage: Math.round(adjustment * 100) / 100,
		type: 'flour',
		mixingStepId
	};

	return [...updatedIngredients, newFlour];
}

export function removeFlourFromStage(
	ingredients: FlatIngredient[],
	mixingStepId: string,
	flourId: string
): FlatIngredient[] {
	const floursInStep = ingredients.filter(
		(ing) => ing.type === 'flour' && ing.mixingStepId === mixingStepId
	);

	if (floursInStep.length <= 1) return ingredients;

	const flourToRemove = floursInStep.find((f) => f.id === flourId);
	if (!flourToRemove) return ingredients;

	const remaining = floursInStep.filter((f) => f.id !== flourId);
	if (remaining.length === 0) return ingredients;

	const remainingTotal = remaining.reduce((sum, f) => sum + f.percentage, 0);
	const redistribute = flourToRemove.percentage;

	const updatedStepFlours = remaining.map((flour) => {
		const baseShare = remainingTotal > 0 ? flour.percentage / remainingTotal : 1 / remaining.length;
		const adjusted = flour.percentage + redistribute * baseShare;
		return { ...flour, percentage: Math.round(adjusted * 100) / 100 };
	});

	return ingredients
		.filter((ing) => ing.id !== flourId)
		.map((ing) => {
			if (ing.type === 'flour' && ing.mixingStepId === mixingStepId) {
				const replacement = updatedStepFlours.find((f) => f.id === ing.id);
				if (replacement) return replacement;
			}
			return ing;
		});
}

/**
 * Get the original predough flour ratio from a recipe
 * Returns the percentage of total flour that goes into the predough (as a decimal, e.g., 0.1935 for 19.35%)
 */
export function getOriginalPredoughRatio(recipe: Recipe): number | null {
	const allIngredients = getAllIngredients(recipe);
	const totalFlour = getTotalFlourPercentage(allIngredients);
	const predoughFlourTotal = allIngredients
		.filter((ing) => ing.type === 'flour' && isPredoughStep(recipe, ing.mixingStepId))
		.reduce((sum, ing) => sum + ing.percentage, 0);

	if (predoughFlourTotal === 0 || totalFlour === 0) return null;

	return predoughFlourTotal / totalFlour;
}

/**
 * Redistribute water ingredients when hydration changes.
 * Preserves proportional split between stages (if poolish had 30% of total water, it keeps 30%).
 */
export function redistributeWater(
	ingredients: FlatIngredient[],
	newHydration: number,
	oldHydration: number
): FlatIngredient[] {
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
 * Rebalance flour blend when one flour in a step changes.
 * For 2 flours: other flour = stepTotal - newPercentage.
 * For 3+ flours: distribute the delta proportionally across remaining flours.
 */
export function rebalanceFlourBlend(
	ingredients: FlatIngredient[],
	changedFlourId: string,
	newPercentage: number,
	mixingStepId: string
): FlatIngredient[] {
	const floursInStep = ingredients.filter(
		(ing) => ing.type === 'flour' && ing.mixingStepId === mixingStepId
	);

	if (floursInStep.length < 2) return ingredients;

	const stepFlourTotal = floursInStep.reduce((sum, ing) => sum + ing.percentage, 0);
	const changedFlour = floursInStep.find((f) => f.id === changedFlourId);
	if (!changedFlour) return ingredients;

	const oldPercentage = changedFlour.percentage;
	const delta = newPercentage - oldPercentage;
	const otherFlours = floursInStep.filter((f) => f.id !== changedFlourId);

	if (otherFlours.length === 1) {
		// For 2 flours: simply set the other to the remaining
		const otherNewPct = stepFlourTotal - newPercentage;
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

	const allIngredients = getAllIngredients(recipe);

	// Calculate hydration from current ingredients (considering customizations)
	const ingredientsWithCustoms = allIngredients.map((ing) => ({
		...ing,
		percentage: customs[ing.id] ?? ing.percentage
	}));
	const { ingredients: normalizedIngredients } = normalizeFlourPercentages(ingredientsWithCustoms);
	const { ingredients: normalizedBaseIngredients } = normalizeFlourPercentages(allIngredients);
	const hydration = calculateHydration(normalizedIngredients);

	// Predough ratio
	const normalizedRecipe = recipeWithFlatIngredients(recipe, normalizedIngredients);
	const predoughRatio = getOriginalPredoughRatio(normalizedRecipe);

	// Flour blends: mixing steps with flour types (single or multiple)
	const flours: FlourBlendInfo[] = [];
	const stepMap = new Map<string, FlatIngredient[]>();
	for (const ing of normalizedIngredients) {
		if (ing.type === 'flour') {
			const existing = stepMap.get(ing.mixingStepId) || [];
			existing.push(ing);
			stepMap.set(ing.mixingStepId, existing);
		}
	}
	for (const [mixingStepId, stepFlours] of stepMap) {
		if (stepFlours.length >= 1) {
			flours.push({
				mixingStepId,
				flours: stepFlours.map((f) => ({
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
	for (const ing of normalizedIngredients) {
		if (!(NON_EXTRA_TYPES as readonly string[]).includes(ing.type)) {
			const original = normalizedBaseIngredients.find((base) => base.id === ing.id);
			extras.push({
				id: ing.id,
				name: ing.name,
				nameDa: ing.nameDa,
				type: ing.type,
				mixingStepId: ing.mixingStepId,
				percentage: customs[ing.id] ?? ing.percentage,
				originalPercentage: original?.percentage ?? ing.percentage
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
 * Build a temporary recipe with flat ingredients mapped back into mixing steps.
 * Used internally so functions like getOriginalPredoughRatio() work with modified ingredients.
 */
export function recipeWithFlatIngredients(
	recipe: Recipe,
	flatIngredients: FlatIngredient[]
): Recipe {
	const mixingSteps = recipe.mixingSteps.map((step) => ({
		...step,
		ingredients: flatIngredients
			.filter((ing) => ing.mixingStepId === step.id)
			.map(({ mixingStepId: _, ...rest }) => rest)
	}));
	return { ...recipe, mixingSteps };
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
	const { ingredients: normalizedIngredients } = normalizeFlourPercentages(
		getAllIngredients(recipe)
	);
	const normalizedRecipe = recipeWithFlatIngredients(recipe, normalizedIngredients);

	// Get original predough ratio from recipe
	const originalPredoughRatio = getOriginalPredoughRatio(normalizedRecipe);
	const predoughStep = getPredoughStep(normalizedRecipe);

	// Determine if we need to adjust predough percentages
	const hasPredough = originalPredoughRatio !== null && predoughStep !== null;
	const effectivePredoughRatio =
		hasPredough && predoughRatio !== null && predoughRatio !== undefined
			? predoughRatio
			: originalPredoughRatio;

	// Calculate adjusted ingredients if predough ratio changed
	let adjustedIngredients: FlatIngredient[] = [...normalizedIngredients];
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

		const originalPredoughFlourTotal = normalizedIngredients
			.filter((ing) => ing.type === 'flour' && isPredoughStep(normalizedRecipe, ing.mixingStepId))
			.reduce((sum, ing) => sum + ing.percentage, 0);
		const originalMainFlourTotal = normalizedIngredients
			.filter((ing) => ing.type === 'flour' && !isPredoughStep(normalizedRecipe, ing.mixingStepId))
			.reduce((sum, ing) => sum + ing.percentage, 0);
		const predoughFlourMultiplier =
			originalPredoughFlourTotal > 0 ? targetPredoughFlourPct / originalPredoughFlourTotal : 0;
		const mainFlourMultiplier =
			originalMainFlourTotal > 0 ? targetMainFlourPct / originalMainFlourTotal : 0;

		// Calculate original predough water percentage to maintain total hydration
		const originalPredoughWater = normalizedIngredients
			.filter((ing) => ing.type === 'water' && isPredoughStep(normalizedRecipe, ing.mixingStepId))
			.reduce((sum, ing) => sum + ing.percentage, 0);

		// Calculate new predough water percentage after scaling
		const newPredoughWater = originalPredoughWater * ratioMultiplier;

		// Calculate how much water was removed from predough
		const waterDifference = originalPredoughWater - newPredoughWater;

		// Check if main flour exists
		const hasMainFlour = normalizedIngredients.some(
			(ing) => ing.type === 'flour' && !isPredoughStep(normalizedRecipe, ing.mixingStepId)
		);

		// Find the main mixing step id
		const mainStep = normalizedRecipe.mixingSteps.find((s) => !s.predough);
		const mainStepId = mainStep?.id ?? 'main';

		adjustedIngredients = normalizedIngredients.map((ing) => {
			if (isPredoughStep(normalizedRecipe, ing.mixingStepId)) {
				// Scale predough ingredients by the ratio change
				if (ing.type === 'flour') {
					return { ...ing, percentage: ing.percentage * predoughFlourMultiplier };
				}
				// Scale other predough ingredients proportionally
				return { ...ing, percentage: ing.percentage * ratioMultiplier };
			} else if (ing.type === 'flour' && !isPredoughStep(normalizedRecipe, ing.mixingStepId)) {
				// Adjust main dough flour proportionally to maintain total flour at 100%
				return { ...ing, percentage: ing.percentage * mainFlourMultiplier };
			} else if (ing.type === 'water' && !isPredoughStep(normalizedRecipe, ing.mixingStepId)) {
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
				mixingStepId: mainStepId
			});
		}

		// Add main water if it doesn't exist and there's water to redistribute
		const hasMainWater = normalizedIngredients.some(
			(ing) => ing.type === 'water' && !isPredoughStep(normalizedRecipe, ing.mixingStepId)
		);
		if (!hasMainWater && waterDifference > 0) {
			adjustedIngredients.push({
				id: 'main-water',
				name: 'Main dough water',
				nameDa: 'Vand',
				percentage: waterDifference,
				type: 'water',
				mixingStepId: mainStepId
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

	// Calculate step flour weights from actual flour distribution
	const flourIngredients = adjustedIngredients.filter((ing) => ing.type === 'flour');
	const totalFlourPercentage = flourIngredients.reduce((sum, ing) => sum + ing.percentage, 0);
	const predoughFlourPercentage = flourIngredients
		.filter((ing) => isPredoughStep(normalizedRecipe, ing.mixingStepId))
		.reduce((sum, ing) => sum + ing.percentage, 0);
	const mainFlourPercentage = totalFlourPercentage - predoughFlourPercentage;

	let predoughFlourWeight = 0;
	let mainFlourWeight = 0;

	if (totalFlourPercentage > 0) {
		predoughFlourWeight = (predoughFlourPercentage / totalFlourPercentage) * totalFlourWeight;
		mainFlourWeight = (mainFlourPercentage / totalFlourPercentage) * totalFlourWeight;
	}

	// Scale each ingredient and calculate step percentages
	const scaledIngredients: ScaledIngredient[] = adjustedIngredients.map((ing) => {
		const weight = calculateIngredientWeight(totalFlourWeight, ing.percentage);
		const isPredough = isPredoughStep(normalizedRecipe, ing.mixingStepId);

		// Calculate step percentage (relative to the step's flour)
		let stagePercentage = ing.percentage;
		if (isPredough && predoughFlourWeight > 0) {
			// For predough ingredients, calculate percentage relative to predough flour
			stagePercentage = (weight / predoughFlourWeight) * 100;
		} else if (!isPredough && mainFlourWeight > 0) {
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
			mixingStepId: ing.mixingStepId,
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
	// Tag with dummy mixingStepId for normalization
	const flat: FlatIngredient[] = ingredients.map((ing) => ({
		...ing,
		mixingStepId: (ing as FlatIngredient).mixingStepId ?? 'main'
	}));
	const { ingredients: normalizedIngredients } = normalizeFlourPercentages(flat);
	const flourIngredients = normalizedIngredients.filter((i) => i.type === 'flour');
	const waterIngredients = normalizedIngredients.filter((i) => i.type === 'water');

	const totalFlourPercentage = flourIngredients.reduce((sum, i) => sum + i.percentage, 0);
	const totalWaterPercentage = waterIngredients.reduce((sum, i) => sum + i.percentage, 0);

	if (totalFlourPercentage === 0) return 0;

	// Hydration = (water / flour) * 100
	return Math.round((totalWaterPercentage / totalFlourPercentage) * 100);
}

/**
 * Validate recipe ingredients
 */
export function validateRecipe(recipe: Recipe): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	const allIngredients = getAllIngredients(recipe);
	const { ingredients: normalizedIngredients } = normalizeFlourPercentages(allIngredients);

	// Check for flour
	const hasFlour = normalizedIngredients.some((i) => i.type === 'flour');
	if (!hasFlour) {
		errors.push('Opskriften mangler mel');
	}

	// Check for water
	const hasWater = normalizedIngredients.some((i) => i.type === 'water');
	if (!hasWater) {
		errors.push('Opskriften mangler vand');
	}

	// Check percentages are reasonable
	const totalPercentage = getTotalPercentage(normalizedIngredients);
	if (totalPercentage < 150 || totalPercentage > 300) {
		errors.push('Ingrediens-procenterne ser ikke korrekte ud');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
