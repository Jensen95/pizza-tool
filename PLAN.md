# Pizza Tool PWA - Implementation Plan

## Overview
Convert Excel-based pizza tool (PizzaTool 14.6.xlsm) to a Progressive Web App using Svelte. The PWA will include 20+ pizza dough recipes, an ingredient calculator, and fermentation timers with notifications.

**Language**: Danish only
**Design**: Clean and minimal
**No backend required** - Pure client-side with localStorage

---

## What We're Building

### Core Features
1. **Recipe Browser** - 20+ pizza dough recipes organized by category (Neapolitan, NY style, poolish, biga, etc.)
2. **Ingredient Calculator** - Scale recipes using baker's percentages based on number of pizzas or dough weight
3. **Fermentation Timers** - Multiple named timers (Dag 1, Dag 2, autolyse) with push notifications
4. **Reference Library** - Flour types, sauce recipes, toppings, tips (from Excel reference sheets)

### PWA Capabilities
- Install to home screen
- Works offline
- Push notifications for timer completion
- Responsive mobile-first design

---

## Implementation Phases

### Phase 1: Project Setup
**Goal**: Create SvelteKit project with PWA configuration

1. Initialize SvelteKit project with TypeScript
   ```bash
   npm create svelte@latest .
   # Choose: Skeleton project, TypeScript, ESLint, Prettier
   ```

2. Install dependencies
   ```bash
   npm install
   npm install -D @sveltejs/adapter-static
   npm install workbox-window
   ```

3. Configure for PWA:
   - Create `static/manifest.json` with Danish metadata
   - Create `static/service-worker.js` for offline support
   - Set up static adapter for deployment
   - Create PWA icons (72, 96, 128, 144, 192, 512px)

4. Set up project structure:
   ```
   src/
   ├── lib/
   │   ├── components/     (recipe, timer, reference, ui folders)
   │   ├── stores/         (recipes, timers, calculator, preferences)
   │   ├── data/           (recipe JSONs, reference data)
   │   ├── utils/          (baker-percentage, timer-manager, storage, notification)
   │   └── types/          (recipe, timer, ingredient, reference)
   ├── routes/             (SvelteKit pages)
   └── app.css             (global styles)
   ```

5. Create TypeScript type definitions (see Phase 2 for details)

**Files Created**:
- `svelte.config.js`, `vite.config.js`, `tsconfig.json`
- `static/manifest.json`, `static/service-worker.js`
- All folder structure

---

### Phase 2: Data Model & Types
**Goal**: Define TypeScript schemas for recipes, timers, and reference data

1. Create **`src/lib/types/recipe.ts`**
   - `Recipe` interface: id, name, nameDa, category, ingredients, schedule, etc.
   - `RecipeIngredient`: name, nameDa, percentage, type, stage
   - `FermentationSchedule` & `FermentationStage`: multi-day schedules with timers
   - `RecipeCategory` type: neapolitan, ny-style, poolish, biga, sourdough, detroit

2. Create **`src/lib/types/timer.ts`**
   - `Timer` interface: id, name, startTime, duration, endTime, status, notifications
   - `TimerStatus`: active, paused, completed, cancelled

3. Create **`src/lib/types/reference.ts`**
   - `FlourType`: name, protein %, W value, brand, notes
   - `SauceRecipe`: ingredients, instructions, yield
   - `Topping`: name, category, suggested amount

4. Create **`src/lib/types/ingredient.ts`**
   - `ScaledIngredient`: calculated weights from baker's percentages
   - `CalculatorState`: recipe, numberOfPizzas, doughBallWeight, results

**Files Created**:
- `src/lib/types/recipe.ts`
- `src/lib/types/timer.ts`
- `src/lib/types/reference.ts`
- `src/lib/types/ingredient.ts`

---

### Phase 3: Data Extraction from Excel
**Goal**: Extract all 20+ recipes and reference data from .xlsm file into JSON

**Approach**: Manual extraction for accuracy (20 recipes is manageable)

1. **Recipe Extraction** (one recipe at a time):
   - Open Excel file, navigate to recipe sheet (e.g., "Vito poolish")
   - Identify:
     - Ingredients with percentages
     - Fermentation schedule (Dag 1, Dag 2, etc.)
     - Temperatures and durations
     - Notes and instructions
   - Create JSON file in `src/lib/data/recipes/[recipe-id].json`
   - Follow schema from `recipe.ts` types

2. **Recipe Priority Order**:
   - Start with 3-5 most popular/simple recipes to establish pattern
   - Examples: Vito poolish, NY style, BK variants
   - Then add remaining recipes

