// ABOUTME: Proofing styles and deadline planning — split a window into phases and put them on the clock
export type ProofingStyleId =
	'same-day' | 'overnight-room' | 'cold-overnight' | 'cold-48' | 'predough-cold' | 'custom';

export interface ProofingSplit {
	/** Hours the predough ferments before the main dough is mixed (0 without a predough) */
	predoughHours: number;
	/** Bulk fermentation at room temperature */
	roomHours: number;
	fridgeHours: number;
	/** Out of the fridge before baking */
	temperHours: number;
}

export interface ProofingStyle {
	id: ProofingStyleId;
	nameDa: string;
	descriptionDa: string;
	usesFridge: boolean;
	usesPredough: boolean;
	/** Shortest window the style can fill honestly */
	minHours: number;
	/** Longest window the style is meant for; beyond this the leftover is reported */
	maxHours: number;
	split: (availableHours: number) => ProofingSplit;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function round(value: number, step = 0.25): number {
	return Math.round(value / step) * step;
}

/**
 * The five ways this dough actually gets made, plus a custom split.
 *
 * Every style fills the window it is given: the room-temperature ones never
 * touch the fridge, the cold ones keep a short bulk and a temper at each end
 * and give the fridge whatever is left.
 */
export const proofingStyles: ProofingStyle[] = [
	{
		id: 'same-day',
		nameDa: 'Samme dag',
		descriptionDa: 'Alt ved stuetemperatur, klar på 4-8 timer.',
		usesFridge: false,
		usesPredough: false,
		minHours: 2,
		maxHours: 10,
		split: (hours) => ({
			predoughHours: 0,
			roomHours: round(clamp(hours, 2, 10)),
			fridgeHours: 0,
			temperHours: 0
		})
	},
	{
		id: 'overnight-room',
		nameDa: 'Natten over, stuetemperatur',
		descriptionDa: 'Ingen køleskab — lang, kølig hævning på bordet. Sæt rumtemperaturen.',
		usesFridge: false,
		usesPredough: false,
		minHours: 8,
		maxHours: 30,
		split: (hours) => ({
			predoughHours: 0,
			roomHours: round(clamp(hours, 8, 30)),
			fridgeHours: 0,
			temperHours: 0
		})
	},
	{
		id: 'cold-overnight',
		nameDa: 'Kold, natten over',
		descriptionDa: 'Kort bulk, natten i køleskabet, temperering før bagning.',
		usesFridge: true,
		usesPredough: false,
		minHours: 10,
		maxHours: 36,
		split: (hours) => {
			const total = clamp(hours, 10, 36);
			const room = round(clamp(total * 0.12, 1, 4));
			const temper = round(clamp(total * 0.1, 1, 3));
			return {
				predoughHours: 0,
				roomHours: room,
				fridgeHours: round(Math.max(0, total - room - temper)),
				temperHours: temper
			};
		}
	},
	{
		id: 'cold-48',
		nameDa: 'Kold, 48 timer',
		descriptionDa: 'To døgn på køl for maksimal smag.',
		usesFridge: true,
		usesPredough: false,
		minHours: 30,
		maxHours: 80,
		split: (hours) => {
			const total = clamp(hours, 30, 80);
			const room = round(clamp(total * 0.06, 1, 3));
			const temper = round(clamp(total * 0.06, 1.5, 3));
			return {
				predoughHours: 0,
				roomHours: room,
				fridgeHours: round(Math.max(0, total - room - temper)),
				temperHours: temper
			};
		}
	},
	{
		id: 'predough-cold',
		nameDa: 'Fordej + kold hævning',
		descriptionDa: 'Poolish eller biga først, derefter kold hævning af hoveddejen.',
		usesFridge: true,
		usesPredough: true,
		minHours: 18,
		maxHours: 72,
		split: (hours) => {
			const total = clamp(hours, 18, 72);
			const predough = round(clamp(total * 0.45, 8, 24));
			const rest = total - predough;
			const room = round(clamp(rest * 0.12, 1, 3));
			const temper = round(clamp(rest * 0.1, 1, 3));
			return {
				predoughHours: predough,
				roomHours: room,
				fridgeHours: round(Math.max(0, rest - room - temper)),
				temperHours: temper
			};
		}
	}
];

export function findProofingStyle(id: ProofingStyleId): ProofingStyle | undefined {
	return proofingStyles.find((style) => style.id === id);
}

export interface StyleFit {
	split: ProofingSplit;
	/** Hours of the window the style could not use */
	leftoverHours: number;
	/** True when the window is shorter than the style needs */
	tooShort: boolean;
}

/**
 * Fit a proofing style into an available window. Styles clamp to their own
 * range, so a 60-hour window handed to "samme dag" reports 50 leftover hours
 * rather than pretending the dough can sit out for that long.
 */
export function fitStyle(id: ProofingStyleId, availableHours: number): StyleFit | null {
	const style = findProofingStyle(id);
	if (!style) return null;

	const available = Math.max(0, availableHours);
	const split = style.split(available);
	const used = split.predoughHours + split.roomHours + split.fridgeHours + split.temperHours;

	return {
		split,
		leftoverHours: Math.max(0, round(available - used)),
		tooShort: available < style.minHours
	};
}

export function splitTotalHours(split: ProofingSplit): number {
	return split.predoughHours + split.roomHours + split.fridgeHours + split.temperHours;
}

/** Hours between now and a deadline. Negative windows come back as 0. */
export function hoursUntil(readyAt: Date, now: Date): number {
	return Math.max(0, (readyAt.getTime() - now.getTime()) / 3_600_000);
}

export type PhaseKind = 'predough' | 'mix' | 'room' | 'shape' | 'fridge' | 'temper' | 'bake';

export interface PlanPhase {
	id: string;
	kind: PhaseKind;
	labelDa: string;
	/** Hours the phase lasts. Markers such as mixing and shaping are 0. */
	hours: number;
}

/**
 * Turn a split into the phases of an actual bake, including the zero-length
 * markers (mix, shape, bake) that give the timeline its landmarks.
 */
export function buildPhases(split: ProofingSplit, predoughNameDa = 'Fordej'): PlanPhase[] {
	const phases: PlanPhase[] = [];

	if (split.predoughHours > 0) {
		phases.push({
			id: 'predough-mix',
			kind: 'mix',
			labelDa: `Rør ${predoughNameDa.toLowerCase()} sammen`,
			hours: 0
		});
		phases.push({
			id: 'predough',
			kind: 'predough',
			labelDa: `${predoughNameDa} hæver`,
			hours: split.predoughHours
		});
	}

	phases.push({ id: 'mix', kind: 'mix', labelDa: 'Ælt dejen', hours: 0 });

	if (split.roomHours > 0) {
		phases.push({
			id: 'room',
			kind: 'room',
			labelDa: 'Bulkhævning ved stuetemperatur',
			hours: split.roomHours
		});
	}

	if (split.fridgeHours > 0) {
		phases.push({ id: 'shape', kind: 'shape', labelDa: 'Form kugler', hours: 0 });
		phases.push({
			id: 'fridge',
			kind: 'fridge',
			labelDa: 'Køleskab',
			hours: split.fridgeHours
		});
	}

	if (split.temperHours > 0) {
		phases.push({
			id: 'temper',
			kind: 'temper',
			labelDa: 'Temperering på bordet',
			hours: split.temperHours
		});
	} else if (split.fridgeHours === 0) {
		phases.push({ id: 'shape', kind: 'shape', labelDa: 'Form kugler', hours: 0 });
	}

	phases.push({ id: 'bake', kind: 'bake', labelDa: 'Bag', hours: 0 });

	return phases;
}

/** Longest phase that is worth a countdown timer rather than a clock time. */
export const TIMER_MAX_HOURS = 12;

export interface ScheduledStep {
	id: string;
	kind: PhaseKind;
	labelDa: string;
	hours: number;
	startsAt: Date;
	endsAt: Date;
	/** Short enough that a countdown timer is useful */
	canTimer: boolean;
}

/**
 * Lay phases on the clock so the last one lands exactly on the deadline.
 */
export function scheduleBackwards(phases: PlanPhase[], readyAt: Date): ScheduledStep[] {
	const totalHours = phases.reduce((sum, phase) => sum + phase.hours, 0);
	return scheduleForwards(phases, new Date(readyAt.getTime() - totalHours * 3_600_000));
}

/**
 * Lay phases on the clock starting from a given moment.
 */
export function scheduleForwards(phases: PlanPhase[], startAt: Date): ScheduledStep[] {
	let cursor = startAt.getTime();

	return phases.map((phase) => {
		const startsAt = new Date(cursor);
		cursor += phase.hours * 3_600_000;
		return {
			id: phase.id,
			kind: phase.kind,
			labelDa: phase.labelDa,
			hours: phase.hours,
			startsAt,
			endsAt: new Date(cursor),
			canTimer: phase.hours > 0 && phase.hours <= TIMER_MAX_HOURS
		};
	});
}
