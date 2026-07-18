import { describe, expect, test } from 'vitest';
import {
	estimateSourdoughSchedule,
	planSourdough,
	sourdoughFlourFromDoughWeight
} from '$lib/utils/sourdough';
import type { SourdoughPlanInput } from '$lib/utils/sourdough';

function buildInput(overrides?: Partial<SourdoughPlanInput>): SourdoughPlanInput {
	return {
		flourWeight: 1000,
		hydrationPercentage: 75,
		saltPercentage: 2,
		oilPercentage: 0,
		sugarPercentage: 0,
		starterPercentage: 20,
		starterHydrationPercentage: 100,
		...overrides
	};
}

describe('sourdoughFlourFromDoughWeight', () => {
	test('matches the beregner.org example', () => {
		// 1000 g dough, 75% hydration, 20% starter at 100% hydration, 2% salt:
		// starterFlourFactor = 0.20 × 1/(1+1) = 0.1
		// flour = 1000 / (1 + 0.1 + 0.75 + 0.02) = 1000 / 1.87
		const flour = sourdoughFlourFromDoughWeight(1000, {
			hydrationPercentage: 75,
			saltPercentage: 2,
			oilPercentage: 0,
			sugarPercentage: 0,
			starterPercentage: 20,
			starterHydrationPercentage: 100
		});
		expect(flour).toBeCloseTo(534.76, 1);
	});

	test('returns zero for non-positive dough weight', () => {
		expect(
			sourdoughFlourFromDoughWeight(0, {
				hydrationPercentage: 75,
				saltPercentage: 2,
				oilPercentage: 0,
				sugarPercentage: 0,
				starterPercentage: 20,
				starterHydrationPercentage: 100
			})
		).toBe(0);
	});
});

describe('planSourdough', () => {
	test('computes starter, added water, and salt from baker percentages', () => {
		const plan = planSourdough(buildInput());
		expect(plan).not.toBeNull();

		const byId = new Map(plan!.ingredients.map((ing) => [ing.id, ing]));
		expect(byId.get('flour')?.weight).toBe(1000);
		// Starter: 20% of 1000 g = 200 g, half water half flour at 100% hydration
		expect(byId.get('starter')?.weight).toBe(200);
		expect(plan!.waterInStarter).toBe(100);
		expect(plan!.flourInStarter).toBe(100);
		// Added water: 75% of 1000 g minus the 100 g already in the starter
		expect(byId.get('water')?.weight).toBe(650);
		expect(byId.get('salt')?.weight).toBe(20);
	});

	test('ingredients sum to the dough weight derived from the same input', () => {
		const doughWeight = 1000;
		const partial = {
			hydrationPercentage: 75,
			saltPercentage: 2,
			oilPercentage: 0,
			sugarPercentage: 0,
			starterPercentage: 20,
			starterHydrationPercentage: 100
		};
		const flour = sourdoughFlourFromDoughWeight(doughWeight, partial);
		const plan = planSourdough({ flourWeight: flour, ...partial });
		expect(plan!.totalWeight).toBeCloseTo(doughWeight, 0);
	});

	test('respects starter hydration when splitting starter into flour and water', () => {
		// 50% hydration starter: 200 g = 133.3 g flour + 66.7 g water
		const plan = planSourdough(buildInput({ starterHydrationPercentage: 50 }));
		expect(plan!.flourInStarter).toBeCloseTo(133.3, 1);
		expect(plan!.waterInStarter).toBeCloseTo(66.7, 1);
	});

	test('warns when starter water exceeds the hydration target', () => {
		const plan = planSourdough(buildInput({ hydrationPercentage: 5, starterPercentage: 30 }));
		expect(plan!.warnings).toContain('starter-exceeds-water');
	});

	test('returns null without flour', () => {
		expect(planSourdough(buildInput({ flourWeight: 0 }))).toBeNull();
	});
});

describe('estimateSourdoughSchedule', () => {
	test('high hydration and high starter ferment fastest', () => {
		expect(estimateSourdoughSchedule(80, 25).bulkFermentation).toEqual({ min: 3, max: 4 });
		expect(estimateSourdoughSchedule(80, 20).bulkFermentation).toEqual({ min: 4, max: 5 });
		expect(estimateSourdoughSchedule(80, 20).finalProofRoom).toEqual({ min: 2, max: 3 });
	});

	test('medium hydration', () => {
		expect(estimateSourdoughSchedule(75, 25).bulkFermentation).toEqual({ min: 4, max: 5 });
		expect(estimateSourdoughSchedule(75, 20).bulkFermentation).toEqual({ min: 5, max: 6 });
		expect(estimateSourdoughSchedule(75, 20).finalProofRoom).toEqual({ min: 2, max: 4 });
	});

	test('low hydration ferments slowest', () => {
		expect(estimateSourdoughSchedule(65, 25).bulkFermentation).toEqual({ min: 5, max: 6 });
		expect(estimateSourdoughSchedule(65, 20).bulkFermentation).toEqual({ min: 6, max: 8 });
		expect(estimateSourdoughSchedule(65, 20).finalProofRoom).toEqual({ min: 3, max: 4 });
	});

	test('fridge proof is always 8-14 hours', () => {
		expect(estimateSourdoughSchedule(75, 20).finalProofFridge).toEqual({ min: 8, max: 14 });
	});
});
