# Recipe Extraction Summary

## Overview

This document summarizes the recipe extraction process from the Excel file `PizzaTool-14.6.xlsm` and the discovery of multiple recipe variants within single sheets.

## Excel File Structure

The Excel file contains **29 sheets** organized as follows:

### Recipe Sheets (18 total)

1. Vito poolish
2. Gorms pizzadej
3. Umuts pizzadej
4. Tony tiga+poolish
5. Seb_24t
6. Seb_biga
7. PPAH_NY
8. NY style
9. NY_PizzaPal
10. BK_Handaelt
11. BK_napoli
12. BK_poolish
13. BK_surdej
14. BK_bageenzym
15. BK_biga_v1
16. BK_biga_v2
17. BK_detroit
18. BK_glut_h

### Reference Sheets (11 total)

- HJEM (Home page)
- Spread
- Beregnere (Calculators)
- Tomatsauce (Tomato sauce)
- Mel (Flour types)
- Gær (Yeast info)
- Vand (Water)
- Øvrigt (Other)
- Toppings
- Skaler (Scales)
- Tips

## Multiple Recipes Per Sheet Discovery

### Vito Poolish Sheet

The **"Vito poolish"** sheet was found to contain **3 distinct recipe variants**:

1. **Basic Poolish** (20-28 hours)
   - Simple poolish method
   - Already extracted as `vito-poolish.json`

2. **Poolish + Autolysis** (26-34 hours)
   - Combines poolish with autolysis technique
   - **Newly extracted** as `vito-poolish-autolysis.json`
   - Includes a separate autolysis stage before mixing with poolish

3. **Poolish Double Fermented** (37-53 hours)
   - Extended fermentation with two cold rises
   - **Newly extracted** as `vito-poolish-double.json`
   - Includes 16-24 hour cold fermentation after mixing

### Column Layout in Excel

The Vito poolish sheet uses different columns for each variant:

- **Column 24**: Basic Poolish (Simpel)
- **Column 28**: Poolish Double Fermented (Udførlig)
- **Column 29**: Poolish + Autolysis (Udførlig)

Each column contains:

- Complete ingredient lists
- Detailed step-by-step instructions in Danish
- Timing information
- Temperature guidelines

## Recipe Validation

All recipes were validated to ensure:

1. ✓ Flour percentages sum to exactly 100%
2. ✓ All ingredients have valid percentages
3. ✓ Key values match Excel calculations:
   - Hydration: 64.52% (rounded to 65%)
   - Salt: 2.60%
   - Yeast: 0.32%
   - Honey: 0.32%
   - Poolish flour: 19.35%

### Validation Results

**All 20 recipes validated successfully:**

- 18 original recipes
- 2 new Vito poolish variants

Total baker's percentages range from 163.50% to 181.40%, which is normal as they include flour (100%) plus all other ingredients.

## Extracted Recipes

### Complete Recipe List (20 total)

#### Poolish Category (5 recipes)

1. vito-poolish.json
2. **vito-poolish-double.json** (NEW)
3. **vito-poolish-autolysis.json** (NEW)
4. tony-tiga-poolish.json
5. bk-poolish.json

#### Biga Category (4 recipes)

6. seb-biga.json
7. bk-biga-v1.json
8. bk-biga-v2.json
9. bk-bageenzym.json

#### NY Style Category (3 recipes)

10. ny-style.json
11. ny-pizzapal.json
12. ppah-ny.json

#### Neapolitan Category (2 recipes)

13. bk-napoli.json
14. bk-handaelt.json

#### Direct Dough Category (2 recipes)

15. gorms-pizza.json
16. umuts-pizza.json

#### Other Categories (4 recipes)

17. seb-24t.json (24-hour recipe)
18. bk-surdej.json (sourdough)
19. bk-detroit.json (Detroit style)
20. bk-gluten-free.json (gluten-free)

## Comparison with Original Data

### Before This Change

- Recipe sheets in Excel: 18
- Extracted recipes: 18
- Ratio: 1:1

### After This Change

- Recipe sheets in Excel: 18
- Extracted recipes: 20
- Ratio: ~1.1:1
- Additional variants found: 2 (both from Vito poolish sheet)

## Comprehensive Analysis of All Recipe Sheets

A systematic analysis of all 18 recipe sheets was performed to identify any additional recipe variants similar to the Vito poolish variants.

### Analysis Method

1. **Automated scanning**: Examined all sheets for multiple column sections with distinct recipes
2. **Deep investigation**: Analyzed 13 sheets that appeared to have multiple column sections
3. **Classification**: Determined if columns contained true recipe variants or helper information

### Findings

#### Helper Columns vs Recipe Variants

Most sheets (12 of 13 analyzed) contain **helper columns** rather than separate recipes. These helper columns typically include:

- **Temperature calculators** (dejtemperatur) - for calculating optimal water temperature
- **Yeast conversion factors** - converting between fresh yeast, dry yeast, and active dry yeast
- **Timing guides** - visual timeline of fermentation stages
- **Optional technique notes** - mentions of autolysis, stretch & fold, etc. as optional steps

#### Sheets with Helper Columns Only

The following 12 sheets contain helper/calculator columns but **no additional recipe variants**:

- Tony tiga+poolish
- Seb_24t
- Seb_biga
- NY style
- BK_Handaelt
- BK_napoli
- BK_poolish
- BK_surdej
- BK_bageenzym
- BK_biga_v1
- BK_biga_v2
- BK_detroit

#### True Recipe Variants Found

Only **one sheet** contains multiple distinct recipe variants:

- **Vito poolish** - Contains 3 distinct recipes:
  1. Basic Poolish (20-28 hours) - already extracted as `vito-poolish.json`
  2. Poolish + Autolysis (26-34 hours) - newly extracted as `vito-poolish-autolysis.json`
  3. Poolish Double Fermented (37-53 hours) - newly extracted as `vito-poolish-double.json`

### Conclusion

After comprehensive analysis of all 18 recipe sheets:

- ✓ **Only the Vito poolish sheet contains multiple distinct recipe variants**
- ✓ **All Vito variants have been successfully extracted**
- ✓ **All other sheets contain single recipes with helper/calculator columns**
- ✓ **BK_biga_v1 and BK_biga_v2 are already properly extracted as separate recipes**

**No additional extraction is required** beyond the Vito poolish variants already completed.

## Recommendations

1. ✓ **Completed**: Extract Vito poolish variants
2. ✓ **Completed**: Validate all recipes against Excel data
3. **Future**: Monitor for user feedback on whether other sheets need variant extraction
4. **Future**: Consider adding a "variant" field to recipe metadata to group related recipes

## Technical Details

### Extraction Method

- Manual extraction using Python + openpyxl library
- Careful analysis of Excel cell layout and formulas
- Validation of baker's percentages and calculations

### File Format

- JSON format with Danish and English fields
- Structured with ingredients, schedule, tips, and source
- Type-safe integration with TypeScript

### Integration

- Added to `src/lib/data/recipes/index.ts`
- Type-checked with `npm run check`
- Build-tested with `npm run build`
- Unit tests pass (46/46)

## Conclusion

The extraction process successfully identified and extracted 2 additional recipe variants from the "Vito poolish" sheet in the Excel file. These recipes represent distinct preparation methods with different fermentation schedules and techniques, making them valuable additions to the recipe library.

All recipes have been validated to match the Excel data and pass TypeScript type checking and unit tests.
