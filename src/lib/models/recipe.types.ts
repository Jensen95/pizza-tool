// ABOUTME: Core recipe type definitions — mixing steps + timeline model
import type { YeastInfo } from './reference.types';

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

interface BaseIngredient {
	id: string;
	name: string;
	nameDa: string;
	percentage: number;
	notes?: string;
}

export interface YeastIngredient extends BaseIngredient {
	type: 'yeast';
	yeastType: YeastInfo['type'];
}

interface SimpleIngredient extends BaseIngredient {
	type: Exclude<IngredientType, 'yeast'>;
}

export type RecipeIngredient = YeastIngredient | SimpleIngredient;

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
	baseWeight: number;
	hydration: number;
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