3. **Reference Data Extraction**:
   - `Mel` sheet → `src/lib/data/reference/flour-types.json`
   - `Tomatsauce` sheet → `sauce-recipes.json`
   - `Toppings` sheet → `toppings.json`
   - `Gær` sheet → `yeast-info.json`
   - `Tips` sheet → `tips.json`

4. **Create Recipe Index**:
   - `src/lib/data/recipes/index.ts` - exports all recipes as array
   - Grouped by category for easy filtering

5. **Validation**:
   - Verify baker's percentages sum correctly
   - Test sample calculations against Excel
   - Ensure all required fields present

**Files Created**:
- `src/lib/data/recipes/vito-poolish.json` (and 20+ more)
- `src/lib/data/recipes/index.ts`
- `src/lib/data/reference/*.json` (5-6 files)

**Note**: This is the most time-consuming phase but ensures data accuracy.

---

### Phase 4: Core Utilities
**Goal**: Implement baker's percentage calculations and helper functions

1. Create **`src/lib/utils/baker-percentage.ts`**
   ```typescript
   // Calculate ingredient weight from flour weight and percentage
   calculateIngredientWeight(flourWeight: number, percentage: number): number

   // Calculate total flour needed for target dough weight
   calculateTotalFlour(numberOfPizzas, doughBallWeight, totalPercentage): number

   // Scale entire recipe to desired number of pizzas
   scaleRecipe(recipe, numberOfPizzas, targetDoughBallWeight): ScaledIngredient[]
   ```
   **Critical**: These calculations must match Excel formulas exactly

2. Create **`src/lib/utils/storage.ts`**
   - Wrapper for localStorage with type safety
   - Methods: `get<T>()`, `set<T>()`, `remove()`, `clear()`
   - Error handling and browser checks

3. Create **`src/lib/utils/timer-manager.ts`**
   - `TimerManager` class
   - Check active timers every minute
   - Trigger notifications when timers complete
   - Calculate time remaining
   - Persist timer state

4. Create **`src/lib/utils/notification.ts`**
   - Request notification permission
   - Send notifications with Danish text
   - Handle notification clicks
   - Check permission status

**Files Created**:
- `src/lib/utils/baker-percentage.ts`
- `src/lib/utils/storage.ts`
- `src/lib/utils/timer-manager.ts`
- `src/lib/utils/notification.ts`

---

### Phase 5: State Management (Svelte Stores)
**Goal**: Create reactive stores for app state

1. Create **`src/lib/stores/recipes.ts`**
   - `recipes` - readable store of all recipes (from data/recipes/index)
   - `recipesByCategory` - derived store grouping by category
   - `getRecipeById(id)` - helper function

2. Create **`src/lib/stores/timers.ts`**
   - `timers` - writable store with localStorage persistence
   - Methods: `add()`, `remove()`, `updateStatus()`, `pause()`, `resume()`
   - `activeTimers` - derived store (status === 'active')
   - Auto-save to localStorage on every update

3. Create **`src/lib/stores/calculator.ts`**
   - `calculator` - writable store
   - State: selectedRecipe, numberOfPizzas, doughBallWeight, scaledIngredients
   - Methods: `setRecipe()`, `setNumberOfPizzas()`, `setDoughBallWeight()`
   - Auto-recalculate on changes

4. Create **`src/lib/stores/preferences.ts`**
   - `preferences` - persisted store
   - Settings: theme, defaultPizzaCount, defaultDoughWeight, notificationsEnabled

**Files Created**:
- `src/lib/stores/recipes.ts`
- `src/lib/stores/timers.ts`
- `src/lib/stores/calculator.ts`
- `src/lib/stores/preferences.ts`

---

### Phase 6: UI Components
**Goal**: Build reusable Svelte components

#### Recipe Components
1. **`RecipeCard.svelte`** - Compact card for recipe list (name, category, time)
2. **`RecipeList.svelte`** - Grid of recipe cards with filtering
3. **`RecipeDetail.svelte`** - Full recipe display with ingredients and schedule
4. **`IngredientCalculator.svelte`** - Input controls + scaled ingredient table

#### Timer Components
5. **`TimerCard.svelte`** - Individual timer display (countdown, controls)
6. **`TimerCreator.svelte`** - Form to create new timer
7. **`TimerList.svelte`** - Display all active/completed timers
8. **`FermentationSchedule.svelte`** - Timeline view of recipe stages with "Set Timer" buttons

#### Reference Components
9. **`FlourReference.svelte`** - Table of flour types with properties
10. **`SauceRecipes.svelte`** - List of tomato sauce recipes
11. **`ToppingsLibrary.svelte`** - Grid of topping options

#### UI Components
12. **`Navigation.svelte`** - Bottom tab bar (Opskrifter, Beregner, Timere, Reference)
13. **`Header.svelte`** - App header with title and active timer indicator
14. **`Modal.svelte`** - Reusable modal dialog

