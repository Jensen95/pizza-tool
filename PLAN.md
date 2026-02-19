# Plan: Recipe data model migration (Option D)

## Goal

Replace the redundant `ingredient.stage` + `scheduleStage.ingredientStage` model with a cleaner separation: **mixing steps** (what ingredients) and **timeline** (when and how to combine them). Extract granular procedural steps from Excel source data.

## New data model

```typescript
// Ingredients no longer have a 'stage' field
interface RecipeIngredient {
	id: string;
	name: string;
	nameDa: string;
	percentage: number;
	type: IngredientType;
	notes?: string;
}

// Replaces the ingredient grouping — owns the ingredients
interface MixingStep {
	id: string;
	name: string;
	nameDa: string;
	predough?: boolean; // replaces isPredoughStage() heuristic
	ingredients: RecipeIngredient[];
}

// Replaces FermentationScheduleStage — granular procedural steps
interface TimelineStep {
	id: string;
	section?: string; // day header: "Dag 1 - Poolish"
	instructionsDa: string;
	ingredients?: string[]; // ingredient IDs used in this step
	duration?: number; // minutes (wait/rest steps only)
	temperature?: number;
	location?: 'room' | 'fridge' | 'warm';
	canSetTimer?: boolean;
	tipDa?: string; // contextual tip for this step
}

// Updated Recipe — flat mixingSteps + timeline replaces ingredients[] + schedule{}
interface Recipe {
	id: string;
	name: string;
	nameDa: string;
	category: RecipeCategory;
	yeastType?: YeastInfo['type'];
	baseWeight: number;
	hydration: number;
	yieldPizzas: number;
	mixingSteps: MixingStep[]; // replaces ingredients[]
	timeline: TimelineStep[]; // replaces schedule.stages[]
	tipsDa?: string[];
	source?: string;
}
```

### Removed

- `RecipeIngredient.stage`
- `FermentationScheduleStage` (replaced by `TimelineStep`)
- `FermentationSchedule` wrapper (stages + totalTime)
- `FermentationStage` type union
- `PREDOUGH_STAGES` constant
- `isPredoughStage()` function
- `ingredientStage` field

### Added

- `MixingStep` with `predough` boolean
- `TimelineStep` with `section`, `ingredients[]` refs, `tipDa`
- `totalTime` derived: `timeline.filter(s => s.duration).reduce(...)`

---

## Execution phases

### Phase 1: Research Roma recipes [DONE]

Web research for correct detailed procedures:

- **Gabriele Bonci** pizza teglia al taglio — autolyse, folding, cold ferment, pan proof
- **Piergiorgio Giorilli** biga-based teglia — biga method, mixing, folding, cold ferment

### Phase 1b: Extract recipe text data from Excel [DONE]

All 21 non-Roma recipes extracted from PizzaTool-14.6.xlsm into `recipes/*.txt`.
Source data now available for all recipes.

**Follow-up task:** Extract custom/advanced recipe details (specific flour types, temperature curves, customization options) from Excel in a later pass.

### Phase 2: Update types & utility functions

**Files:**

- `src/lib/types/recipe.ts` — add `MixingStep`, `TimelineStep`, update `Recipe`, remove old types
- `src/lib/types/ingredient.ts` — update `ScaledIngredient` (remove `stage`), `FlourBlendInfo`
- `src/lib/utils/baker-percentage.ts` — replace `isPredoughStage()` with `mixingStep.predough`, update `scaleRecipe()`, helper functions to derive flat ingredient list from `mixingSteps`
- `src/lib/utils/yeast.ts` — iterate `mixingSteps[].ingredients` instead of flat `ingredients[]`

### Phase 3: Migrate all 22 recipe JSON files

Convert each recipe to new model. User pastes Excel data, I extract granular timeline.

**Batch order** (by complexity, simple first to establish patterns):

**Batch A — Simple direct doughs (7 recipes):**

1. `bk-napoli.json`
2. `bk-handaelt.json`
3. `bk-bageenzym.json`
4. `bk-gluten-free.json`
5. `gorms-pizza.json`
6. `umuts-pizza.json`
7. `seb-24t.json`

**Batch B — NY style (3 recipes):** 8. `ny-style.json` 9. `ny-pizzapal.json` 10. `ppah-ny.json`

**Batch C — Direct with autolyse/special (2 recipes):** 11. `bk-detroit.json` 12. `bk-surdej.json`

**Batch D — Poolish predoughs (5 recipes):** 13. `bk-poolish.json` 14. `vito-poolish.json` 15. `vito-poolish-autolysis.json` 16. `vito-poolish-double.json` 17. `tony-tiga-poolish.json`

**Batch E — Biga predoughs (3 recipes):** 18. `bk-biga-v1.json` 19. `bk-biga-v2.json` 20. `seb-biga.json`

**Batch F — Roma teglia (2 recipes, from research):** 21. `roma-teglia-bonci.json` 22. `roma-teglia-biga-giorilli.json`

### Phase 4: Update components

- `FermentationSchedule.svelte` — iterate `timeline`, render `section` headers, look up ingredients from `mixingSteps` by ID, show `tipDa`
- `IngredientCalculator.svelte` — iterate `mixingSteps` for grouping
- `DoughControls.svelte` — update flour blend stage references
- `RecipeCard.svelte` — derive totalTime from timeline, ingredient count from mixingSteps
- `RecipeDetail.svelte` — check for any schedule references

### Phase 5: Update stores

- `calculator.ts` — update scaling logic for `mixingSteps`
- `customizations.ts` — update history types if needed
- `recipes.ts` — minimal changes

### Phase 6: Update tests (14 test files)

All test fixtures use the old `ingredients[]` + `schedule.stages[]` shape. Update to `mixingSteps[]` + `timeline[]`.

### Phase 7: Verify & clean up

- `npm test` — all tests pass
- `npm run lint` — no errors
- `npm run format` — consistent formatting
- Manual spot-check: pick 2-3 recipes, verify UI renders correctly

---

## Workflow for Phase 3 (recipe migration)

All source data is in `recipes/*.txt` files. For each batch:

1. Read the txt files + existing JSON for that batch
2. Convert each to the new model with granular timeline steps
3. Move to the next batch

Roma recipes (Batch F) use research data instead of txt files.

---

## Total scope

- ~40 files changed
- 22 recipe JSONs rewritten
- 5 components updated
- 3 stores updated
- 14 test files updated
- 3 utility files updated
- 2 type files updated
