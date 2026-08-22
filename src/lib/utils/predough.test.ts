import { describe, expect, test } from 'vitest';
import { createPredoughConfig, planPredough, predoughDefaults } from '$lib/utils/predough';

describe('createPredoughConfig', () => {
	test('a poolish starts wet, a biga starts stiff', () => {
		expect(createPredoughConfig('poolish').hydrationPercentage).toBe(100);
		expect(createPredoughConfig('biga').hydrationPercentage).toBe(45);
	});

	test('every kind has Danish labels', () => {
		for (const kind of ['poolish', 'biga'] as const) {
			expect(predoughDefaults[kind].nameDa.length).toBeGreaterThan(0);
		}
	});
});

describe('planPredough', () => {
	test('takes its flour and water from the total flour', () => {
		const plan = planPredough(
			{
				kind: 'poolish',
				flourPercentage: 20,
				hydrationPercentage: 100,
				roomHours: 16,
				fridgeHours: 0
			},
			1000
		);

		expect(plan!.flourWeight).toBe(200);
		expect(plan!.waterWeight).toBe(200);
		expect(plan!.waterPercentageOfTotalFlour).toBeCloseTo(20, 5);
	});

	test('a stiff biga on all the flour still only contributes its own water', () => {
		const plan = planPredough(
			{
				kind: 'biga',
				flourPercentage: 100,
				hydrationPercentage: 45,
				roomHours: 18,
				fridgeHours: 0
			},
			1000
		);

		expect(plan!.flourWeight).toBe(1000);
		expect(plan!.waterWeight).toBe(450);
		expect(plan!.waterPercentageOfTotalFlour).toBeCloseTo(45, 5);
	});

	test('expresses its yeast both against its own flour and the total', () => {
		const plan = planPredough(
			{
				kind: 'poolish',
				flourPercentage: 25,
				hydrationPercentage: 100,
				roomHours: 12,
				fridgeHours: 0
			},
			1000
		);

		expect(plan!.idyPercentageOfTotalFlour).toBeCloseTo(plan!.idyPercentage * 0.25, 6);
	});

	test('a longer predough window needs less yeast', () => {
		const base = {
			kind: 'poolish' as const,
			flourPercentage: 20,
			hydrationPercentage: 100,
			fridgeHours: 0
		};
		const short = planPredough({ ...base, roomHours: 4 }, 1000);
		const long = planPredough({ ...base, roomHours: 16 }, 1000);
		expect(long!.idyPercentage).toBeLessThan(short!.idyPercentage);
	});

	test('returns null without flour or a share', () => {
		const config = createPredoughConfig('poolish');
		expect(planPredough(config, 0)).toBeNull();
		expect(planPredough({ ...config, flourPercentage: 0 }, 1000)).toBeNull();
	});
});
