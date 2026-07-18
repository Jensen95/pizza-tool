// ABOUTME: Dough Log (bake journal) data model — records what actually happened
// on a bake versus what the recipe/plan prescribed. See DESIGN_PLAN.md §5.2.
//
// Every field beyond the required core is additive/optional and defaulted at read
// time (the `leavening?` pattern, store-map §2) — there is no migration harness, so
// new fields must never be required on historical records.

/**
 * A single ingredient that was added, omitted, or changed relative to the recipe.
 */
export interface IngredientDeviation {
	/** Reuses the RecipeIngredient/FlatIngredient id space (loose, no integrity guarantee). */
	ingredientId: string;
	/** Snapshot of the ingredient name at bake time, so the row stays readable if the recipe changes. */
	label: string;
	kind: 'added' | 'omitted' | 'changed';
	/** Baker % the recipe/calculator prescribed (absent for a purely-added ingredient). */
	plannedPct?: number | null;
	/** Baker % the baker actually used (absent for an omitted ingredient). */
	actualPct?: number | null;
}

/**
 * A fermentation step that ran shorter/longer/warmer/cooler than planned.
 * References a `recipe.timeline` step by index + snapshot (no stable id, §5.1).
 */
export interface FermentationDeviation {
	/** Index into `recipe.timeline` — no stable id exists, so we snapshot instead. */
	stepIndex: number;
	/** Snapshot of the step's instructions/section at bake time. */
	stepLabel: string;
	plannedMinutes?: number | null;
	actualMinutes?: number | null;
	plannedLocation?: 'room' | 'fridge' | 'warm' | null;
	actualLocation?: 'room' | 'fridge' | 'warm' | null;
	/** e.g. "køkkenet var 26°C, hævede hurtigt". */
	tempNote?: string;
}

export interface DoughLogEntry {
	/** crypto.randomUUID() with a Date.now() fallback (matches dough-plans). */
	id: string;
	/** Loose FK to a recipe — no referential integrity guarantee anywhere (store-map §6). */
	recipeId: string;
	/** Snapshot of the recipe name for resilience if the static recipe JSON changes. */
	recipeName: string;
	/** Snapshot of the recipe category. */
	recipeCategory?: string;
	/** Optional link to a SavedDoughPlan. */
	doughPlanId?: string;
	/** Snapshot of the calculator inputs at bake time. */
	numberOfPizzas: number;
	doughBallWeight: number;
	/** Effective values at bake time (may be defaulted from the recipe). */
	hydration?: number | null;
	predoughRatio?: number | null;
	ingredientDeviations: IngredientDeviation[];
	fermentationDeviations: FermentationDeviation[];
	/** Free-form notes. */
	notes?: string;
	/** 1–5 star rating, optional. */
	outcome?: 1 | 2 | 3 | 4 | 5;
	/** ISO — when the bake happened (may differ from createdAt). */
	bakedAt: string;
	/** ISO — when the log entry was written. */
	createdAt: string;
}

/**
 * The shape a caller passes to `doughLog.add` — the store generates `id` and
 * `createdAt`. `bakedAt` is caller-supplied (it can differ from when the log is written).
 */
export type NewDoughLogEntry = Omit<DoughLogEntry, 'id' | 'createdAt'>;
