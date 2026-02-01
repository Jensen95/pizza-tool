export type RecipeCategory =
	| 'neapolitan'
	| 'ny-style'
	| 'poolish'
	| 'biga'
	| 'sourdough'
	| 'detroit'
	| 'sicilian'
	| 'roman'
	| 'direct';

export type IngredientType = 'flour' | 'water' | 'yeast' | 'salt' | 'oil' | 'sugar' | 'other';

export type FermentationStage = 'preferment' | 'poolish' | 'biga' | 'autolyse' | 'bulk' | 'ball' | 'final';

export interface RecipeIngredient {
	id: string;
	name: string;
	nameDa: string;
	percentage: number;
	type: IngredientType;
	stage?: FermentationStage;
	notes?: string;
}

export interface FermentationScheduleStage {
	id: string;
	name: string;
	nameDa: string;
	duration: number; // in minutes
	temperature: number; // in Celsius
	temperatureMin?: number;
	temperatureMax?: number;
	location?: 'room' | 'fridge' | 'warm';
	instructions?: string;
	instructionsDa?: string;
	ingredientsDa?: string[]; // ingredients used at this stage
	canSetTimer: boolean;
}

export interface FermentationSchedule {
	stages: FermentationScheduleStage[];
	totalTime: number; // in minutes
	notes?: string;
	notesDa?: string;
}

export interface Recipe {
	id: string;
	name: string;
	nameDa: string;
	description?: string;
	descriptionDa?: string;
	category: RecipeCategory;
	baseWeight: number; // default dough ball weight in grams
	hydration: number; // percentage (e.g., 65 for 65%)
	yieldPizzas: number; // default number of pizzas
	ingredients: RecipeIngredient[];
	schedule: FermentationSchedule;
	tips?: string[];
	tipsDa?: string[];
	source?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface RecipeGroup {
	category: RecipeCategory;
	categoryDa: string;
	recipes: Recipe[];
}

export const categoryLabels: Record<RecipeCategory, string> = {
	neapolitan: 'Napolitansk',
	'ny-style': 'New York Style',
	poolish: 'Poolish',
	biga: 'Biga',
	sourdough: 'Surdej',
	detroit: 'Detroit',
	sicilian: 'Siciliansk',
	roman: 'Romersk',
	direct: 'Direkte dej'
};
