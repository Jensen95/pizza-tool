// ABOUTME: Dough planner — predict yeast for a room/fridge proofing schedule and compute weights
import type { YeastInfo, YeastLookupEntry } from '$lib/models';
import { yeastLookup } from '$lib/data/reference';
import { convertYeastPercentage } from './yeast';

export type ProofLocation = YeastLookupEntry['location'];

export interface ProofingSchedule {
	roomHours: number;
	fridgeHours: number;
}

export type DoughPlanWarning = 'no-proof-time' | 'outside-table' | 'tiny-yeast-amount';

export interface YeastPrediction {
	/** Instant dry yeast as baker's percentage of flour */
	idyPercentage: number;
	/** True when the schedule falls outside the lookup table and the value is extrapolated */
	extrapolated: boolean;
}

export interface DoughPlanInput {
	flourWeight: number;
	hydrationPercentage: number;
	saltPercentage: number;
	oilPercentage: number;
	sugarPercentage: number;
	yeastType: YeastInfo['type'];
	roomHours: number;
	fridgeHours: number;
}

export interface PlannedIngredient {
	id: string;
	nameDa: string;
	percentage: number;
	weight: number;
}

export interface DoughPlan {
	idyPercentage: number;
	yeastPercentage: number;
	yeastWeight: number;
	ingredients: PlannedIngredient[];
	totalWeight: number;
	warnings: DoughPlanWarning[];
}

interface TablePoint {
	hours: number;
	idy: number;
}

// The lookup table maps proofing hours to IDY percentage per location.
// Both axes behave log-linearly (halving yeast roughly doubles time), so all
// interpolation and extrapolation happens in log-log space.
function tableFor(location: ProofLocation): TablePoint[] {
	return yeastLookup.lookupTable
		.filter((entry) => entry.location === location)
		.map((entry) => ({ hours: entry.hours, idy: entry.idyPercentage }))
		.sort((a, b) => a.hours - b.hours);
}

function interpolate(
	points: TablePoint[],
	x: number,
	getX: (p: TablePoint) => number,
	getY: (p: TablePoint) => number
): number {
	const sorted = [...points].sort((a, b) => getX(a) - getX(b));
	const logX = Math.log(x);

	let lower = sorted[0];
	let upper = sorted[sorted.length - 1];

	for (let i = 0; i < sorted.length - 1; i++) {
		if (x >= getX(sorted[i]) && x <= getX(sorted[i + 1])) {
			lower = sorted[i];
			upper = sorted[i + 1];
			break;
		}
	}

	// Outside the table: extend the nearest segment's slope
	if (x < getX(sorted[0])) {
		lower = sorted[0];
		upper = sorted[1];
	} else if (x > getX(sorted[sorted.length - 1])) {
		lower = sorted[sorted.length - 2];
		upper = sorted[sorted.length - 1];
	}

	const x1 = Math.log(getX(lower));
	const x2 = Math.log(getX(upper));
	const y1 = Math.log(getY(lower));
	const y2 = Math.log(getY(upper));
	const t = (logX - x1) / (x2 - x1);
	return Math.exp(y1 + t * (y2 - y1));
}

function idyForHours(location: ProofLocation, hours: number): number {
	return interpolate(
		tableFor(location),
		hours,
		(p) => p.hours,
		(p) => p.idy
	);
}

function hoursForIdy(location: ProofLocation, idy: number): number {
	return interpolate(
		tableFor(location),
		idy,
		(p) => p.idy,
		(p) => p.hours
	);
}

function isWithinTable(location: ProofLocation, hours: number): boolean {
	const points = tableFor(location);
	return hours >= points[0].hours && hours <= points[points.length - 1].hours;
}

const MIN_IDY = 0.005;
const MAX_IDY = 2;

/**
 * Predict the instant-dry-yeast percentage for a proofing schedule.
 *
 * For a combined schedule the dough spends a fraction of its total "proofing
 * budget" in each location: with yeast level y it needs R(y) hours at room
 * temperature or F(y) hours in the fridge, so we solve
 * roomHours / R(y) + fridgeHours / F(y) = 1 for y (bisection in log space).
 */
