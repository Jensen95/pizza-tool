import type { Recipe, RecipeIngredient } from '$lib/types/recipe';
import type { ScaledIngredient, CalculatorInput } from '$lib/types/ingredient';

/**
 * Calculate ingredient weight from flour weight and percentage
 */
export function calculateIngredientWeight(flourWeight: number, percentage: number): number {
	return Math.round((flourWeight * percentage) / 100);
}

/**
 * Get total percentage of all ingredients (flour is always 100%)
 */
export function getTotalPercentage(ingredients: RecipeIngredient[]): number {
	return ingredients.reduce((sum, ing) => sum + ing.percentage, 0);
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
 */
export function scaleRecipe(
	recipe: Recipe,
	input: CalculatorInput
): { scaledIngredients: ScaledIngredient[]; totalFlourWeight: number; totalDoughWeight: number } {
	const { numberOfPizzas, doughBallWeight } = input;
	const totalDoughWeight = numberOfPizzas * doughBallWeight;

	// Get total percentage from recipe ingredients
	const totalPercentage = getTotalPercentage(recipe.ingredients);

	// Calculate flour weight needed
	const totalFlourWeight = calculateTotalFlour(numberOfPizzas, doughBallWeight, totalPercentage);

	// Scale each ingredient
	const scaledIngredients: ScaledIngredient[] = recipe.ingredients.map((ing) => ({
		id: ing.id,
		name: ing.name,
		nameDa: ing.nameDa,
		percentage: ing.percentage,
		weight: calculateIngredientWeight(totalFlourWeight, ing.percentage),
		type: ing.type,
		stage: ing.stage,
		notes: ing.notes
	}));

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
	return `${Math.round(grams)} g`;
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
