// ABOUTME: Predough (poolish / biga) math — flour share, its own water and its own yeast
import { predictYeast } from './fermentation';

export type PredoughKind = 'poolish' | 'biga';

export interface PredoughConfig {
	kind: PredoughKind;
	/** Share of the total flour that goes into the predough */
	flourPercentage: number;
	/** Water as a percentage of the predough's own flour */
	hydrationPercentage: number;
	roomHours: number;
	fridgeHours: number;
	roomTemperature?: number;
}

export interface PredoughDefaults {
	nameDa: string;
	descriptionDa: string;
	flourPercentage: number;
	hydrationPercentage: number;
	roomHours: number;
	fridgeHours: number;
}

/**
 * Starting points taken from the recipe library: a poolish is a wet 20 %
 * preferment left overnight, a biga is a stiff one built on most of the flour.
 */
export const predoughDefaults: Record<PredoughKind, PredoughDefaults> = {
	poolish: {
		nameDa: 'Poolish',
		descriptionDa: 'Våd fordej på 100 % hydration — smag og strækbarhed',
		flourPercentage: 20,
		hydrationPercentage: 100,
		roomHours: 1,
		fridgeHours: 20
	},
	biga: {
		nameDa: 'Biga',
		descriptionDa: 'Stiv fordej på 45 % hydration — struktur og store bobler',
		flourPercentage: 100,
		hydrationPercentage: 45,
		roomHours: 18,
		fridgeHours: 0
	}
};

export interface PredoughPlan {
	kind: PredoughKind;
	nameDa: string;
	flourWeight: number;
	waterWeight: number;
	/** Instant dry yeast as a percentage of the predough's own flour */
	idyPercentage: number;
	/** The same yeast expressed against the total flour of the dough */
	idyPercentageOfTotalFlour: number;
	/** Water the predough contributes, as a percentage of total flour */
	waterPercentageOfTotalFlour: number;
	totalHours: number;
	extrapolated: boolean;
}

function roundWeight(weight: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(weight * factor) / factor;
}

export function createPredoughConfig(kind: PredoughKind): PredoughConfig {
	const defaults = predoughDefaults[kind];
	return {
		kind,
		flourPercentage: defaults.flourPercentage,
		hydrationPercentage: defaults.hydrationPercentage,
		roomHours: defaults.roomHours,
		fridgeHours: defaults.fridgeHours
	};
}

/**
 * Work out the predough's own flour, water and yeast.
 *
 * The predough ferments on its own schedule, so its yeast comes from the same
 * prediction used for the main dough — just applied to the predough's hours and
 * its own share of the flour.
 */
export function planPredough(
	config: PredoughConfig,
	totalFlourWeight: number
): PredoughPlan | null {
	const share = Math.min(100, Math.max(0, config.flourPercentage));
	if (totalFlourWeight <= 0 || share <= 0) return null;

	const prediction = predictYeast({
		roomHours: config.roomHours,
		fridgeHours: config.fridgeHours,
		roomTemperature: config.roomTemperature
	});
	if (!prediction) return null;

	const flourWeight = (totalFlourWeight * share) / 100;
	const hydration = Math.max(0, config.hydrationPercentage);
	const waterWeight = (flourWeight * hydration) / 100;

	return {
		kind: config.kind,
		nameDa: predoughDefaults[config.kind].nameDa,
		flourWeight: roundWeight(flourWeight, 1),
		waterWeight: roundWeight(waterWeight, 1),
		idyPercentage: prediction.idyPercentage,
		idyPercentageOfTotalFlour: (prediction.idyPercentage * share) / 100,
		waterPercentageOfTotalFlour: (hydration * share) / 100,
		totalHours: Math.max(0, config.roomHours) + Math.max(0, config.fridgeHours),
		extrapolated: prediction.extrapolated
	};
}

/**
 * Spread a predough window over room temperature and the fridge. A biga sits
 * out for the whole window; a poolish gets a short warm start and then chills,
 * which is how the recipes in the library run it.
 */
export function fitPredoughWindow(
	kind: PredoughKind,
	hours: number
): { roomHours: number; fridgeHours: number } {
	const total = Math.max(0, hours);
	if (kind === 'biga') return { roomHours: total, fridgeHours: 0 };
	const roomHours = Math.min(1, total);
	return { roomHours, fridgeHours: Math.max(0, total - roomHours) };
}
