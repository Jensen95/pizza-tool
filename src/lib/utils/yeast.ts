import type { Recipe } from '$lib/types/recipe';
import type { YeastInfo } from '$lib/types/reference';
import { yeastInfo } from '$lib/data/reference';

const yeastByType = new Map<YeastInfo['type'], YeastInfo>(
	yeastInfo.map((info) => [info.type, info])
);

function getConversionFactor(type: YeastInfo['type']): number {
	return yeastByType.get(type)?.conversionFactor ?? 1;
}

export function convertYeastPercentage(
	percentage: number,
	from: YeastInfo['type'],
	to: YeastInfo['type']
): number {
	if (percentage <= 0 || from === to) return percentage;

	const fromFactor = getConversionFactor(from);
	const toFactor = getConversionFactor(to);

	// Convert relative to fresh yeast baseline
	const converted = percentage * (toFactor / fromFactor);
	return Math.round(converted * 1000) / 1000;
}

export function getRecipeYeastType(recipe: Recipe): YeastInfo['type'] {
	if (recipe.yeastType) return recipe.yeastType;

	const yeastIngredients = recipe.ingredients.filter((ing) => ing.type === 'yeast');
	for (const ing of yeastIngredients) {
		const name = ing.name.toLowerCase();
		const nameDa = ing.nameDa.toLowerCase();
		if (name.includes('instant') || nameDa.includes('instant')) return 'instant';
		if (name.includes('dry') || nameDa.includes('tørgær')) return 'active-dry';
	}

	return 'fresh';
}
