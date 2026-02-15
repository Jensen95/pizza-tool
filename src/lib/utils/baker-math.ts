import type {
	BakerMathIngredient,
	BakerMathIngredientWithWeight,
	BakerMathSummary
} from '$lib/types';

const roundToTwoDecimals = (value: number): number => Math.round(value * 100) / 100;
const nonNegative = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

export function calculateIngredientWeight(flourWeight: number, percentage: number): number {
	const safeFlour = nonNegative(flourWeight);
	const safePercentage = nonNegative(percentage);
	const weight = (safeFlour * safePercentage) / 100;
	return roundToTwoDecimals(weight);
}

export function attachIngredientWeights(
	flourWeight: number,
	ingredients: BakerMathIngredient[]
): BakerMathIngredientWithWeight[] {
	const safeFlour = nonNegative(flourWeight);
	return ingredients.map((ingredient) => ({
		...ingredient,
		weight: calculateIngredientWeight(safeFlour, ingredient.percentage)
	}));
}

export function calculateHydrationPercentage(ingredients: BakerMathIngredient[]): number {
	const totalWaterPercentage = ingredients
		.filter((ingredient) => ingredient.type === 'water')
		.reduce((sum, ingredient) => sum + nonNegative(ingredient.percentage), 0);

	return roundToTwoDecimals(totalWaterPercentage);
}

export function calculateWaterWeight(
	flourWeight: number,
	ingredients: BakerMathIngredient[]
): number {
	const hydration = calculateHydrationPercentage(ingredients);
	return calculateIngredientWeight(flourWeight, hydration);
}

export function calculateDoughTotalWeight(
	flourWeight: number,
	ingredients: BakerMathIngredient[]
): number {
	const flour = nonNegative(flourWeight);
	const ingredientWeight = attachIngredientWeights(flour, ingredients).reduce(
		(sum, ingredient) => sum + ingredient.weight,
		0
	);

	return roundToTwoDecimals(flour + ingredientWeight);
}

export function summarizeBakerMath(
	flourWeight: number,
	ingredients: BakerMathIngredient[]
): BakerMathSummary {
	const safeFlourWeight = nonNegative(flourWeight);
	const ingredientsWithWeight = attachIngredientWeights(safeFlourWeight, ingredients);
	const hydration = calculateHydrationPercentage(ingredients);
	const waterWeight = ingredientsWithWeight
		.filter((ingredient) => ingredient.type === 'water')
		.reduce((sum, ingredient) => sum + ingredient.weight, 0);

	const totalDoughWeight = roundToTwoDecimals(
		safeFlourWeight + ingredientsWithWeight.reduce((sum, ingredient) => sum + ingredient.weight, 0)
	);

	return {
		flourWeight: safeFlourWeight,
		totalDoughWeight,
		hydration,
		waterWeight: roundToTwoDecimals(waterWeight),
		ingredients: ingredientsWithWeight
	};
}

export function calculateTargetWater(
	flourWeight: number,
	targetHydration: number
): {
	waterWeight: number;
	waterPercentage: number;
} {
	const safeFlour = nonNegative(flourWeight);
	const safeHydration = nonNegative(targetHydration);
	const waterWeight = calculateIngredientWeight(safeFlour, safeHydration);

	return {
		waterWeight,
		waterPercentage: roundToTwoDecimals(safeHydration)
	};
}
