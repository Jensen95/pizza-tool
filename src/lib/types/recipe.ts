// ABOUTME: Core recipe type definitions — mixing steps + timeline model
import type { YeastInfo } from './reference';

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

export interface RecipeIngredient {
	id: string;
	name: string;
	nameDa: string;
	percentage: number;
	type: IngredientType;
	yeastType?: YeastInfo['type'];
	notes?: string;
}

export interface MixingStep {
	id: string;
	name: string;
	nameDa: string;
	predough?: boolean;
	ingredients: RecipeIngredient[];
}

export interface TimelineStep {
	section?: string;
	instructionsDa: string;
	ingredients?: string[];
	duration?: number;
	temperature?: number;
	location?: 'room' | 'fridge' | 'warm';
	canSetTimer?: boolean;
	tipDa?: string;
}

export interface Recipe {
	id: string;
	name: string;
	nameDa: string;
	description?: string;
	descriptionDa?: string;
	category: RecipeCategory;
	yeastType?: YeastInfo['type'];
	baseWeight: number;
	hydration: number;
	yieldPizzas: number;
	mixingSteps: MixingStep[];
	timeline: TimelineStep[];
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