**Files Created**: 14 component files in `src/lib/components/`

**Design Guidelines**:
- Clean, minimal styling
- Mobile-first responsive
- Danish labels throughout
- Use Tailwind CSS or simple CSS variables

---

### Phase 7: Pages & Routing
**Goal**: Create SvelteKit routes for navigation

1. **`src/routes/+layout.svelte`**
   - Root layout with Header and Navigation
   - Load global stores
   - Start TimerManager

2. **`src/routes/+page.svelte`** - Home page
   - Display RecipeList component
   - Filter by category
   - Search functionality

3. **`src/routes/recipe/[id]/+page.svelte`** - Recipe detail
   - Load recipe by ID from URL
   - Display RecipeDetail component
   - IngredientCalculator
   - FermentationSchedule with quick timer actions

4. **`src/routes/calculator/+page.svelte`** - Calculator page
   - Standalone calculator interface
   - Recipe selector
   - Results display

5. **`src/routes/timers/+page.svelte`** - Timer management
   - TimerList (active and completed)
   - TimerCreator
   - Quick presets

6. **`src/routes/reference/+page.svelte`** - Reference library
   - Tabs for Flour, Sauce, Toppings, Tips
   - Display reference components

**Files Created**: 6 page files in `src/routes/`

---

### Phase 8: PWA Features
**Goal**: Implement offline support and notifications

1. **Service Worker** (`static/service-worker.js`):
   - Cache app shell (HTML, CSS, JS)
   - Cache recipe data files
   - Cache-first strategy for assets
   - Network-first for dynamic data
   - Offline fallback page

2. **Manifest** (`static/manifest.json`):
   ```json
   {
     "name": "Pizza Tool",
     "short_name": "Pizza",
     "description": "Pizza dej opskrifter og beregner",
     "start_url": "/",
     "display": "standalone",
     "theme_color": "#d32f2f",
     "background_color": "#ffffff",
     "lang": "da"
   }
   ```

3. **Icons**: Create and add to `static/icons/`
   - 72x72, 96x96, 128x128, 144x144, 192x192, 384x384, 512x512

4. **Notification Permissions**:
   - Request on first timer creation
   - Store preference
   - Graceful degradation if denied

5. **Timer Notifications**:
   - Send notification when timer completes
   - Show timer name and duration
   - Click notification → open app to timers page
   - Vibration pattern (if supported)

**Files Modified/Created**:
- `static/service-worker.js`
- `static/manifest.json`
- `static/icons/*.png`
- Update `src/app.html` to link manifest

---

### Phase 9: Styling & Polish
**Goal**: Apply clean, minimal design

1. **Global Styles** (`src/app.css`):
   - CSS variables for colors, spacing, typography
   - Danish-optimized font stack
   - Responsive breakpoints
   - Dark mode support (optional)

2. **Color Scheme**:
   ```css
   --color-primary: #d32f2f;      /* Tomato red for accents */
   --color-background: #fafafa;   /* Light gray */
   --color-surface: #ffffff;      /* White cards */
   --color-text: #212121;         /* Dark text */
   ```

3. **Component Styling**:
   - Consistent spacing and typography
   - Touch-friendly buttons (min 44x44px)
   - Focus indicators for accessibility
   - Loading states
   - Empty states

4. **Responsive Design**:
   - Mobile: Single column, bottom nav
   - Tablet: Two columns for recipe list
   - Desktop: Sidebar navigation option

**Files Modified**: All component files + `src/app.css`

---

### Phase 10: Testing & Deployment
**Goal**: Verify functionality and deploy

#### Manual Testing Checklist
1. **Recipe Features**:
   - [ ] All 20+ recipes load correctly
   - [ ] Recipe details display properly
   - [ ] Category filtering works
   - [ ] Search finds recipes

2. **Calculator**:
   - [ ] Scaling calculations match Excel (test with known values)
   - [ ] Works for all recipes
   - [ ] Updates in real-time
   - [ ] Edge cases (0 pizzas, very large batches)

3. **Timers**:
   - [ ] Create timer from recipe
   - [ ] Create custom timer
   - [ ] Countdown updates every second
   - [ ] Notifications send when complete
   - [ ] Timers persist across page refresh
   - [ ] Multiple timers work simultaneously
   - [ ] Pause/resume functionality

4. **PWA**:
   - [ ] Install prompt appears (mobile/desktop)
   - [ ] App works offline after first load
   - [ ] Icons display correctly
   - [ ] Manifest loads properly

5. **Reference Data**:
   - [ ] Flour types display
   - [ ] Sauce recipes readable
   - [ ] Toppings library complete

