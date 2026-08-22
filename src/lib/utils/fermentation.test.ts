import { describe, expect, test } from 'vitest';
import {
	REFERENCE_ROOM_TEMPERATURE,
	TEMPER_WARM_FRACTION,
	effectiveRoomHours,
	fermentationRateFactor,
	predictYeast
} from '$lib/utils/fermentation';

describe('fermentationRateFactor', () => {
	test('is neutral at the temperature the lookup table assumes', () => {
		expect(fermentationRateFactor(REFERENCE_ROOM_TEMPERATURE)).toBeCloseTo(1, 5);
	});

	test('doubles per 8 °C and halves the other way', () => {
		expect(fermentationRateFactor(29)).toBeCloseTo(2, 5);
		expect(fermentationRateFactor(13)).toBeCloseTo(0.5, 5);
	});

	test('clamps absurd temperatures instead of exploding', () => {
		expect(fermentationRateFactor(200)).toBe(fermentationRateFactor(35));
		expect(fermentationRateFactor(-50)).toBe(fermentationRateFactor(10));
		expect(fermentationRateFactor(Number.NaN)).toBeCloseTo(1, 5);
	});
});

describe('effectiveRoomHours', () => {
	test('passes room hours through unchanged at reference temperature', () => {
		expect(effectiveRoomHours({ roomHours: 4, fridgeHours: 0 })).toBeCloseTo(4, 5);
	});

	test('counts part of the tempering window as warm time', () => {
		const hours = effectiveRoomHours({ roomHours: 3, fridgeHours: 24, temperHours: 3 });
		expect(hours).toBeCloseTo(3 + 3 * TEMPER_WARM_FRACTION, 5);
	});

	test('scales the whole warm window by room temperature', () => {
		expect(effectiveRoomHours({ roomHours: 4, fridgeHours: 0, roomTemperature: 29 })).toBeCloseTo(
			8,
			5
		);
		expect(effectiveRoomHours({ roomHours: 4, fridgeHours: 0, roomTemperature: 13 })).toBeCloseTo(
			2,
			5
		);
	});
});

describe('predictYeast with temperature', () => {
	test('a warm kitchen needs less yeast for the same hours', () => {
		const cool = predictYeast({ roomHours: 5, fridgeHours: 0, roomTemperature: 18 });
		const warm = predictYeast({ roomHours: 5, fridgeHours: 0, roomTemperature: 26 });
		expect(warm!.idyPercentage).toBeLessThan(cool!.idyPercentage);
	});

	test('doubling the rate is the same as doubling the hours', () => {
		const hot = predictYeast({ roomHours: 5, fridgeHours: 0, roomTemperature: 29 });
		const long = predictYeast({ roomHours: 10, fridgeHours: 0 });
		expect(hot!.idyPercentage).toBeCloseTo(long!.idyPercentage, 3);
	});

	test('tempering after the fridge reduces the yeast the schedule needs', () => {
		const without = predictYeast({ roomHours: 3, fridgeHours: 24 });
		const withTemper = predictYeast({ roomHours: 3, fridgeHours: 24, temperHours: 3 });
		expect(withTemper!.idyPercentage).toBeLessThan(without!.idyPercentage);
	});

	test('an overnight room-temperature proof needs no fridge to resolve', () => {
		const plan = predictYeast({ roomHours: 16, fridgeHours: 0, roomTemperature: 18 });
		expect(plan).not.toBeNull();
		expect(plan!.idyPercentage).toBeGreaterThan(0);
		// 16 h at 18 °C is ~12 h of table time, well inside the 2-18 h room range
		expect(plan!.extrapolated).toBe(false);
	});

	test('a tempering window alone is enough to resolve a schedule', () => {
		expect(predictYeast({ roomHours: 0, fridgeHours: 0, temperHours: 4 })).not.toBeNull();
	});
});
