// ABOUTME: Cross-validates the fermentation model against the recipe library's real yeast amounts
//
// What this found, August 2026: the model is accurate where it can be checked
// cleanly — a room-temperature-only schedule (seb-24t, 24.5 h) lands within 5 %
// of the recipe's own yeast. Across the direct doughs the median prediction is
// about 0.65x what the recipes use, with a spread of roughly a factor of two
// either way.
//
// That spread is recipe style, not a missing term. Adding a fitted "the fridge
// table already assumes some warm handling" allowance was tried and rejected: it
// pulled the median towards 1.0 only by overshooting the short schedules
// (ny-style 0.8 -> 2.6, roma-teglia-bonci 1.6 -> 4.6) and barely moved the RMS
// error. The outliers have their own reasons, which the model deliberately does
// not carry:
//
//   bk-detroit (0.4)     enriched pan dough — sugar and oil slow the yeast
//   bk-gluten-free (0.4) no gluten to trap gas, so recipes dose up
//   ny-pizzapal (0.2)    simply a generous recipe for a 48 h cold ferment
//   roma-teglia-bonci    a frugal one for 24 h
//
// Under-dosing is the safer direction to be wrong in: an under-proofed dough can
// be given more time, an over-proofed one cannot be rescued. These bounds are
// wide on purpose — they are a tripwire for changes to the model, not a claim
// that the model reproduces the library.
import { describe, expect, test } from 'vitest';
import { recipes } from '$lib/data/recipes';
import type { Recipe } from '$lib/models';
import { predictYeast } from '$lib/utils/fermentation';
import { convertYeastPercentage } from '$lib/utils/yeast';

interface Measured {
	id: string;
	/** Instant dry yeast the recipe actually calls for, as a percentage of its own flour */
	actualIdy: number;
	roomHours: number;
	fridgeHours: number;
	temperHours: number;
	roomTemperature: number;
	/** Weight of one ball, which is what the recipes are portioned by */
	pieceWeight: number;
	hasPredough: boolean;
}

const DEFAULT_ROOM_TEMPERATURE = 21;

/**
 * Read a recipe's real schedule off its timeline. Only the time after the yeast
 * goes in counts, and a room stage that follows the fridge is a temper, not bulk.
 */
function measure(recipe: Recipe): Measured | null {
	const yeasts = recipe.mixingSteps
		.flatMap((step) => step.ingredients)
		.filter((ingredient) => ingredient.type === 'yeast');
	if (yeasts.length === 0) return null;

	const yeastIds = new Set(yeasts.map((ingredient) => ingredient.id));
	const firstYeastStep = recipe.timeline.findIndex((step) =>
		(step.ingredients ?? []).some((id) => yeastIds.has(id))
	);
	const from = firstYeastStep < 0 ? 0 : firstYeastStep;

	let roomHours = 0;
	let fridgeHours = 0;
	let temperHours = 0;
	let seenFridge = false;
	let temperature: number | undefined;

	for (const step of recipe.timeline.slice(from)) {
		const hours = (step.duration ?? 0) / 60;
		if (hours <= 0) continue;
		if (step.location === 'fridge') {
			fridgeHours += hours;
			seenFridge = true;
		} else if (step.location === 'room' || step.location === 'warm') {
			if (seenFridge) temperHours += hours;
			else roomHours += hours;
			if (step.temperature) temperature = step.temperature;
		}
	}

	const actualIdy = yeasts.reduce(
		(sum, ingredient) =>
			sum +
			convertYeastPercentage(
				ingredient.percentage,
				ingredient.type === 'yeast' ? ingredient.yeastType : 'fresh',
				'instant'
			),
		0
	);

	return {
		id: recipe.id,
		actualIdy,
		roomHours,
		fridgeHours,
		temperHours,
		roomTemperature: temperature ?? DEFAULT_ROOM_TEMPERATURE,
		pieceWeight: recipe.baseWeight,
		hasPredough: recipe.mixingSteps.some((step) => step.predough)
	};
}

function predict(sample: Measured): number | null {
	return (
		predictYeast({
			roomHours: sample.roomHours,
			fridgeHours: sample.fridgeHours,
			temperHours: sample.temperHours,
			roomTemperature: sample.roomTemperature,
			pieceWeight: sample.pieceWeight
		})?.idyPercentage ?? null
	);
}

const samples = recipes
	.map(measure)
	.filter((sample): sample is Measured => sample !== null)
	.filter((sample) => sample.roomHours + sample.fridgeHours > 0);

const direct = samples.filter((sample) => !sample.hasPredough);

function ratioFor(sample: Measured): number {
	const predicted = predict(sample);
	return predicted && sample.actualIdy > 0 ? predicted / sample.actualIdy : Number.NaN;
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

describe('the fermentation model against the recipe library', () => {
	test('reads a schedule off every yeasted recipe', () => {
		expect(samples.length).toBeGreaterThanOrEqual(15);
		// bk-surdej is the sourdough, so it has no yeast to compare
		expect(samples.map((s) => s.id)).not.toContain('bk-surdej');
	});

	test('prints the comparison', () => {
		const rows = samples
			.map((sample) => {
				const predicted = predict(sample);
				const ratio = ratioFor(sample);
				return {
					recipe: sample.id,
					room: Number(sample.roomHours.toFixed(1)),
					fridge: Number(sample.fridgeHours.toFixed(1)),
					temper: Number(sample.temperHours.toFixed(1)),
					actualIdy: Number(sample.actualIdy.toFixed(4)),
					predictedIdy: predicted === null ? null : Number(predicted.toFixed(4)),
					ratio: Number.isFinite(ratio) ? Number(ratio.toFixed(2)) : null,
					predough: sample.hasPredough
				};
			})
			.sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0));
		console.table(rows);
		expect(rows.length).toBe(samples.length);
	});

	test('reproduces a pure room-temperature schedule almost exactly', () => {
		// The one case with nothing to confound it: 24.5 h on the counter, no
		// fridge, no temper, and a recipe that states its own room temperature.
		const seb = samples.find((sample) => sample.id === 'seb-24t')!;
		expect(seb.fridgeHours).toBe(0);
		expect(ratioFor(seb)).toBeGreaterThan(0.8);
		expect(ratioFor(seb)).toBeLessThan(1.25);
	});

	test('is not systematically far off across the direct doughs', () => {
		const inRange = direct.filter(
			(sample) => sample.roomHours + sample.fridgeHours >= 2 && sample.actualIdy < 1
		);
		const ratios = inRange.map(ratioFor).filter(Number.isFinite);
		expect(ratios.length).toBeGreaterThanOrEqual(6);
		expect(median(ratios)).toBeGreaterThan(0.4);
		expect(median(ratios)).toBeLessThan(1.6);
	});

	test('errs low rather than high, which is the safer direction', () => {
		const inRange = direct.filter(
			(sample) => sample.roomHours + sample.fridgeHours >= 2 && sample.actualIdy < 1
		);
		const ratios = inRange.map(ratioFor).filter(Number.isFinite);
		// Nothing wildly over-dosed: an over-proofed dough cannot be rescued
		expect(Math.max(...ratios)).toBeLessThan(2.5);
	});
});
