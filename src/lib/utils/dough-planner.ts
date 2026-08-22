// ABOUTME: Dough planner — predict yeast for a proofing schedule and compute all ingredient weights
import type { YeastInfo } from '$lib/models';
import { convertYeastPercentage } from './yeast';
import { predictYeast } from './fermentation';
import { planPredough, type PredoughConfig, type PredoughPlan } from './predough';
import type { ProofingStyleId } from './proofing-styles';
import {
	additionSum,
	buildAdditionIngredients,
	buildFlourIngredients,
	buildWaterAllocationIngredients,
	flourBlendSum,
	roundWeight,
	sumWeights,
	waterAllocationSum,
	type DoughIngredientRow,
	type PlannedIngredient
} from './dough-ingredients';

export {
	predictYeast,
	effectiveRoomHours,
	fermentationRateFactor,
	REFERENCE_ROOM_TEMPERATURE,
	TEMPER_WARM_FRACTION
} from './fermentation';
export type { ProofingSchedule, YeastPrediction, ProofLocation } from './fermentation';
export type { DoughIngredientRow, PlannedIngredient } from './dough-ingredients';

export type LeaveningType = 'yeast' | 'sourdough';

export type DoughPlanWarning =
	| 'no-proof-time'
	| 'outside-table'
	| 'tiny-yeast-amount'
	| 'water-over-allocated'
	| 'flour-blend-off'
	| 'predough-covers-yeast'
	| 'predough-too-wet';

export interface DoughPlanInput {
	/** Total flour in the dough, predough included */
	flourWeight: number;
	hydrationPercentage: number;
	saltPercentage: number;
	oilPercentage: number;
	sugarPercentage: number;
	yeastType: YeastInfo['type'];
	roomHours: number;
	fridgeHours: number;
	/** Hours out of the fridge before baking; half of it counts as warm time */
	temperHours?: number;
	/** Actual room temperature in °C */
	roomTemperature?: number;
	/** Flour blend; percentages of total flour, summing to 100 */
	flours?: DoughIngredientRow[];
	/** Free-form rows: `water` rows allocate part of the hydration, the rest add weight */
	extras?: DoughIngredientRow[];
	predough?: PredoughConfig | null;
}

export type SizingMode = 'flour' | 'dough' | 'balls';

export interface DoughSizing {
	mode: SizingMode;
	flourWeight: number;
	doughWeight: number;
	ballCount: number;
	ballWeight: number;
}

/**
 * Full planner state as recorded in saved plans. The sourdough fields are
 * only meaningful when leavening is 'sourdough'; plans saved before the
 * sourdough mode existed have no leavening field and default to yeast.
 */
export interface DoughPlannerState extends DoughPlanInput {
	leavening?: LeaveningType;
	starterPercentage?: number;
	starterHydrationPercentage?: number;
	sizing?: DoughSizing;
	/** Which proofing style produced the hours, so a reload can show it again */
	styleId?: ProofingStyleId;
	/**
	 * Autolyse before salt and leaven go in. Recorded on the plan but not part of
	 * DoughPlanInput: it changes no weights and no yeast, only the schedule.
	 */
	autolyseHours?: number;
}

export interface PlanStage {
	id: 'predough' | 'main';
	nameDa: string;
	ingredients: PlannedIngredient[];
	totalWeight: number;
}

export interface DoughPlan {
	flourWeight: number;
	hydrationPercentage: number;
	/** Instant dry yeast for the whole dough, as a percentage of total flour */
	idyPercentage: number;
	/** The same total in the chosen yeast type */
	yeastPercentage: number;
	yeastWeight: number;
	/** Yeast that goes into the final dough */
	mainYeastWeight: number;
	/** Yeast that goes into the predough (0 without one) */
	predoughYeastWeight: number;
	stages: PlanStage[];
	ingredients: PlannedIngredient[];
	totalWeight: number;
	predough: PredoughPlan | null;
	warnings: DoughPlanWarning[];
}

/**
 * Derive the flour weight from a target total dough weight, given the sum of
 * all non-flour baker's percentages.
 */
