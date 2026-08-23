import { describe, expect, test } from 'vitest';
import {
	FRIDGE_TEMPERATURE,
	REFERENCE_ROOM_TEMPERATURE,
	analyseFridgeCooling,
	coolingTimeConstant,
	driftEquivalentHours,
	effectiveRoomHours,
	fermentationRateFactor,
	hoursToReachTemperature,
	maxWarmHours,
	predictYeast,
	temperatureAfter
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
		// The floor is fridge temperature: nothing in a plan is colder than that
		expect(fermentationRateFactor(-50)).toBe(fermentationRateFactor(FRIDGE_TEMPERATURE));
		expect(fermentationRateFactor(Number.NaN)).toBeCloseTo(1, 5);
	});
});

describe('effectiveRoomHours', () => {
	test('passes room hours through unchanged at reference temperature', () => {
		expect(effectiveRoomHours({ roomHours: 4, fridgeHours: 0 })).toBeCloseTo(4, 5);
	});

	test('counts the tempering window as it actually warms up', () => {
		// 3 h out of the fridge on a 260 g ball: it starts at 4 °C and only
		// reaches room speed towards the end, so it is worth about 2 h.
		const withTemper = effectiveRoomHours({
			roomHours: 3,
			fridgeHours: 0,
			temperHours: 3,
			pieceWeight: 260
		});
		expect(withTemper - 3).toBeGreaterThan(1.5);
		expect(withTemper - 3).toBeLessThan(2.5);
	});

	test('a colder piece of dough tempers more slowly than a bigger one warms', () => {
		const ball = effectiveRoomHours({
			roomHours: 0,
			fridgeHours: 0,
			temperHours: 3,
			pieceWeight: 260
		});
		const bulk = effectiveRoomHours({
			roomHours: 0,
			fridgeHours: 0,
			temperHours: 3,
			pieceWeight: 4000
		});
		// The small ball warms up sooner, so it ferments more in the same 3 h
		expect(ball).toBeGreaterThan(bulk);
	});

	test('scales the bulk by room temperature', () => {
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

describe('dough temperature', () => {
	const schedule = {
		roomHours: 3,
		fridgeHours: 24,
		temperHours: 2,
		roomTemperature: 21,
		bulkWeight: 1700,
		pieceWeight: 260
	};

	test('an unknown dough temperature changes nothing', () => {
		// Defaulting to the room temperature has to leave the lookup table intact
		expect(predictYeast({ roomHours: 0, fridgeHours: 24 })?.idyPercentage).toBeCloseTo(0.3, 3);
		expect(predictYeast({ roomHours: 0, fridgeHours: 48 })?.idyPercentage).toBeCloseTo(0.1, 3);
	});

	test('a warm dough needs less yeast than a cool one', () => {
		const warm = predictYeast({ ...schedule, doughTemperature: 28 })!;
		const cool = predictYeast({ ...schedule, doughTemperature: 22 })!;
		expect(warm.idyPercentage).toBeLessThan(cool.idyPercentage);
	});

	test('a dough at room temperature costs nothing extra on the way into the fridge', () => {
		const cooling = analyseFridgeCooling({ ...schedule, doughTemperature: 21 });
		expect(cooling.extraWarmEquivalentHours).toBeCloseTo(0, 5);
	});

	test('a dough hotter than the room keeps fermenting while it cools', () => {
		const cooling = analyseFridgeCooling({ ...schedule, doughTemperature: 28 });
		expect(cooling.extraWarmEquivalentHours).toBeGreaterThan(0);
		expect(cooling.temperatureAtFridgeEntry).toBeGreaterThan(21);
	});

	test('a big bulk stays warm far longer than shaped balls', () => {
		const balls = analyseFridgeCooling({
			...schedule,
			doughTemperature: 27,
			pieceWeight: 260
		});
		const bulk = analyseFridgeCooling({
			...schedule,
			doughTemperature: 27,
			pieceWeight: 6000,
			bulkWeight: 6000
		});
		expect(bulk.hoursToCold).toBeGreaterThan(balls.hoursToCold * 3);
		expect(bulk.extraWarmEquivalentHours).toBeGreaterThan(balls.extraWarmEquivalentHours);
	});
});

describe('cooling matched against published figures', () => {
	test('an 80 F ball reaches fridge temperature in about three hours', () => {
		// Widely cited: 80 F (26.7 C) dough takes roughly 3 h to reach fridge temp
		const hours = hoursToReachTemperature(26.7, FRIDGE_TEMPERATURE, coolingTimeConstant(260));
		expect(hours).toBeGreaterThan(2.5);
		expect(hours).toBeLessThan(3.8);
	});

	test('a one kilo loaf takes most of a working day', () => {
		// Also cited: 8-10 h for the core of an 800 g - 1 kg loaf
		const hours = hoursToReachTemperature(26.7, FRIDGE_TEMPERATURE, coolingTimeConstant(1000));
		expect(hours).toBeGreaterThan(6);
		expect(hours).toBeLessThan(11);
	});

	test('warming and cooling use the same curve', () => {
		const tau = coolingTimeConstant(260);
		expect(temperatureAfter(tau, 4, 21, tau)).toBeCloseTo(21 - 17 * Math.exp(-1), 5);
		expect(driftEquivalentHours(0, 4, 21, tau)).toBe(0);
	});
});

describe('when the dough has to go in the fridge', () => {
	test('gives a warm window that shrinks as the dough gets warmer', () => {
		const base = { roomHours: 2, fridgeHours: 24, roomTemperature: 21, pieceWeight: 260 };
		const cool = maxWarmHours({ ...base, doughTemperature: 21 }, 0.1);
		const warm = maxWarmHours({ ...base, doughTemperature: 28 }, 0.1);
		expect(warm).toBeLessThan(cool);
		expect(cool).toBeGreaterThan(0);
	});

	test('more yeast means less time on the counter', () => {
		const base = { roomHours: 2, fridgeHours: 24, roomTemperature: 21, pieceWeight: 260 };
		expect(maxWarmHours(base, 0.4)).toBeLessThan(maxWarmHours(base, 0.05));
	});
});
