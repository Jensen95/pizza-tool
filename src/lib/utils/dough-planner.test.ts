import { describe, expect, test } from 'vitest';
import {
	flourFromDoughWeight,
	nonFlourPercentageSum,
	planDough,
	predictYeast,
	resolveFlourWeight,
	targetDoughWeight
} from '$lib/utils/dough-planner';
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

describe('sizing', () => {
	test('flour mode passes the flour weight straight through', () => {
		const sizing = {
			mode: 'flour' as const,
			flourWeight: 800,
			doughWeight: 0,
			ballCount: 0,
			ballWeight: 0
		};
		expect(resolveFlourWeight(sizing, 67.5)).toBe(800);
	});

	test('balls mode works back from the total dough weight', () => {
		const sizing = {
			mode: 'balls' as const,
			flourWeight: 0,
			doughWeight: 0,
			ballCount: 8,
			ballWeight: 250
		};
		expect(targetDoughWeight(sizing)).toBe(2000);
		// 2000 g of dough at 67.5 % non-flour ingredients
		expect(resolveFlourWeight(sizing, 67.5)).toBeCloseTo(1194.03, 1);
	});

	test('dough mode matches the flour the same percentages imply', () => {
		const dough = {
			mode: 'dough' as const,
			flourWeight: 0,
			doughWeight: 2000,
			ballCount: 0,
			ballWeight: 0
		};
		const balls = {
			mode: 'balls' as const,
			flourWeight: 0,
			doughWeight: 0,
			ballCount: 4,
			ballWeight: 500
		};
		expect(resolveFlourWeight(dough, 67.5)).toBeCloseTo(resolveFlourWeight(balls, 67.5), 5);
	});

	test('non-flour sum includes added rows and the yeast', () => {
		const sum = nonFlourPercentageSum(
			{
				hydrationPercentage: 65,
				saltPercentage: 2.5,
				oilPercentage: 0,
				sugarPercentage: 0,
				extras: [{ id: 'malt', name: 'Malt', percentage: 0.5, type: 'other' }]
			},
			0.372
		);
		expect(sum).toBeCloseTo(68.372, 5);
	});

	test('a ball plan round-trips to the dough weight it was asked for', () => {
		const yeastPercentage = planDough(buildInput())!.yeastPercentage;
		const flourWeight = resolveFlourWeight(
			{
				mode: 'balls',
				flourWeight: 0,
				doughWeight: 0,
				ballCount: 6,
				ballWeight: 260
			},
			nonFlourPercentageSum(buildInput(), yeastPercentage)
		);
		const plan = planDough(buildInput({ flourWeight }));
		expect(plan!.totalWeight).toBeCloseTo(1560, 0);
	});
});

describe('flour blends', () => {
	const blend = [
		{ id: 'tipo00', name: 'Tipo 00', percentage: 70, type: 'flour' as const },
		{ id: 'semola', name: 'Semola', percentage: 30, type: 'flour' as const }
	];

	test('splits the flour weight across the blend', () => {
		const plan = planDough(buildInput({ flours: blend }));
		const byId = new Map(plan!.ingredients.map((ing) => [ing.id, ing]));
		expect(byId.get('tipo00')?.weight).toBe(700);
		expect(byId.get('semola')?.weight).toBe(300);
		expect(plan!.totalWeight).toBeCloseTo(1677, 0);
	});

	test('warns when the blend does not add up to 100 %', () => {
		const plan = planDough(buildInput({ flours: [{ ...blend[0], percentage: 60 }, blend[1]] }));
		expect(plan!.warnings).toContain('flour-blend-off');
	});

	test('a balanced blend raises no warning', () => {
		expect(planDough(buildInput({ flours: blend }))!.warnings).not.toContain('flour-blend-off');
	});
});

