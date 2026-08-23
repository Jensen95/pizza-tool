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

export const FRIDGE_TEMPERATURE = 4;

/** The dough temperature after kneading that the app's own reference aims for. */
export const TARGET_DOUGH_TEMPERATURE = { min: 24, max: 27 };

export const MIN_ROOM_TEMPERATURE = 10;
export const MAX_ROOM_TEMPERATURE = 35;
export const MIN_DOUGH_TEMPERATURE = 10;
export const MAX_DOUGH_TEMPERATURE = 35;

/**
 * A 260 g pizza ball needs about an hour to make most of the trip to fridge
 * temperature. Bigger pieces cool as mass^(2/3), the surface-to-volume scaling
 * for a body whose inside has to conduct its heat out.
 */
const REFERENCE_PIECE_WEIGHT = 260;
const REFERENCE_TIME_CONSTANT = 1;

export interface ProofingSchedule {
	roomHours: number;
	fridgeHours: number;
	/** Hours out of the fridge before baking, warming up as it goes */
	temperHours?: number;
	/** Actual room temperature in °C. Defaults to the lookup table's 21 °C. */
	roomTemperature?: number;
	/** Final dough temperature after kneading. Defaults to the room temperature. */
	doughTemperature?: number;
	/** Weight of the whole dough, which sets how fast the bulk changes temperature */
	bulkWeight?: number;
	/** Weight of one shaped piece, which sets how fast it cools in the fridge */
	pieceWeight?: number;
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
	return Math.min(MAX_ROOM_TEMPERATURE, Math.max(FRIDGE_TEMPERATURE, temperature));
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
 * How long a piece of dough takes to change temperature, in hours. This is the
 * exponential time constant: after one of these it has closed about 63 % of the
 * gap to its surroundings, after three about 95 %.
 */
export function coolingTimeConstant(pieceWeight: number | undefined): number {
	const weight = Math.max(50, pieceWeight && pieceWeight > 0 ? pieceWeight : 800);
	return REFERENCE_TIME_CONSTANT * (weight / REFERENCE_PIECE_WEIGHT) ** (2 / 3);
}

/** Newton's law of cooling: where the dough has got to after a while. */
export function temperatureAfter(
	hours: number,
	from: number,
	towards: number,
	timeConstant: number
): number {
	if (hours <= 0 || timeConstant <= 0) return from;
	return towards + (from - towards) * Math.exp(-hours / timeConstant);
}

/** How long until the dough is within a degree of its surroundings. */
export function hoursToReachTemperature(
	from: number,
	towards: number,
	timeConstant: number
): number {
	const gap = Math.abs(from - towards);
	if (gap <= 1) return 0;
	return timeConstant * Math.log(gap);
}

/**
 * Fermentation over a stage where the dough drifts from one temperature towards
 * another, expressed as equivalent hours at the lookup table's 21 °C. Simpson's
 * rule over the cooling curve — the rate changes too fast at the start for an
 * average temperature to do the job.
 */
export function driftEquivalentHours(
	hours: number,
	from: number,
	towards: number,
	timeConstant: number
): number {
	const span = Math.max(0, hours);
	if (span === 0) return 0;
	if (Math.abs(from - towards) < 0.05) return span * fermentationRateFactor(towards);

	const steps = 120;
	const step = span / steps;
	let total = 0;
	for (let i = 0; i <= steps; i++) {
		const rate = fermentationRateFactor(temperatureAfter(i * step, from, towards, timeConstant));
		const weight = i === 0 || i === steps ? 1 : i % 2 === 1 ? 4 : 2;
		total += weight * rate;
	}
	return (step / 3) * total;
}

export interface CoolingReport {
	/** Where the dough is when it goes into the fridge */
	temperatureAtFridgeEntry: number;
	/** Hours before it is actually cold */
	hoursToCold: number;
	/**
	 * What cooling down costs in fermentation, as extra hours at room
	 * temperature, over and above a dough that went in already cold.
	 */
	extraWarmEquivalentHours: number;
}

/**
 * A dough does not become cold the moment the fridge door shuts. It keeps
 * fermenting on the way down, and a big warm mass keeps at it for hours.
 */
export function analyseFridgeCooling(schedule: ProofingSchedule): CoolingReport {
	const room = clampTemperature(schedule.roomTemperature ?? REFERENCE_ROOM_TEMPERATURE);
	const dough = clampTemperature(schedule.doughTemperature ?? room);
	const bulkTau = coolingTimeConstant(schedule.bulkWeight);
	const pieceTau = coolingTimeConstant(schedule.pieceWeight ?? schedule.bulkWeight);
	const fridgeHours = Math.max(0, schedule.fridgeHours);

	const entryTemperature = temperatureAfter(Math.max(0, schedule.roomHours), dough, room, bulkTau);

	if (fridgeHours <= 0) {
		return {
			temperatureAtFridgeEntry: entryTemperature,
			hoursToCold: 0,
			extraWarmEquivalentHours: 0
		};
	}

	// The lookup table's fridge entries were derived from real bakes, where the
	// dough always goes in at about room temperature and cools down in the fridge.
	// So that cooling is already priced in: only warmth *above* ambient — a dough
	// still hot from the mixer — costs extra.
	const actual = driftEquivalentHours(fridgeHours, entryTemperature, FRIDGE_TEMPERATURE, pieceTau);
	const alreadyPriced = driftEquivalentHours(fridgeHours, room, FRIDGE_TEMPERATURE, pieceTau);

	return {
		temperatureAtFridgeEntry: entryTemperature,
		hoursToCold: Math.min(
			fridgeHours,
			hoursToReachTemperature(entryTemperature, FRIDGE_TEMPERATURE, pieceTau)
		),
		extraWarmEquivalentHours: Math.max(0, actual - alreadyPriced)
	};
}

/**
 * Warm hours expressed in the lookup table's terms. Three things count: the
 * bulk (starting at the dough's own temperature and drifting towards the room),
 * the tempering window (starting cold and warming up), and the fermentation the
 * dough does while it is still cooling down in the fridge.
 */
export function effectiveRoomHours(schedule: ProofingSchedule): number {
	const room = clampTemperature(schedule.roomTemperature ?? REFERENCE_ROOM_TEMPERATURE);
	const dough = clampTemperature(schedule.doughTemperature ?? room);
	const bulkTau = coolingTimeConstant(schedule.bulkWeight);
	const pieceTau = coolingTimeConstant(schedule.pieceWeight ?? schedule.bulkWeight);

	const bulk = driftEquivalentHours(Math.max(0, schedule.roomHours), dough, room, bulkTau);
	const temper = driftEquivalentHours(
		Math.max(0, schedule.temperHours ?? 0),
		FRIDGE_TEMPERATURE,
		room,
		pieceTau
	);

	return bulk + temper + analyseFridgeCooling(schedule).extraWarmEquivalentHours;
}

/**
 * The longest the dough can stay warm before the yeast has used up its whole
 * budget — in other words, when it has to go into the fridge. Bisection on the
 * same drift integral the prediction uses.
 */
export function maxWarmHours(schedule: ProofingSchedule, idyPercentage: number): number {
	if (idyPercentage <= 0) return 0;
	const budget = hoursForIdy('room', idyPercentage);
	const room = clampTemperature(schedule.roomTemperature ?? REFERENCE_ROOM_TEMPERATURE);
	const dough = clampTemperature(schedule.doughTemperature ?? room);
	const bulkTau = coolingTimeConstant(schedule.bulkWeight);

	let low = 0;
	let high = 240;
	for (let i = 0; i < 60; i++) {
		const mid = (low + high) / 2;
		if (driftEquivalentHours(mid, dough, room, bulkTau) < budget) {
			low = mid;
		} else {
			high = mid;
		}
	}
	return (low + high) / 2;
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
