import { defineCollection, defineConfig } from '@content-collections/core';
import { z } from 'zod';

const contentMetaSchema = z.object({
	collection: z.literal('recipes'),
	id: z.string(),
	slug: z.string(),
	source: z.string(),
	locale: z.string().optional()
});

const recipeIngredientSchema = z.object({
	id: z.string(),
	name: z.string(),
	nameDa: z.string(),
	percentage: z.number(),
	type: z.enum(['flour', 'water', 'yeast', 'salt', 'oil', 'sugar', 'other']),
	stage: z
		.enum(['preferment', 'poolish', 'biga', 'autolyse', 'bulk', 'ball', 'final', 'main'])
		.optional(),
	notes: z.string().optional()
});

const fermentationStageSchema = z.object({
	id: z.string(),
	name: z.string(),
	nameDa: z.string(),
	duration: z.number(),
	temperature: z.number(),
	temperatureMin: z.number().optional(),
	temperatureMax: z.number().optional(),
	location: z.enum(['room', 'fridge', 'warm']).optional(),
	instructions: z.string().optional(),
	instructionsDa: z.string().optional(),
	ingredientsDa: z.array(z.string()).optional(),
	canSetTimer: z.boolean()
});

const fermentationScheduleSchema = z.object({
	stages: z.array(fermentationStageSchema),
	totalTime: z.number(),
	notes: z.string().optional(),
	notesDa: z.string().optional()
});

const recipeSchema = z.object({
	_meta: contentMetaSchema.optional(),
	id: z.string(),
	name: z.string(),
	nameDa: z.string(),
	description: z.string().optional(),
	descriptionDa: z.string().optional(),
	category: z.enum([
		'neapolitan',
		'ny-style',
		'poolish',
		'biga',
		'sourdough',
		'detroit',
		'sicilian',
		'roman',
		'direct'
	]),
	yeastType: z.string().optional(),
	baseWeight: z.number(),
	hydration: z.number(),
	yieldPizzas: z.number(),
	ingredients: z.array(recipeIngredientSchema),
	schedule: fermentationScheduleSchema,
	tips: z.array(z.string()).optional(),
	tipsDa: z.array(z.string()).optional(),
	source: z.string().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional()
});

type ContentMeta = z.infer<typeof contentMetaSchema>;

const recipes = defineCollection({
	name: 'recipes',
	directory: 'src/lib/data/recipes',
	include: '*.json',
	schema: recipeSchema,
	transform: (doc) => ({
		...doc,
		_meta:
			doc._meta ??
			({
				collection: 'recipes',
				id: doc.id,
				slug: doc.id,
				source: `src/lib/data/recipes/${doc.id}.json`
			} satisfies ContentMeta)
	})
});

export default defineConfig({
	content: [recipes]
});
