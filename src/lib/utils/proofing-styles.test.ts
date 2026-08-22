import { describe, expect, test } from 'vitest';
import {
	TIMER_MAX_HOURS,
	buildPhases,
	findProofingStyle,
	fitStyle,
	hoursUntil,
	proofingStyles,
	scheduleBackwards,
	splitTotalHours
} from '$lib/utils/proofing-styles';

describe('proofingStyles', () => {
	test('every style has Danish copy and a sane range', () => {
		for (const style of proofingStyles) {
			expect(style.nameDa.length).toBeGreaterThan(0);
			expect(style.descriptionDa.length).toBeGreaterThan(0);
			expect(style.maxHours).toBeGreaterThan(style.minHours);
		}
	});

	test('the room-temperature styles never use the fridge', () => {
		for (const id of ['same-day', 'overnight-room'] as const) {
			const fit = fitStyle(id, 24);
			expect(fit!.split.fridgeHours).toBe(0);
			expect(fit!.split.temperHours).toBe(0);
			expect(findProofingStyle(id)!.usesFridge).toBe(false);
		}
	});

	test('overnight at room temperature fills a whole night on the counter', () => {
		const fit = fitStyle('overnight-room', 14);
		expect(fit!.split.roomHours).toBe(14);
		expect(fit!.leftoverHours).toBe(0);
	});

	test('the cold styles keep a bulk and a temper and give the rest to the fridge', () => {
		const fit = fitStyle('cold-overnight', 30)!;
		expect(fit.split.roomHours).toBeGreaterThan(0);
		expect(fit.split.temperHours).toBeGreaterThan(0);
		expect(fit.split.fridgeHours).toBeGreaterThan(fit.split.roomHours);
		expect(splitTotalHours(fit.split)).toBeCloseTo(30, 1);
	});

	test('a style reports the hours it cannot use instead of stretching', () => {
		const fit = fitStyle('same-day', 60)!;
		expect(fit.split.roomHours).toBeLessThanOrEqual(10);
		expect(fit.leftoverHours).toBeGreaterThan(45);
	});

	test('a window shorter than the style needs is flagged', () => {
		expect(fitStyle('cold-48', 12)!.tooShort).toBe(true);
		expect(fitStyle('cold-48', 48)!.tooShort).toBe(false);
	});

	test('the predough style spends part of the window before mixing', () => {
		const fit = fitStyle('predough-cold', 40)!;
		expect(fit.split.predoughHours).toBeGreaterThan(0);
		expect(splitTotalHours(fit.split)).toBeCloseTo(40, 1);
	});

	test('unknown styles resolve to nothing', () => {
		expect(fitStyle('custom', 24)).toBeNull();
	});
});

describe('hoursUntil', () => {
	test('measures the window to a deadline', () => {
		const now = new Date('2026-08-21T09:00:00Z');
		expect(hoursUntil(new Date('2026-08-22T18:00:00Z'), now)).toBeCloseTo(33, 5);
	});

	test('a deadline in the past leaves no window', () => {
		const now = new Date('2026-08-21T09:00:00Z');
		expect(hoursUntil(new Date('2026-08-20T09:00:00Z'), now)).toBe(0);
	});
});

describe('buildPhases', () => {
	test('marks mixing, shaping and baking around the fermentation phases', () => {
		const phases = buildPhases({
			predoughHours: 0,
			autolyseHours: 0,
			roomHours: 3,
			fridgeHours: 24,
			temperHours: 3
		});
		const kinds = phases.map((phase) => phase.kind);
		expect(kinds).toEqual(['mix', 'room', 'shape', 'fridge', 'temper', 'bake']);
	});

	test('a room-only plan still gets a shaping step', () => {
		const phases = buildPhases({
			predoughHours: 0,
			autolyseHours: 0,
			roomHours: 14,
			fridgeHours: 0,
			temperHours: 0
		});
		expect(phases.map((phase) => phase.kind)).toEqual(['mix', 'room', 'shape', 'bake']);
	});

	test('a predough gets its own mixing step and window', () => {
		const phases = buildPhases(
			{ predoughHours: 16, autolyseHours: 0, roomHours: 2, fridgeHours: 20, temperHours: 2 },
			{ predoughNameDa: 'Poolish' }
		);
		expect(phases[0].kind).toBe('mix');
		expect(phases[1].kind).toBe('predough');
		expect(phases[1].labelDa).toContain('Poolish');
	});
});