export function predictYeast(schedule: ProofingSchedule): YeastPrediction | null {
	const roomHours = Math.max(0, schedule.roomHours);
	const fridgeHours = Math.max(0, schedule.fridgeHours);

	if (roomHours <= 0 && fridgeHours <= 0) return null;

	let idy: number;
	let extrapolated: boolean;

	if (fridgeHours <= 0) {
		idy = idyForHours('room', roomHours);
		extrapolated = !isWithinTable('room', roomHours);
	} else if (roomHours <= 0) {
		idy = idyForHours('fridge', fridgeHours);
		extrapolated = !isWithinTable('fridge', fridgeHours);
	} else {
		const budgetUsed = (y: number) =>
			roomHours / hoursForIdy('room', y) + fridgeHours / hoursForIdy('fridge', y);

		let low = Math.log(MIN_IDY);
		let high = Math.log(MAX_IDY);
		for (let i = 0; i < 60; i++) {
			const mid = (low + high) / 2;
			if (budgetUsed(Math.exp(mid)) < 1) {
				low = mid;
			} else {
				high = mid;
			}
		}
		idy = Math.exp((low + high) / 2);
		// Mixed schedules count as extrapolated when the solved yeast level falls
		// outside the range the table covers for either location.
		const roomTable = tableFor('room');
		const fridgeTable = tableFor('fridge');
		const minTableIdy = Math.min(
			roomTable[roomTable.length - 1].idy,
			fridgeTable[fridgeTable.length - 1].idy
		);
		const maxTableIdy = Math.max(roomTable[0].idy, fridgeTable[0].idy);
		extrapolated = idy < minTableIdy || idy > maxTableIdy;
	}

	const clamped = Math.min(MAX_IDY, Math.max(MIN_IDY, idy));
	return {
		idyPercentage: Math.round(clamped * 1000) / 1000,
		extrapolated: extrapolated || clamped !== idy
	};
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

function roundWeight(weight: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(weight * factor) / factor;
}

/**
 * Build a complete dough plan: predicted yeast plus ingredient weights.
 */
export function planDough(input: DoughPlanInput): DoughPlan | null {
	const prediction = predictYeast({ roomHours: input.roomHours, fridgeHours: input.fridgeHours });
	if (!prediction || input.flourWeight <= 0) return null;

	const warnings: DoughPlanWarning[] = [];
	if (prediction.extrapolated) warnings.push('outside-table');

	const yeastPercentage = convertYeastPercentage(
		prediction.idyPercentage,
		'instant',
		input.yeastType
	);
	const yeastWeight = roundWeight((input.flourWeight * yeastPercentage) / 100, 2);
	if (yeastWeight < 0.1) warnings.push('tiny-yeast-amount');

	const ingredients: PlannedIngredient[] = [
		{
			id: 'flour',
			nameDa: 'Mel',
			percentage: 100,
			weight: roundWeight(input.flourWeight, 1)
		},
		{
			id: 'water',
			nameDa: 'Vand',
			percentage: input.hydrationPercentage,
			weight: roundWeight((input.flourWeight * input.hydrationPercentage) / 100, 1)
		},
		{
			id: 'salt',
			nameDa: 'Salt',
			percentage: input.saltPercentage,
			weight: roundWeight((input.flourWeight * input.saltPercentage) / 100, 1)
		}
	];

	if (input.oilPercentage > 0) {
		ingredients.push({
			id: 'oil',
			nameDa: 'Olie',
			percentage: input.oilPercentage,
			weight: roundWeight((input.flourWeight * input.oilPercentage) / 100, 1)
		});
	}

	if (input.sugarPercentage > 0) {
		ingredients.push({
			id: 'sugar',
			nameDa: 'Sukker',
			percentage: input.sugarPercentage,
			weight: roundWeight((input.flourWeight * input.sugarPercentage) / 100, 1)
		});
	}

	ingredients.push({
		id: 'yeast',
		nameDa: 'Gær',
		percentage: yeastPercentage,
		weight: yeastWeight
	});

	const totalWeight = roundWeight(
		ingredients.reduce((sum, ingredient) => sum + ingredient.weight, 0),
		1
	);

	return {
		idyPercentage: prediction.idyPercentage,
		yeastPercentage,
		yeastWeight,
		ingredients,
		totalWeight,
		warnings
	};
}
