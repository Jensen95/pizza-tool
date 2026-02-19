// ABOUTME: Resolves display names for flour ingredients from category or product lookup
import type { FlourCategory, FlourType } from '$lib/models/reference.types';
import { flourTypes } from '$lib/data/reference/flour-types';
import flourProducts from '$lib/data/reference/flour-types.json';

/**
 * Resolve a display name for a flour ingredient.
 * Priority: flourId product lookup → category label fallback → generic "Flour"/"Mel"
 */
export function resolveFlourDisplayName(
	flourType: FlourCategory,
	flourId?: string,
	products: FlourType[] = flourProducts as FlourType[]
): { name: string; nameDa: string } {
	if (flourId) {
		const product = products.find((p) => p.id === flourId);
		if (product) {
			return { name: product.name, nameDa: product.nameDa };
		}
	}

	const category = flourTypes.find((f) => f.id === flourType);
	if (category) {
		return { name: category.name, nameDa: category.nameDa };
	}

	return { name: 'Flour', nameDa: 'Mel' };
}
