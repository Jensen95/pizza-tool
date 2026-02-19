// ABOUTME: Yeast type detection and conversion between fresh, active-dry, and instant
import type { Recipe } from '$lib/models/recipe.types';
import type { YeastInfo } from '$lib/models/reference.types';
import { yeastInfo } from '$lib/data/reference';
import { getAllIngredients } from './baker-percentage';

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
	const allIngredients = getAllIngredients(recipe);
	const yeastIngredients = allIngredients.filter((ing) => ing.type === 'yeast');

	// Use explicit yeastType from ingredient (discriminated union)
	for (const ing of yeastIngredients) {
		if (ing.type === 'yeast') return ing.yeastType;
	}

	return 'fresh';
}
