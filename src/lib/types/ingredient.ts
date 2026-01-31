import type { RecipeIngredient, FermentationStage } from './recipe';

export interface ScaledIngredient {
	id: string;
	name: string;
	nameDa: string;
	percentage: number;
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
	scaledIngredients: ScaledIngredient[];
}

export interface CalculatorInput {
	numberOfPizzas: number;
	doughBallWeight: number;
}

export const defaultCalculatorState: CalculatorState = {
	recipeId: null,
	numberOfPizzas: 4,
	doughBallWeight: 250,
	totalDoughWeight: 1000,
	totalFlourWeight: 0,
	scaledIngredients: []
};

export const defaultCalculatorInput: CalculatorInput = {
	numberOfPizzas: 4,
	doughBallWeight: 250
};
