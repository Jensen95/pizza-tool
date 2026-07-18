import { describe, expect, test } from 'vitest';
import { flourFromDoughWeight, planDough, predictYeast } from '$lib/utils/dough-planner';
import type { DoughPlanInput } from '$lib/utils/dough-planner';

function buildInput(overrides?: Partial<DoughPlanInput>): DoughPlanInput {
	return {
		flourWeight: 1000,
		hydrationPercentage: 65,
		saltPercentage: 2.5,
		oilPercentage: 0,
		sugarPercentage: 0,
		yeastType: 'instant',
		roomHours: 5,
		fridgeHours: 0,
		...overrides
	};
}

describe('predictYeast', () => {
	test('reproduces the lookup table anchors at room temperature', () => {
		expect(predictYeast({ roomHours: 2, fridgeHours: 0 })?.idyPercentage).toBeCloseTo(0.5, 3);
		expect(predictYeast({ roomHours: 5, fridgeHours: 0 })?.idyPercentage).toBeCloseTo(0.2, 3);
		expect(predictYeast({ roomHours: 8, fridgeHours: 0 })?.idyPercentage).toBeCloseTo(0.1, 3);
		expect(predictYeast({ roomHours: 18, fridgeHours: 0 })?.idyPercentage).toBeCloseTo(0.03, 3);
	});

	test('reproduces the lookup table anchors in the fridge', () => {
		expect(predictYeast({ roomHours: 0, fridgeHours: 24 })?.idyPercentage).toBeCloseTo(0.3, 3);
		expect(predictYeast({ roomHours: 0, fridgeHours: 48 })?.idyPercentage).toBeCloseTo(0.1, 3);
		expect(predictYeast({ roomHours: 0, fridgeHours: 72 })?.idyPercentage).toBeCloseTo(0.05, 3);
	});

	test('interpolates between table entries', () => {
		const idy = predictYeast({ roomHours: 3.5, fridgeHours: 0 })?.idyPercentage ?? 0;
		expect(idy).toBeGreaterThan(0.2);
		expect(idy).toBeLessThan(0.5);
	});

	test('more time means less yeast', () => {
		const short = predictYeast({ roomHours: 3, fridgeHours: 0 })?.idyPercentage ?? 0;
		const long = predictYeast({ roomHours: 12, fridgeHours: 0 })?.idyPercentage ?? 0;
		expect(long).toBeLessThan(short);
	});

	test('combined schedule needs less yeast than either part alone', () => {
		const combined = predictYeast({ roomHours: 2, fridgeHours: 24 })?.idyPercentage ?? 0;
		const roomOnly = predictYeast({ roomHours: 2, fridgeHours: 0 })?.idyPercentage ?? 0;
		const fridgeOnly = predictYeast({ roomHours: 0, fridgeHours: 24 })?.idyPercentage ?? 0;
		expect(combined).toBeLessThan(roomOnly);
		expect(combined).toBeLessThan(fridgeOnly);
		expect(combined).toBeGreaterThan(0);
	});

	test('combined schedule converges to the pure case as one part shrinks', () => {
		const nearlyPure = predictYeast({ roomHours: 5, fridgeHours: 0.01 })?.idyPercentage ?? 0;
		expect(nearlyPure).toBeCloseTo(0.2, 1);
	});

	test('returns null without any proofing time', () => {
		expect(predictYeast({ roomHours: 0, fridgeHours: 0 })).toBeNull();
		expect(predictYeast({ roomHours: -2, fridgeHours: 0 })).toBeNull();
	});

	test('flags schedules outside the lookup table as extrapolated', () => {
		expect(predictYeast({ roomHours: 1, fridgeHours: 0 })?.extrapolated).toBe(true);
		expect(predictYeast({ roomHours: 30, fridgeHours: 0 })?.extrapolated).toBe(true);
		expect(predictYeast({ roomHours: 0, fridgeHours: 96 })?.extrapolated).toBe(true);
		expect(predictYeast({ roomHours: 5, fridgeHours: 0 })?.extrapolated).toBe(false);
		expect(predictYeast({ roomHours: 0, fridgeHours: 48 })?.extrapolated).toBe(false);
	});
});

describe('flourFromDoughWeight', () => {
	test('derives flour from total dough weight', () => {
		// 1000 g dough at 65% hydration + 2.5% salt: flour = 1000 / 1.675
		expect(flourFromDoughWeight(1000, 67.5)).toBeCloseTo(597.01, 1);
	});

	test('returns zero for non-positive dough weight', () => {
		expect(flourFromDoughWeight(0, 67.5)).toBe(0);
		expect(flourFromDoughWeight(-100, 67.5)).toBe(0);
	});
});

describe('planDough', () => {
	test('computes ingredient weights from baker percentages', () => {
		const plan = planDough(buildInput());
		expect(plan).not.toBeNull();

		const byId = new Map(plan!.ingredients.map((ing) => [ing.id, ing]));
		expect(byId.get('flour')?.weight).toBe(1000);
		expect(byId.get('water')?.weight).toBe(650);
		expect(byId.get('salt')?.weight).toBe(25);
		// 5 h at room temperature is a table anchor: 0.2% IDY = 2 g on 1000 g flour
		expect(byId.get('yeast')?.weight).toBeCloseTo(2, 2);
		expect(plan!.totalWeight).toBeCloseTo(1677, 0);
	});

	test('omits oil and sugar when their percentage is zero', () => {
		const plan = planDough(buildInput());
		const ids = plan!.ingredients.map((ing) => ing.id);
		expect(ids).not.toContain('oil');
		expect(ids).not.toContain('sugar');
	});

	test('includes oil and sugar when set', () => {
		const plan = planDough(buildInput({ oilPercentage: 3, sugarPercentage: 2 }));
		const byId = new Map(plan!.ingredients.map((ing) => [ing.id, ing]));
		expect(byId.get('oil')?.weight).toBe(30);
		expect(byId.get('sugar')?.weight).toBe(20);
	});

	test('converts yeast amount to fresh yeast', () => {
		const instant = planDough(buildInput({ yeastType: 'instant' }));
		const fresh = planDough(buildInput({ yeastType: 'fresh' }));
		// Fresh yeast factor is 1.0 vs instant 0.33 → roughly 3x the amount
		expect(fresh!.yeastWeight / instant!.yeastWeight).toBeCloseTo(1 / 0.33, 1);
	});

	test('warns about hard-to-weigh yeast amounts', () => {
		const plan = planDough(buildInput({ flourWeight: 100, roomHours: 18, yeastType: 'instant' }));
		// 0.03% of 100 g = 0.03 g
		expect(plan!.warnings).toContain('tiny-yeast-amount');
	});

	test('warns when the schedule is outside the lookup table', () => {
		const plan = planDough(buildInput({ roomHours: 30 }));
		expect(plan!.warnings).toContain('outside-table');
	});

	test('returns null without flour or proofing time', () => {
		expect(planDough(buildInput({ flourWeight: 0 }))).toBeNull();
		expect(planDough(buildInput({ roomHours: 0, fridgeHours: 0 }))).toBeNull();
	});
});