describe('scheduleBackwards', () => {
	const readyAt = new Date('2026-08-22T18:00:00Z');

	test('lands the last step exactly on the deadline', () => {
		const phases = buildPhases({
			predoughHours: 0,
			autolyseHours: 0,
			roomHours: 3,
			fridgeHours: 24,
			temperHours: 3
		});
		const steps = scheduleBackwards(phases, readyAt);
		expect(steps[steps.length - 1].startsAt.toISOString()).toBe(readyAt.toISOString());
	});

	test('works back to the moment mixing has to start', () => {
		const phases = buildPhases({
			predoughHours: 0,
			autolyseHours: 0,
			roomHours: 3,
			fridgeHours: 24,
			temperHours: 3
		});
		const steps = scheduleBackwards(phases, readyAt);
		// 30 hours of fermentation before an 18:00 bake on the 22nd
		expect(steps[0].startsAt.toISOString()).toBe('2026-08-21T12:00:00.000Z');
	});

	test('phases run back to back', () => {
		const phases = buildPhases({
			predoughHours: 16,
			autolyseHours: 0,
			roomHours: 2,
			fridgeHours: 20,
			temperHours: 2
		});
		const steps = scheduleBackwards(phases, readyAt);
		for (let i = 1; i < steps.length; i++) {
			expect(steps[i].startsAt.getTime()).toBe(steps[i - 1].endsAt.getTime());
		}
	});

	test('only offers timers for stages short enough to watch', () => {
		const phases = buildPhases({
			predoughHours: 0,
			autolyseHours: 0,
			roomHours: 3,
			fridgeHours: 24,
			temperHours: 3
		});
		const steps = scheduleBackwards(phases, readyAt);
		const byId = new Map(steps.map((step) => [step.id, step]));
		expect(byId.get('room')!.canTimer).toBe(true);
		expect(byId.get('fridge')!.canTimer).toBe(false);
		expect(byId.get('bake')!.canTimer).toBe(false);
		expect(TIMER_MAX_HOURS).toBeGreaterThan(0);
	});
});

describe('autolyse', () => {
	test('is reserved off the top of the window, not taken from the fermentation', () => {
		const plain = fitStyle('cold-overnight', 30)!;
		const withAutolyse = fitStyle('cold-overnight', 30, { autolyseHours: 1 })!;

		expect(withAutolyse.split.autolyseHours).toBe(1);
		expect(splitTotalHours(withAutolyse.split)).toBeCloseTo(30, 1);
		// An hour of autolyse means an hour less fermentation, not a longer plan
		const fermentation = (split: typeof plain.split) =>
			split.roomHours + split.fridgeHours + split.temperHours;
		expect(fermentation(withAutolyse.split)).toBeCloseTo(fermentation(plain.split) - 1, 1);
	});

	test('counts against a window that is already tight', () => {
		expect(fitStyle('cold-overnight', 10)!.tooShort).toBe(false);
		expect(fitStyle('cold-overnight', 10, { autolyseHours: 2 })!.tooShort).toBe(true);
	});

	test('adds a rest between mixing the flour and adding the salt', () => {
		const phases = buildPhases({
			predoughHours: 0,
			autolyseHours: 0.75,
			roomHours: 3,
			fridgeHours: 24,
			temperHours: 2
		});
		const kinds = phases.map((phase) => phase.kind);
		expect(kinds).toEqual(['mix', 'autolyse', 'mix', 'room', 'shape', 'fridge', 'temper', 'bake']);
		expect(phases[0].labelDa).toBe('Bland mel og vand');
		expect(phases[2].labelDa).toContain('gær');
	});

	test('names the sourdough starter instead of yeast when asked', () => {
		const phases = buildPhases(
			{ predoughHours: 0, autolyseHours: 1, roomHours: 5, fridgeHours: 0, temperHours: 0 },
			{ leavening: 'sourdough' }
		);
		expect(phases[2].labelDa).toContain('surdej');
	});

	test('is short enough to deserve a timer', () => {
		const phases = buildPhases({
			predoughHours: 0,
			autolyseHours: 0.75,
			roomHours: 3,
			fridgeHours: 0,
			temperHours: 0
		});
		const steps = scheduleBackwards(phases, new Date('2026-08-22T18:00:00Z'));
		const autolyse = steps.find((step) => step.kind === 'autolyse')!;
		expect(autolyse.canTimer).toBe(true);
		expect(autolyse.endsAt.getTime() - autolyse.startsAt.getTime()).toBe(45 * 60 * 1000);
	});

	test('still lands the bake on the deadline', () => {
		const readyAt = new Date('2026-08-22T18:00:00Z');
		const fit = fitStyle('cold-overnight', 30, { autolyseHours: 1 })!;
		const steps = scheduleBackwards(buildPhases(fit.split), readyAt);
		expect(steps[steps.length - 1].startsAt.toISOString()).toBe(readyAt.toISOString());
		expect(steps[0].startsAt.toISOString()).toBe('2026-08-21T12:00:00.000Z');
	});
});
