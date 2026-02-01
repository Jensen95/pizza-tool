# Baker's Percentage Testing - Predough Examples

This document demonstrates how the baker's percentage calculations work with predough stages and adjustable percentages.

## Understanding Baker's Percentage

In baker's percentage, flour is always 100%, and all other ingredients are expressed as a percentage of the total flour weight.

### Example: Simple Recipe

- Flour: 100% (base)
- Water: 65%
- Salt: 2.7%
- Total: 167.7%

For 4 pizzas at 270g each:

- Total dough: 1080g
- Flour weight: 1080 × 100 / 167.7 = 643g
- Water: 643g × 0.65 = 418g
- Salt: 643g × 0.027 = 17g

## Predough Scenarios

### Scenario 1: 100% Biga Recipe

When ALL flour goes into the predough (biga):

```
Biga Stage (prepared 24h before):
- Flour: 100% (all flour)
- Water: 44%
- Yeast: 0.1%

Main Dough Stage:
- Water: 21% (additional)
- Salt: 2.7%

Total Percentage: 167.8%
```

**For 4 pizzas at 270g:**

- Total flour: 643g (ALL goes into biga)
- Biga flour: 643g
- Biga water: 283g
- Main water: 135g
- Salt: 17g

### Scenario 2: 50% Poolish Recipe

When HALF the flour goes into poolish:

```
Poolish Stage (prepared 12-24h before):
- Flour: 50% (half of total flour)
- Water: 50% (100% hydration in poolish)
- Yeast: 0.1%

Main Dough Stage:
- Flour: 50% (remaining half)
- Water: 20% (additional)
- Salt: 2.5%

Total Percentage: 172.6%
```

**For 4 pizzas at 270g:**

- Total flour: 625g (split 50/50)
- Poolish flour: 313g
- Poolish water: 313g (100% hydration in poolish)
- Main flour: 312g
- Main water: 125g
- Salt: 16g

### Scenario 3: Adjusting Predough Percentage (100% → 50%)

**Converting a 100% biga recipe to use only 50% predough:**

Original (100% biga):

```
Biga: 100% flour, 44% water
Main: 21% water, 2.7% salt
```

Adjusted (50% biga):

```
Biga: 50% flour, 22% water (half of original biga)
Main: 50% flour (new), 43% water, 2.7% salt
```

**Key Points:**

- Total flour remains 100%
- Biga water reduced proportionally (44% → 22%)
- Main dough water increased to maintain total hydration (21% → 43%)
- Total hydration stays the same: 65% (22% + 43% = 65%)

### Scenario 4: Adjusting from 100% to 30% Predough

Original (100% poolish):

```
Poolish: 100% flour, 50% water
Main: 15% water, 2.5% salt
Total hydration: 65%
```

Adjusted (30% poolish):

```
Poolish: 30% flour, 15% water
Main: 70% flour, 50% water, 2.5% salt
Total hydration: 65% (maintained)
```

## Test Coverage

Our unit tests verify:

1. ✅ Basic calculations for all ingredient types
2. ✅ Recipes with 100% flour in predough
3. ✅ Recipes with 50% flour in predough
4. ✅ Adjusting predough percentages (100% → 50%, 100% → 30%)
5. ✅ Hydration calculations with multiple water sources
6. ✅ Multi-stage recipes (autolyse, poolish, biga)
7. ✅ Scaling to different pizza counts
8. ✅ Recipe validation

All 33 unit tests pass, ensuring accurate calculations for any combination of predough percentages.

## Usage in the App

Users can:

1. Select a recipe with predough (biga, poolish, etc.)
2. Adjust the number of pizzas
3. Modify ingredient percentages (including predough amounts)
4. See real-time weight calculations
5. Maintain proper hydration ratios

The calculator handles all the math automatically, ensuring accurate scaling for any recipe configuration.
