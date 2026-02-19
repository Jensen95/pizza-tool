// ABOUTME: Core recipe type definitions — mixing steps + timeline model
import type { FlourCategory, YeastInfo } from './reference.types';

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

interface IngredientBase {
	id: string;
	percentage: number;
	notes?: string;
}

interface NamedIngredient extends IngredientBase {
	name: string;
	nameDa: string;
}

export interface FlourIngredient extends IngredientBase {
	type: 'flour';
	flourType: FlourCategory;
	flourId?: string;
}

export interface YeastIngredient extends NamedIngredient {
	type: 'yeast';
	yeastType: YeastInfo['type'];
}

interface SimpleIngredient extends NamedIngredient {
	type: Exclude<IngredientType, 'yeast' | 'flour'>;
}

export type RecipeIngredient = FlourIngredient | YeastIngredient | SimpleIngredient;

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
	kneadingDa?: string;
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