describe('added ingredient rows', () => {
	test('water rows take their share out of the hydration', () => {
		const plan = planDough(
			buildInput({
				extras: [{ id: 'autolyse', name: 'Vand (autolyse)', percentage: 50, type: 'water' }]
			})
		);
		const byId = new Map(plan!.ingredients.map((ing) => [ing.id, ing]));
		expect(byId.get('autolyse')?.weight).toBe(500);
		expect(byId.get('water')?.weight).toBe(150);
		// Total water is unchanged: the rows only say when it goes in
		expect(plan!.totalWeight).toBeCloseTo(1677, 0);
	});

	test('warns when the water rows claim more than the hydration', () => {
		const plan = planDough(
			buildInput({
				extras: [{ id: 'autolyse', name: 'Vand', percentage: 70, type: 'water' }]
			})
		);
		expect(plan!.warnings).toContain('water-over-allocated');
	});

	test('other rows add weight on top', () => {
		const plan = planDough(
			buildInput({
				extras: [{ id: 'malt', name: 'Malt', percentage: 1, type: 'other' }]
			})
		);
		const byId = new Map(plan!.ingredients.map((ing) => [ing.id, ing]));
		expect(byId.get('malt')?.weight).toBe(10);
		expect(plan!.totalWeight).toBeCloseTo(1687, 0);
	});
});

describe('predough', () => {
	const poolish = {
		kind: 'poolish' as const,
		flourPercentage: 20,
		hydrationPercentage: 100,
		roomHours: 1,
		fridgeHours: 20
	};

	test('splits flour and water between the predough and the final dough', () => {
		const plan = planDough(buildInput({ predough: poolish }))!;
		const predoughStage = plan.stages.find((stage) => stage.id === 'predough')!;
		const mainStage = plan.stages.find((stage) => stage.id === 'main')!;

		expect(predoughStage.ingredients.find((ing) => ing.id === 'flour')?.weight).toBe(200);
		expect(predoughStage.ingredients.find((ing) => ing.id === 'predough-water')?.weight).toBe(200);
		expect(mainStage.ingredients.find((ing) => ing.id === 'flour')?.weight).toBe(800);
		expect(mainStage.ingredients.find((ing) => ing.id === 'water')?.weight).toBe(450);
	});

	test('total water and total flour are unchanged by the split', () => {
		const withPredough = planDough(buildInput({ predough: poolish }))!;
		const without = planDough(buildInput())!;
		expect(withPredough.flourWeight).toBe(without.flourWeight);
		expect(withPredough.totalWeight).toBeCloseTo(without.totalWeight, 0);
	});

	test('the predough yeast comes out of the same budget', () => {
		const plan = planDough(buildInput({ predough: poolish }))!;
		expect(plan.predoughYeastWeight).toBeGreaterThan(0);
		expect(plan.mainYeastWeight + plan.predoughYeastWeight).toBeCloseTo(plan.yeastWeight, 2);
	});

	test('says so when the predough carries all the yeast', () => {
		const plan = planDough(
			buildInput({
				roomHours: 0,
				fridgeHours: 48,
				predough: { ...poolish, flourPercentage: 100, roomHours: 4, fridgeHours: 0 }
			})
		)!;
		expect(plan.warnings).toContain('predough-covers-yeast');
		expect(plan.mainYeastWeight).toBe(0);
		expect(plan.ingredients.some((ing) => ing.id === 'yeast')).toBe(false);
	});

	test('warns when the predough needs more water than the dough has', () => {
		const plan = planDough(
			buildInput({
				hydrationPercentage: 60,
				predough: { ...poolish, flourPercentage: 80, hydrationPercentage: 100 }
			})
		)!;
		expect(plan.warnings).toContain('predough-too-wet');
	});
});

describe('room temperature', () => {
	test('a hot kitchen needs less yeast than a cold one', () => {
		const cold = planDough(buildInput({ roomTemperature: 17 }))!;
		const hot = planDough(buildInput({ roomTemperature: 27 }))!;
		expect(hot.yeastWeight).toBeLessThan(cold.yeastWeight);
	});

	test('tempering counts towards the fermentation', () => {
		const without = planDough(buildInput({ roomHours: 2, fridgeHours: 24 }))!;
		const withTemper = planDough(buildInput({ roomHours: 2, fridgeHours: 24, temperHours: 3 }))!;
		expect(withTemper.yeastWeight).toBeLessThan(without.yeastWeight);
	});
});
