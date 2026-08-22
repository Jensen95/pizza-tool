// ABOUTME: Sourdough calculation — starter math and fermentation estimates (beregner.org formula)
import {
	additionSum,
	buildAdditionIngredients,
	buildFlourIngredients,
	buildWaterAllocationIngredients,
	waterAllocationSum,
	type DoughIngredientRow,
	type PlannedIngredient
} from './dough-ingredients';

export interface SourdoughPlanInput {
	flourWeight: number;
	hydrationPercentage: number;
	saltPercentage: number;
	oilPercentage: number;
	sugarPercentage: number;
	starterPercentage: number;
	starterHydrationPercentage: number;
	/** Flour blend; percentages of total flour, summing to 100 */
	flours?: DoughIngredientRow[];
	/** Free-form rows: `water` rows allocate part of the hydration, the rest add weight */
	extras?: DoughIngredientRow[];
}

export interface HourRange {
	min: number;
	max: number;
}

export interface SourdoughSchedule {
	bulkFermentation: HourRange;
	finalProofRoom: HourRange;
	finalProofFridge: HourRange;
}

export type SourdoughPlanWarning = 'starter-exceeds-water' | 'water-over-allocated';

export interface SourdoughPlan {
	ingredients: PlannedIngredient[];
	totalWeight: number;
	starterWeight: number;
	flourInStarter: number;
	waterInStarter: number;
	schedule: SourdoughSchedule;
	warnings: SourdoughPlanWarning[];
}

// Formula from https://beregner.org/surdej-beregner/ :
// starterFlourFactor = starter% × 1/(1 + starterHydration)
// totalFlour = doughWeight / (1 + starterFlourFactor + hydration + salt%)
// All baker's percentages (hydration, starter, salt) are relative to totalFlour;
// the starter is added on top and its water counts toward the hydration water.
// Oil and sugar extend the divisor the same way and drop out at 0%.
function nonFlourFactorSum(input: Omit<SourdoughPlanInput, 'flourWeight'>): number {
	const starterFlourFactor =
		(input.starterPercentage / 100) * (1 / (1 + input.starterHydrationPercentage / 100));
	return (
		starterFlourFactor +
		(input.hydrationPercentage +
			input.saltPercentage +
			input.oilPercentage +
			input.sugarPercentage +
			additionSum(input.extras)) /
			100
	);
}

/**
 * Derive the flour weight from a target total dough weight using the
 * beregner.org divisor: totalFlour = doughWeight / (1 + starterFlourFactor + …).
 */
export function sourdoughFlourFromDoughWeight(
	totalDoughWeight: number,
	input: Omit<SourdoughPlanInput, 'flourWeight'>
): number {
	if (totalDoughWeight <= 0) return 0;
	return totalDoughWeight / (1 + nonFlourFactorSum(input));
}

/**
 * Estimate fermentation times from hydration and starter percentage.
 * Thresholds from beregner.org: wetter dough and more starter ferment faster.
 */
export function estimateSourdoughSchedule(
	hydrationPercentage: number,
	starterPercentage: number
): SourdoughSchedule {
	const highStarter = starterPercentage >= 25;

	let bulkFermentation: HourRange;
	let finalProofRoom: HourRange;

	if (hydrationPercentage >= 80) {
		bulkFermentation = highStarter ? { min: 3, max: 4 } : { min: 4, max: 5 };
		finalProofRoom = { min: 2, max: 3 };
	} else if (hydrationPercentage >= 70) {
		bulkFermentation = highStarter ? { min: 4, max: 5 } : { min: 5, max: 6 };
		finalProofRoom = { min: 2, max: 4 };
	} else {
		bulkFermentation = highStarter ? { min: 5, max: 6 } : { min: 6, max: 8 };
		finalProofRoom = { min: 3, max: 4 };
	}

	return {
		bulkFermentation,
		finalProofRoom,
		finalProofFridge: { min: 8, max: 14 }
	};
}

function roundWeight(weight: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(weight * factor) / factor;
}

/**
 * Build a sourdough plan: ingredient weights plus an estimated schedule.
 *
 * Weights follow the beregner.org calculation: added flour equals totalFlour,
 * the starter comes on top of it, and the starter's water is subtracted from
 * the added water so total water stays at hydration% of totalFlour.
 */
export function planSourdough(input: SourdoughPlanInput): SourdoughPlan | null {
	if (input.flourWeight <= 0) return null;

	const flour = input.flourWeight;
	const starterHydration = input.starterHydrationPercentage / 100;
	const starterWeight = (flour * input.starterPercentage) / 100;
	const waterInStarter = starterWeight * (starterHydration / (1 + starterHydration));
	const flourInStarter = starterWeight - waterInStarter;

	const allocatedWater = (flour * waterAllocationSum(input.extras)) / 100;
	const totalWater = (flour * input.hydrationPercentage) / 100;
	const addedWater = totalWater - waterInStarter - allocatedWater;

	const warnings: SourdoughPlanWarning[] = [];
	if (totalWater - waterInStarter < 0) warnings.push('starter-exceeds-water');
	if (addedWater < -0.05 && !warnings.includes('starter-exceeds-water')) {
		warnings.push('water-over-allocated');
	}

	const ingredients: PlannedIngredient[] = [
		...buildFlourIngredients(flour, input.flours),
		{
			id: 'starter',
			nameDa: 'Surdej',
			percentage: input.starterPercentage,
			weight: roundWeight(starterWeight, 1)
		},
		{
			id: 'water',
			nameDa: 'Vand',
			percentage: roundWeight(Math.max(0, (addedWater / flour) * 100), 1),
			weight: roundWeight(Math.max(0, addedWater), 1)
		},
		...buildWaterAllocationIngredients(flour, input.extras),
		{
			id: 'salt',
			nameDa: 'Salt',
			percentage: input.saltPercentage,
			weight: roundWeight((flour * input.saltPercentage) / 100, 1)
		}
	];

	if (input.oilPercentage > 0) {
		ingredients.push({
			id: 'oil',
			nameDa: 'Olie',
			percentage: input.oilPercentage,
			weight: roundWeight((flour * input.oilPercentage) / 100, 1)
		});
	}

	if (input.sugarPercentage > 0) {
		ingredients.push({
			id: 'sugar',
			nameDa: 'Sukker',
			percentage: input.sugarPercentage,
			weight: roundWeight((flour * input.sugarPercentage) / 100, 1)
		});
	}

	ingredients.push(...buildAdditionIngredients(flour, input.extras));

	const totalWeight = roundWeight(
		ingredients.reduce((sum, ingredient) => sum + ingredient.weight, 0),
		1
	);

	return {
		ingredients,
		totalWeight,
		starterWeight: roundWeight(starterWeight, 1),
		flourInStarter: roundWeight(flourInStarter, 1),
		waterInStarter: roundWeight(waterInStarter, 1),
		schedule: estimateSourdoughSchedule(input.hydrationPercentage, input.starterPercentage),
		warnings
	};
}
