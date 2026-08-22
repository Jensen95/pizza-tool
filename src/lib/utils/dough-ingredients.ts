// ABOUTME: Shared ingredient-row model for the dough planner — flour blends, water allocations, extras
import type { BakerMathIngredient } from './baker-math.types';
import { calculateIngredientWeight } from './baker-math';

/**
 * One editable line in the planner. Percentages are baker's percentages of the
 * total flour. Rows typed `flour` make up the blend and sum to 100 %; rows
 * typed `water` are allocations out of the total hydration (a poolish share, a
 * bassinage) rather than extra water on top.
 */
export type DoughIngredientRow = BakerMathIngredient;

export interface PlannedIngredient {
	id: string;
	nameDa: string;
	percentage: number;
	weight: number;
	/** Set on rows the user added, so the UI can tell them from the fixed ones */
	custom?: boolean;
}

export function roundWeight(weight: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(weight * factor) / factor;
}

function nonNegative(value: number): number {
	return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function createRow(
	name: string,
	percentage: number,
	type: DoughIngredientRow['type'] = 'other'
): DoughIngredientRow {
	const id =
		typeof crypto !== 'undefined' && crypto.randomUUID
			? crypto.randomUUID()
			: `row-${Date.now()}-${Math.round(Math.random() * 1000)}`;
	return { id, name, percentage, type };
}

export function flourRows(rows: DoughIngredientRow[] | undefined): DoughIngredientRow[] {
	return (rows ?? []).filter((row) => row.type === 'flour');
}

export function waterRows(rows: DoughIngredientRow[] | undefined): DoughIngredientRow[] {
	return (rows ?? []).filter((row) => row.type === 'water');
}

export function additionRows(rows: DoughIngredientRow[] | undefined): DoughIngredientRow[] {
	return (rows ?? []).filter((row) => row.type !== 'water' && row.type !== 'flour');
}

/** Total flour percentage of a blend. 0 when no blend is defined. */
export function flourBlendSum(rows: DoughIngredientRow[] | undefined): number {
	return flourRows(rows).reduce((sum, row) => sum + nonNegative(row.percentage), 0);
}

/** Water claimed by named allocations, as a percentage of total flour. */
export function waterAllocationSum(rows: DoughIngredientRow[] | undefined): number {
	return waterRows(rows).reduce((sum, row) => sum + nonNegative(row.percentage), 0);
}

/** Everything that adds weight on top of flour and water. */
export function additionSum(rows: DoughIngredientRow[] | undefined): number {
	return additionRows(rows).reduce((sum, row) => sum + nonNegative(row.percentage), 0);
}

/**
 * Build the flour lines. A blend renders one line per flour; without a blend
 * there is a single "Mel" line at 100 %.
 */
export function buildFlourIngredients(
	flourWeight: number,
	blend: DoughIngredientRow[] | undefined,
	suffixDa = ''
): PlannedIngredient[] {
	const rows = flourRows(blend);
	const label = (name: string) => (suffixDa ? `${name} ${suffixDa}` : name);

	if (rows.length === 0) {
		return [
			{
				id: 'flour',
				nameDa: label('Mel'),
				percentage: 100,
				weight: roundWeight(flourWeight, 1)
			}
		];
	}

	return rows.map((row) => ({
		id: row.id,
		nameDa: label(row.name || 'Mel'),
		percentage: nonNegative(row.percentage),
		weight: roundWeight(calculateIngredientWeight(flourWeight, row.percentage), 1),
		custom: true
	}));
}

/** Build the lines for everything the user added that is not flour or water. */
export function buildAdditionIngredients(
	flourWeight: number,
	rows: DoughIngredientRow[] | undefined
): PlannedIngredient[] {
	return additionRows(rows)
		.filter((row) => nonNegative(row.percentage) > 0)
		.map((row) => ({
			id: row.id,
			nameDa: row.name || 'Ingrediens',
			percentage: nonNegative(row.percentage),
			weight: roundWeight(calculateIngredientWeight(flourWeight, row.percentage), 1),
			custom: true
		}));
}

/** Build the lines for named water allocations (poolish water, bassinage). */
export function buildWaterAllocationIngredients(
	flourWeight: number,
	rows: DoughIngredientRow[] | undefined
): PlannedIngredient[] {
	return waterRows(rows)
		.filter((row) => nonNegative(row.percentage) > 0)
		.map((row) => ({
			id: row.id,
			nameDa: row.name || 'Vand',
			percentage: nonNegative(row.percentage),
			weight: roundWeight(calculateIngredientWeight(flourWeight, row.percentage), 1),
			custom: true
		}));
}

export function sumWeights(ingredients: PlannedIngredient[]): number {
	return roundWeight(
		ingredients.reduce((sum, ingredient) => sum + ingredient.weight, 0),
		1
	);
}
