// ABOUTME: Fermentation model — temperature-corrected yeast prediction from a proofing schedule
import type { YeastLookupEntry } from '$lib/models';
import { yeastLookup } from '$lib/data/reference';

export type ProofLocation = YeastLookupEntry['location'];

/** Room temperature the lookup table was measured at (°C). */
export const REFERENCE_ROOM_TEMPERATURE = 21;

/**
 * Degrees Celsius that double the fermentation rate. A Q10-style
 * approximation: yeast activity roughly doubles per 8 °C in the range a
 * kitchen operates in.
 */
export const TEMPERATURE_DOUBLING_STEP = 8;

/**
 * Share of the tempering time (dough out of the fridge before baking) that
 * counts as warm fermentation. The dough starts cold and warms through, so
 * only part of that window ferments at room speed.
 */
export const TEMPER_WARM_FRACTION = 0.5;

export const MIN_ROOM_TEMPERATURE = 10;
export const MAX_ROOM_TEMPERATURE = 35;

export interface ProofingSchedule {
	roomHours: number;
	fridgeHours: number;
	/** Hours out of the fridge before baking; TEMPER_WARM_FRACTION of it counts as room time. */
	temperHours?: number;
	/** Actual room temperature in °C. Defaults to the lookup table's 21 °C. */
	roomTemperature?: number;
}

export interface YeastPrediction {
	/** Instant dry yeast as baker's percentage of flour */
	idyPercentage: number;
	/** True when the schedule falls outside the lookup table and the value is extrapolated */
	extrapolated: boolean;
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

function clampTemperature(temperature: number): number {
	if (!Number.isFinite(temperature)) return REFERENCE_ROOM_TEMPERATURE;
	return Math.min(MAX_ROOM_TEMPERATURE, Math.max(MIN_ROOM_TEMPERATURE, temperature));
}

/**
 * How much faster (or slower) dough ferments at a given temperature compared
 * to the temperature the lookup table assumes. 29 °C ferments about twice as
 * fast as 21 °C; 13 °C about half as fast.
 */
export function fermentationRateFactor(temperature: number): number {
	const safe = clampTemperature(temperature);
	return 2 ** ((safe - REFERENCE_ROOM_TEMPERATURE) / TEMPERATURE_DOUBLING_STEP);
}

/**
 * Warm hours expressed in the lookup table's terms: actual room hours plus the
 * warm share of the tempering window, scaled by the temperature of the room.
 */
export function effectiveRoomHours(schedule: ProofingSchedule): number {
	const room = Math.max(0, schedule.roomHours);
	const temper = Math.max(0, schedule.temperHours ?? 0);
	const warmHours = room + temper * TEMPER_WARM_FRACTION;
	const factor = fermentationRateFactor(schedule.roomTemperature ?? REFERENCE_ROOM_TEMPERATURE);
	return warmHours * factor;
}

/**
 * Predict the instant-dry-yeast percentage for a proofing schedule.
 *
 * For a combined schedule the dough spends a fraction of its total "proofing
 * budget" in each location: with yeast level y it needs R(y) hours at room
 * temperature or F(y) hours in the fridge, so we solve
 * roomHours / R(y) + fridgeHours / F(y) = 1 for y (bisection in log space).
 *
 * Warm time is temperature-corrected first, so a hot kitchen or a long temper
 * both reduce the yeast the schedule needs.
 */
export function predictYeast(schedule: ProofingSchedule): YeastPrediction | null {
	const roomHours = effectiveRoomHours(schedule);
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
