// ABOUTME: Calculator and ingredient types for scaling recipes and UI controls
import type { RecipeIngredient, IngredientType } from './recipe.types';
import type { FlourType, YeastInfo } from './reference.types';

export interface ScaledIngredient {
	id: string;
	name: string;
	nameDa: string;
	percentage: number; // percentage relative to total flour
	stagePercentage: number; // percentage relative to mixing step flour (for predough display)
	weight: number; // calculated weight in grams
	type: RecipeIngredient['type'];
	mixingStepId: string;
	notes?: string;
}

export interface CalculatorState {
	recipeId: string | null;
	numberOfPizzas: number;
	doughBallWeight: number;
	totalDoughWeight: number;
	totalFlourWeight: number;
	hydration: number | null; // custom hydration override (null = use recipe default)
	predoughRatio: number | null; // ratio of predough to total flour (e.g., 0.2 = 20%)
	yeastType: YeastInfo['type'] | null;
	scaledIngredients: ScaledIngredient[];
	customFlours: Record<string, CustomFlour[]>;
}

export interface CalculatorInput {
	numberOfPizzas: number;
	doughBallWeight: number;
	hydration?: number | null;
	predoughRatio?: number | null;
}

export interface ControllableIngredient {
	id: string;
	name: string;
	nameDa: string;
	type: IngredientType;
	percentage: number;
	originalPercentage: number;
	min: number;
	max: number;
	step: number;
}

export interface FlourBlendInfo {
	mixingStepId: string;
	flours: { id: string; name: string; nameDa: string; percentage: number }[];
}

export interface ExtraIngredientInfo {
	id: string;
	name: string;
	nameDa: string;
	type: IngredientType;
	mixingStepId?: string;
	percentage: number;
	originalPercentage: number;
}

export interface RecipeControls {
	hydration: number;
	predoughRatio: number | null;
	flours: FlourBlendInfo[];
	extras: ExtraIngredientInfo[];
}

export const defaultCalculatorState: CalculatorState = {
	recipeId: null,
	numberOfPizzas: 4,
	doughBallWeight: 250,
	totalDoughWeight: 1000,
	totalFlourWeight: 0,
	hydration: null,
	predoughRatio: null,
	yeastType: null,
	scaledIngredients: [],
	customFlours: {}
};

export const defaultCalculatorInput: CalculatorInput = {
	numberOfPizzas: 4,
	doughBallWeight: 250,
	hydration: null,
	predoughRatio: null
};

export interface CustomFlour {
	flourId: string;
	flourTypeId: string;
	percentage: number;
	customName?: string;
	flourType?: FlourType['type'];
}

export type CustomFlourState = Record<string, Record<string, CustomFlour[]>>;
