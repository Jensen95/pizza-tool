import { describe, expect, test } from 'vitest';
import { analyseDoughStrength } from '$lib/utils/dough-strength';
import { createRow, type DoughIngredientRow } from '$lib/utils/dough-ingredients';

const base = { flourWeight: 1000, hydrationPercentage: 65 };

function flour(variant: string, percentage: number): DoughIngredientRow {
	return { id: `f-${variant}`, name: variant, percentage, type: 'flour', variant };
}

function seed(variant: string, percentage: number): DoughIngredientRow {
	return { id: `s-${variant}`, name: variant, percentage, type: 'seed', variant };
}

function ids(strength: ReturnType<typeof analyseDoughStrength>): string[] {
	return strength.findings.map((finding) => finding.id);
}

describe('a plain dough', () => {
	test('says nothing when there is no blend and no seeds', () => {
		const strength = analyseDoughStrength(undefined, undefined, base);
		expect(strength.findings).toEqual([]);
		expect(strength.structureScore).toBe(1);
		expect(strength.wholegrainPercentage).toBe(0);
	});

	test('stays quiet for a white blend', () => {
		const strength = analyseDoughStrength(
			[flour('tipo-00', 80), flour('semolina', 20)],
			undefined,
			base
		);
		expect(strength.findings).toEqual([]);
	});
});

describe('wholegrain', () => {
	test('mentions the extra water it drinks from 15 %', () => {
		const strength = analyseDoughStrength(
			[flour('tipo-00', 75), flour('whole-wheat', 25)],
			[],
			base
		);
		const finding = strength.findings.find((f) => f.id === 'wholegrain-share')!;
		expect(finding.level).toBe('info');
		expect(finding.bodyDa).toContain('hydration');
	});

	test('cautions past a third of the flour', () => {
		const strength = analyseDoughStrength(
			[flour('tipo-00', 50), flour('whole-wheat', 50)],
			[],
			base
		);
		expect(strength.findings.find((f) => f.id === 'wholegrain-share')!.level).toBe('caution');
	});

	test('warns when it dominates the dough', () => {
		const strength = analyseDoughStrength([flour('whole-wheat', 100)], [], base);
		expect(strength.findings.find((f) => f.id === 'wholegrain-share')!.level).toBe('warning');
	});

	test('counts tipo 1 and spelt as partly wholegrain', () => {
		expect(analyseDoughStrength([flour('tipo-1', 100)], [], base).wholegrainPercentage).toBe(30);
		expect(analyseDoughStrength([flour('spelt', 100)], [], base).wholegrainPercentage).toBe(50);
	});

	test('normalises a blend that does not add up to 100', () => {
		// 30 + 30 stated is still half wholegrain
		const strength = analyseDoughStrength(
			[flour('tipo-00', 30), flour('whole-wheat', 30)],
			[],
			base
		);
		expect(strength.wholegrainPercentage).toBe(50);
	});
});

describe('rye', () => {
	test('is called out as gluten-free structure at a fifth of the flour', () => {
		const strength = analyseDoughStrength([flour('tipo-00', 75), flour('rye', 25)], [], base);
		expect(strength.findings.find((f) => f.id === 'rye-share')!.level).toBe('caution');
	});

	test('past half the flour it is a rye bread', () => {
		const strength = analyseDoughStrength([flour('tipo-00', 30), flour('rye', 70)], [], base);
		expect(strength.findings.find((f) => f.id === 'rye-share')!.level).toBe('warning');
		expect(ids(strength)).toContain('structure-overloaded');
	});
});

