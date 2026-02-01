import type { RecipeIngredient, FermentationStage } from './recipe';

export interface ScaledIngredient {
	id: string;
	name: string;
	nameDa: string;
	percentage: number; // percentage relative to total flour
	stagePercentage: number; // percentage relative to stage flour (for predough display)
	weight: number; // calculated weight in grams
	type: RecipeIngredient['type'];
	stage?: FermentationStage;
	notes?: string;
}

export interface CalculatorState {
	recipeId: string | null;
	numberOfPizzas: number;
	doughBallWeight: number;
	totalDoughWeight: number;
	totalFlourWeight: number;
	predoughRatio: number | null; // ratio of predough to total flour (e.g., 0.2 = 20%)
	scaledIngredients: ScaledIngredient[];
}

export interface CalculatorInput {
	numberOfPizzas: number;
	doughBallWeight: number;
	predoughRatio?: number | null;
}

export const defaultCalculatorState: CalculatorState = {
	recipeId: null,
	numberOfPizzas: 4,
	doughBallWeight: 250,
	totalDoughWeight: 1000,
	totalFlourWeight: 0,
	predoughRatio: null,
	scaledIngredients: []
};

export const defaultCalculatorInput: CalculatorInput = {
	numberOfPizzas: 4,
	doughBallWeight: 250,
	predoughRatio: null
};