#### Deployment
1. Build for production:
   ```bash
   npm run build
   ```

2. Deploy options:
   - **Netlify** (recommended): Connect GitHub repo, auto-deploy
   - **Vercel**: Similar to Netlify
   - **GitHub Pages**: Static hosting
   - **Local hosting**: Serve from `build/` directory

3. Test deployed version:
   - Lighthouse PWA audit (aim for 90+ score)
   - Test on multiple devices (iOS, Android, desktop)
   - Verify notifications work

---

## Critical Files Summary

These files are essential to the implementation, in order of creation:

1. **`src/lib/types/recipe.ts`** - Defines entire data model
2. **`src/lib/utils/baker-percentage.ts`** - Core calculation logic
3. **`src/lib/data/recipes/vito-poolish.json`** - First recipe to establish pattern
4. **`src/lib/stores/recipes.ts`** - Recipe state management
5. **`src/lib/stores/timers.ts`** - Timer state with persistence
6. **`src/lib/components/recipe/IngredientCalculator.svelte`** - Main calculator UI
7. **`src/lib/components/timer/TimerCard.svelte`** - Timer display and controls
8. **`src/routes/+layout.svelte`** - App shell and navigation
9. **`static/service-worker.js`** - Offline support
10. **`static/manifest.json`** - PWA configuration

---

## Data Extraction Strategy

### Recipe Extraction Process (Per Recipe)
For each of the 20+ recipe sheets in Excel:

1. Open worksheet (e.g., "Vito poolish")
2. Document recipe structure:
   - Ingredients section location
   - Percentages (look for cells with %)
   - Fermentation schedule (Dag 1, Dag 2)
   - Temperature and time values
3. Create JSON following this template:

```json
{
  "id": "vito-poolish",
  "name": "Vito Poolish",
  "nameDa": "Vito Poolish",
  "category": "poolish",
  "baseWeight": 250,
  "hydration": 65,
  "yieldPizzas": 4,
  "schedule": {
    "stages": [
      {
        "name": "Dag 1 - Poolish",
        "nameDa": "Dag 1 - Poolish",
        "duration": 1440,
        "temperature": 20,
        "canSetTimer": true
      }
    ],
    "totalTime": 1920
  },
  "ingredients": [
    {
      "name": "Mel (Poolish)",
      "nameDa": "Mel (Poolish)",
      "percentage": 50,
      "type": "flour",
      "stage": "poolish"
    }
  ]
}
```

4. Validate:
   - Sum of ingredient percentages
   - Hydration calculation (water/flour * 100)
   - Total time matches sum of stage durations

### Reference Data Extraction
- Manually transcribe reference sheets to JSON
- Simpler structure (just arrays of objects)
- Verify all data included

---

## Verification Plan

### Calculator Accuracy Test
1. Choose 3-4 recipes
2. For each recipe:
   - Input same parameters in Excel and PWA
   - Compare calculated ingredient weights
   - Verify they match exactly (allow ±1g rounding)

### Timer Functionality Test
1. Create timer with 2-minute duration
2. Verify countdown updates every second
3. Close browser, reopen - timer should still be running
4. Wait for completion - notification should appear
5. Verify notification text is in Danish

### Offline Test
1. Load app while online
2. Disconnect network
3. Navigate to different pages - should work
4. View recipes - data should display
5. Create timer - should work and persist

---

## Estimated Development Flow

1. **Setup & Types** (1-2 sessions): Phases 1-2
2. **Data Extraction** (2-3 sessions): Phase 3 (most time-consuming)
3. **Core Logic** (1-2 sessions): Phases 4-5 (utilities and stores)
4. **UI Development** (3-4 sessions): Phases 6-7 (components and pages)
5. **PWA & Polish** (1-2 sessions): Phases 8-9
6. **Testing & Deploy** (1 session): Phase 10

**Total**: 9-14 development sessions

---

## Success Criteria

The implementation is complete when:

✅ All 20+ recipes accessible and display correctly
✅ Ingredient calculator scales recipes accurately (matches Excel)
✅ Timers work reliably with notifications
✅ App installs as PWA on mobile devices
✅ Works offline after first load
✅ Reference data (flour, sauce, toppings) accessible
✅ Danish language throughout
✅ Clean, minimal, mobile-friendly design
✅ All data persists across sessions (localStorage)

---

## Notes

- **Manual data extraction** is feasible for 20 recipes and ensures accuracy
- **Baker's percentage calculations** are critical - must match Excel exactly
- **Timer persistence** requires timestamp-based logic (not interval-based)
- **Notifications** require user permission - handle gracefully if denied
- **Offline-first** approach means app should work without network after initial load
- **Danish language** is primary - all UI text, labels, and content in Danish