export function flourFromDoughWeight(
	totalDoughWeight: number,
	nonFlourPercentageSum: number
): number {
	if (totalDoughWeight <= 0) return 0;
	return totalDoughWeight / (1 + nonFlourPercentageSum / 100);
}

/** Total dough weight a sizing asks for. Zero in flour-weight mode. */
export function targetDoughWeight(sizing: DoughSizing): number {
	if (sizing.mode === 'balls') {
		return Math.max(0, sizing.ballCount) * Math.max(0, sizing.ballWeight);
	}
	if (sizing.mode === 'dough') return Math.max(0, sizing.doughWeight);
	return 0;
}

/**
 * Everything that is not flour, as a percentage of flour: water, salt, the
 * legacy oil and sugar fields, any added rows and the yeast itself.
 */
export function nonFlourPercentageSum(
	input: Pick<
		DoughPlanInput,
		'hydrationPercentage' | 'saltPercentage' | 'oilPercentage' | 'sugarPercentage' | 'extras'
	>,
	yeastPercentage = 0
): number {
	return (
		input.hydrationPercentage +
		input.saltPercentage +
		input.oilPercentage +
		input.sugarPercentage +
		additionSum(input.extras) +
		yeastPercentage
	);
}

/**
 * Resolve the flour weight a sizing implies. Balls and total dough weight both
 * work backwards through the baker's percentages; bread is still planned by
 * flour weight, which passes straight through.
 */
export function resolveFlourWeight(sizing: DoughSizing, nonFlourSum: number): number {
	if (sizing.mode === 'flour') return Math.max(0, sizing.flourWeight);
	return flourFromDoughWeight(targetDoughWeight(sizing), nonFlourSum);
}

/**
 * Build a complete dough plan: predicted yeast plus every ingredient weight,
 * grouped into a predough stage and the final dough.
 */