describe('seeds', () => {
	test('a normal seeded loaf gets a handling note', () => {
		const strength = analyseDoughStrength([], [seed('sunflower', 15)], base);
		expect(strength.findings.find((f) => f.id === 'seed-share')!.level).toBe('info');
		expect(strength.seedPercentage).toBe(15);
	});

	test('a heavy load cautions about the crumb', () => {
		const strength = analyseDoughStrength([], [seed('pumpkin', 30)], base);
		expect(strength.findings.find((f) => f.id === 'seed-share')!.level).toBe('caution');
	});

	test('too many seeds to hold together is a warning', () => {
		const strength = analyseDoughStrength([], [seed('pumpkin', 45)], base);
		expect(strength.findings.find((f) => f.id === 'seed-share')!.level).toBe('warning');
	});

	test('sums several kinds of seed', () => {
		const strength = analyseDoughStrength(
			[],
			[seed('sunflower', 10), seed('pumpkin', 10), seed('sesame', 8)],
			base
		);
		expect(strength.seedPercentage).toBe(28);
	});

	test('unknown seeds fall back to the generic kind rather than crashing', () => {
		const strength = analyseDoughStrength([], [seed('durian', 20)], base);
		expect(strength.seedPercentage).toBe(20);
	});
});

describe('thirsty seeds', () => {
	test('works out the water chia will bind and the hydration that covers it', () => {
		const strength = analyseDoughStrength([], [seed('chia', 5)], base);
		// 5 % of 1000 g flour is 50 g of chia, drinking 4x its weight
		expect(strength.seedWaterWeight).toBe(200);
		expect(strength.compensatedHydrationPercentage).toBe(85);

		const finding = strength.findings.find((f) => f.id === 'seed-soaker')!;
		expect(finding.titleDa).toContain('chiafrø');
		expect(finding.bodyDa).toContain('200 g');
		expect(finding.bodyDa).toContain('85 %');
	});

	test('stops suggesting hydration when the water no longer fits in the dough', () => {
		const strength = analyseDoughStrength([], [seed('chia', 15)], base);
		const finding = strength.findings.find((f) => f.id === 'seed-soaker')!;
		expect(finding.bodyDa).toContain('soaker');
		expect(finding.bodyDa).not.toContain('hæv hydrationen');
	});

	test('passes on what the seed data knows about the seed', () => {
		const finding = analyseDoughStrength([], [seed('chia', 5)], base).findings.find(
			(f) => f.id === 'seed-soaker'
		)!;
		expect(finding.bodyDa).toContain('Læg altid i blød');
	});

	test('dry seeds do not raise a soaker note', () => {
		const strength = analyseDoughStrength([], [seed('sesame', 5)], base);
		expect(ids(strength)).not.toContain('seed-soaker');
	});

	test('psyllium binds rather than weakens', () => {
		const withPsyllium = analyseDoughStrength([], [seed('psyllium', 5)], base);
		const withPumpkin = analyseDoughStrength([], [seed('pumpkin', 5)], base);
		expect(withPsyllium.structureScore).toBeGreaterThan(withPumpkin.structureScore);
	});
});

describe('the combined load', () => {
	test('weak flour plus seeds eventually overloads the gluten', () => {
		const strength = analyseDoughStrength(
			[flour('whole-wheat', 60), flour('rye', 40)],
			[seed('pumpkin', 25)],
			base
		);
		expect(ids(strength)).toContain('structure-overloaded');
		expect(strength.structureScore).toBeLessThan(0.45);
	});

	test('the same seeds in strong white flour are fine', () => {
		const strength = analyseDoughStrength([flour('bread', 100)], [seed('pumpkin', 25)], base);
		expect(ids(strength)).not.toContain('structure-overloaded');
	});

	test('gluten-free flour in a wheat dough is flagged', () => {
		const strength = analyseDoughStrength(
			[flour('tipo-00', 70), flour('gluten-free', 30)],
			[],
			base
		);
		expect(ids(strength)).toContain('gluten-free-blend');
	});
});

describe('generated row ids', () => {
	test('never start with a digit, so they work as CSS selectors', () => {
		for (let i = 0; i < 25; i++) {
			// A raw UUID is a legal HTML id but an invalid selector when it starts
			// with a digit, and these ids end up in `id` attributes.
			expect(createRow('Solsikkefrø', 10, 'seed', 'sunflower').id).toMatch(/^[a-zA-Z]/);
		}
	});
});
