import type { Recipe, RecipeIngredient, FermentationStage } from '$lib/types/recipe';
import type { ScaledIngredient, CalculatorInput } from '$lib/types/ingredient';

// Predough stage types
const PREDOUGH_STAGES: FermentationStage[] = ['poolish', 'biga', 'preferment'];

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
	const predoughFlour = recipe.ingredients.find(
		(ing) => ing.type === 'flour' && isPredoughStage(ing.stage)
	);

	if (!predoughFlour) return null;

	// The predough flour percentage is already the ratio (e.g., 19.35% means 19.35% of total flour)
	return predoughFlour.percentage / 100;
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
 * Supports adjustable predough ratio
 */
export function scaleRecipe(
	recipe: Recipe,
	input: CalculatorInput
): { scaledIngredients: ScaledIngredient[]; totalFlourWeight: number; totalDoughWeight: number } {
	const { numberOfPizzas, doughBallWeight, predoughRatio } = input;
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
	let adjustedIngredients = recipe.ingredients;
	if (
		hasPredough &&
		effectivePredoughRatio !== null &&
		originalPredoughRatio !== null &&
		predoughRatio !== null &&
		predoughRatio !== undefined
	) {
		const ratioMultiplier = predoughRatio / originalPredoughRatio;
		adjustedIngredients = recipe.ingredients.map((ing) => {
			if (isPredoughStage(ing.stage)) {
				// Scale predough ingredients by the ratio change
				if (ing.type === 'flour') {
					return { ...ing, percentage: predoughRatio * 100 };
				}
				// Scale other predough ingredients proportionally
				return { ...ing, percentage: ing.percentage * ratioMultiplier };
			} else if (ing.type === 'flour' && !isPredoughStage(ing.stage)) {
				// Adjust main dough flour to compensate
				const newMainFlourPct = 100 - predoughRatio * 100;
				return { ...ing, percentage: newMainFlourPct };
			}
			return ing;
		});
	}

	// Get total percentage from adjusted ingredients
	const totalPercentage = getTotalPercentage(adjustedIngredients);

	// Calculate flour weight needed
	const totalFlourWeight = calculateTotalFlour(numberOfPizzas, doughBallWeight, totalPercentage);

	// Calculate predough flour weight for stage percentage calculation
	const predoughFlourWeight =
		hasPredough && effectivePredoughRatio !== null
			? totalFlourWeight * effectivePredoughRatio
			: 0;
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