export function planDough(input: DoughPlanInput): DoughPlan | null {
	const prediction = predictYeast({
		roomHours: input.roomHours,
		fridgeHours: input.fridgeHours,
		temperHours: input.temperHours,
		roomTemperature: input.roomTemperature
	});
	if (!prediction || input.flourWeight <= 0) return null;

	const warnings: DoughPlanWarning[] = [];
	if (prediction.extrapolated) warnings.push('outside-table');

	const totalFlour = input.flourWeight;
	const predough = input.predough
		? planPredough(
				{
					...input.predough,
					roomTemperature: input.predough.roomTemperature ?? input.roomTemperature
				},
				totalFlour
			)
		: null;
	if (predough?.extrapolated && !warnings.includes('outside-table')) {
		warnings.push('outside-table');
	}

	// The predough already carries yeast, so it comes out of the same budget:
	// what the final dough needs is whatever the predough does not cover.
	const predoughIdy = predough?.idyPercentageOfTotalFlour ?? 0;
	const mainIdy = Math.max(0, prediction.idyPercentage - predoughIdy);
	if (predough && mainIdy <= 0) warnings.push('predough-covers-yeast');
	const totalIdy = mainIdy + predoughIdy;

	const toChosenType = (idy: number) => convertYeastPercentage(idy, 'instant', input.yeastType);
	const yeastPercentage = toChosenType(totalIdy);
	const mainYeastPercentage = toChosenType(mainIdy);
	const predoughYeastPercentage = toChosenType(predoughIdy);

	const yeastWeight = roundWeight((totalFlour * yeastPercentage) / 100, 2);
	const mainYeastWeight = roundWeight((totalFlour * mainYeastPercentage) / 100, 2);
	const predoughYeastWeight = roundWeight((totalFlour * predoughYeastPercentage) / 100, 2);
	if (yeastWeight < 0.1) warnings.push('tiny-yeast-amount');

	// Water is a single total; the predough and any named allocations take their
	// share out of it and the final dough gets the remainder.
	const predoughWaterPercentage = predough?.waterPercentageOfTotalFlour ?? 0;
	const allocatedWaterPercentage = waterAllocationSum(input.extras);
	const mainWaterPercentage =
		input.hydrationPercentage - predoughWaterPercentage - allocatedWaterPercentage;
	if (predoughWaterPercentage > input.hydrationPercentage) warnings.push('predough-too-wet');
	if (mainWaterPercentage < -0.05) warnings.push('water-over-allocated');

	const blendSum = flourBlendSum(input.flours);
	if (blendSum > 0 && Math.abs(blendSum - 100) > 0.5) warnings.push('flour-blend-off');

	const asPercentageOfFlour = (weight: number) => roundWeight((weight / totalFlour) * 100, 1);
	const rebase = (ingredients: PlannedIngredient[]): PlannedIngredient[] =>
		ingredients.map((ingredient) => ({
			...ingredient,
			percentage: asPercentageOfFlour(ingredient.weight)
		}));

	const stages: PlanStage[] = [];

	if (predough) {
		const predoughIngredients: PlannedIngredient[] = [
			...rebase(buildFlourIngredients(predough.flourWeight, input.flours, '(fordej)')),
			{
				id: 'predough-water',
				nameDa: 'Vand (fordej)',
				percentage: roundWeight(predoughWaterPercentage, 1),
				weight: roundWeight(predough.waterWeight, 1)
			},
			{
				id: 'predough-yeast',
				nameDa: 'Gær (fordej)',
				percentage: predoughYeastPercentage,
				weight: predoughYeastWeight
			}
		];

		stages.push({
			id: 'predough',
			nameDa: predough.nameDa,
			ingredients: predoughIngredients,
			totalWeight: sumWeights(predoughIngredients)
		});
	}

	const mainFlourWeight = totalFlour - (predough?.flourWeight ?? 0);
	const mainIngredients: PlannedIngredient[] = rebase(
		buildFlourIngredients(mainFlourWeight, input.flours, predough ? '(hoveddej)' : '')
	);

	mainIngredients.push({
		id: 'water',
		nameDa: predough ? 'Vand (hoveddej)' : 'Vand',
		percentage: roundWeight(Math.max(0, mainWaterPercentage), 1),
		weight: roundWeight((totalFlour * Math.max(0, mainWaterPercentage)) / 100, 1)
	});

	mainIngredients.push(...buildWaterAllocationIngredients(totalFlour, input.extras));

	mainIngredients.push({
		id: 'salt',
		nameDa: 'Salt',
		percentage: input.saltPercentage,
		weight: roundWeight((totalFlour * input.saltPercentage) / 100, 1)
	});

	if (input.oilPercentage > 0) {
		mainIngredients.push({
			id: 'oil',
			nameDa: 'Olie',
			percentage: input.oilPercentage,
			weight: roundWeight((totalFlour * input.oilPercentage) / 100, 1)
		});
	}

	if (input.sugarPercentage > 0) {
		mainIngredients.push({
			id: 'sugar',
			nameDa: 'Sukker',
			percentage: input.sugarPercentage,
			weight: roundWeight((totalFlour * input.sugarPercentage) / 100, 1)
		});
	}

	mainIngredients.push(...buildAdditionIngredients(totalFlour, input.extras));

	if (!predough || mainYeastWeight > 0) {
		mainIngredients.push({
			id: 'yeast',
			nameDa: predough ? 'Gær (hoveddej)' : 'Gær',
			percentage: mainYeastPercentage,
			weight: mainYeastWeight
		});
	}

	stages.push({
		id: 'main',
		nameDa: predough ? 'Hoveddej' : 'Dejen',
		ingredients: mainIngredients,
		totalWeight: sumWeights(mainIngredients)
	});

	const ingredients = stages.flatMap((stage) => stage.ingredients);

	return {
		flourWeight: roundWeight(totalFlour, 1),
		hydrationPercentage: input.hydrationPercentage,
		idyPercentage: roundWeight(totalIdy, 3),
		yeastPercentage,
		yeastWeight,
		mainYeastWeight,
		predoughYeastWeight,
		stages,
		ingredients,
		totalWeight: sumWeights(ingredients),
		predough,
		warnings
	};
}
