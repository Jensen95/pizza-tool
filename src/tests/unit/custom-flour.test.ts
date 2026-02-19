import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	addFlourToStage,
	removeFlourFromStage,
	getControllableIngredients
} from '$lib/utils/baker-percentage';
import type { FlatIngredient } from '$lib/utils/baker-percentage';
import type { Recipe } from '$lib/types/recipe';
import type { CustomFlourState } from '$lib/types/ingredient';
import * as storage from '$lib/utils/storage';

class MemoryStorage {
	private store = new Map<string, string>();

	get length() {
		return this.store.size;
	}

	clear() {
		this.store.clear();
	}

	getItem(key: string) {
		return this.store.get(key) ?? null;
	}

	key(index: number) {
		return Array.from(this.store.keys())[index] ?? null;
	}

	removeItem(key: string) {
		this.store.delete(key);
	}

	setItem(key: string, value: string) {
		this.store.set(key, value);
	}
}

const baseRecipe: Recipe = {
	id: 'base',
	name: 'Base',
	nameDa: 'Base',
	category: 'direct',
	baseWeight: 250,
	hydration: 65,
	mixingSteps: [
		{
			id: 'main',
			name: 'Main dough',
			nameDa: 'Hoveddej',
			ingredients: [
				{ id: 'flour', name: 'Flour', nameDa: 'Mel', percentage: 100, type: 'flour' },
				{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' }
			]
		}
	],
	timeline: []
};

const twoFlourRecipe: Recipe = {
	...baseRecipe,
	id: 'two-flour',
	mixingSteps: [
		{
			id: 'main',
			name: 'Main dough',
			nameDa: 'Hoveddej',
			ingredients: [
				{ id: 'main-a', name: 'Main A', nameDa: 'A', percentage: 60, type: 'flour' },
				{ id: 'main-b', name: 'Main B', nameDa: 'B', percentage: 40, type: 'flour' },
				{
					id: 'water',
					name: 'Water',
					nameDa: 'Vand',
					percentage: 65,
					type: 'water'
				}
			]
		}
	],
	timeline: []
};

const predoughRecipe: Recipe = {
	...baseRecipe,
	id: 'predough',
	category: 'poolish',
	mixingSteps: [
		{
			id: 'poolish',
			name: 'Poolish',
			nameDa: 'Poolish',
			predough: true,
			ingredients: [
				{
					id: 'poolish-flour',
					name: 'Poolish flour',
					nameDa: 'Poolish mel',
					percentage: 20,
					type: 'flour'
				},
				{
					id: 'poolish-water',
					name: 'Water',
					nameDa: 'Vand',
					percentage: 20,
					type: 'water'
				}
			]
		},
		{
			id: 'main',
			name: 'Main dough',
			nameDa: 'Hoveddej',
			ingredients: [
				{
					id: 'main-flour',
					name: 'Main flour',
					nameDa: 'Main mel',
					percentage: 80,
					type: 'flour'
				},
				{
					id: 'main-water',
					name: 'Water',
					nameDa: 'Vand',
					percentage: 45,
					type: 'water'
				}
			]
		}
	],
	timeline: []
};

const typedFlourRecipe: Recipe = {
	...baseRecipe,
	id: 'typed-flour',
	mixingSteps: [
		{
			id: 'main',
			name: 'Main dough',
			nameDa: 'Hoveddej',
			ingredients: [
				{ id: 'semola', name: 'Semola', nameDa: 'Semola', percentage: 100, type: 'flour' },
				{ id: 'water', name: 'Water', nameDa: 'Vand', percentage: 65, type: 'water' }
			]
		}
	],
	timeline: []
};

async function loadCalculator() {
	const mod = await import('$lib/stores/calculator');
	return mod.calculator;
}

beforeEach(() => {
	const memoryStorage = new MemoryStorage();
	(globalThis as typeof globalThis & { window?: Window }).window = {
		localStorage: memoryStorage
	} as unknown as Window & typeof globalThis;
	(globalThis as typeof globalThis & { localStorage?: MemoryStorage }).localStorage = memoryStorage;
	storage.clear();
	vi.resetModules();
});

describe('flour helpers', () => {
	it('adds flour to a single-flour stage and keeps total constant', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'flour',
				name: 'Flour',
				nameDa: 'Mel',
				percentage: 100,
				type: 'flour',
				mixingStepId: 'main'
			}
		];

		const result = addFlourToStage(
			ingredients,
			'main',
			{ id: 'semola', name: 'Semola', nameDa: 'Semola' },
			10
		);

		const stageFlours = result.filter((i) => i.type === 'flour');
		expect(stageFlours).toHaveLength(2);
		const total = stageFlours.reduce((sum, flour) => sum + flour.percentage, 0);
		expect(total).toBeCloseTo(100, 2);
		const largest = stageFlours.find((f) => f.id === 'flour');
		expect(largest?.percentage).toBeCloseTo(90, 2);
	});

	it('adds flour to two-flour stage and reduces largest flour', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'a',
				name: 'A',
				nameDa: 'A',
				percentage: 70,
				type: 'flour',
				mixingStepId: 'main'
			},
			{
				id: 'b',
				name: 'B',
				nameDa: 'B',
				percentage: 30,
				type: 'flour',
				mixingStepId: 'main'
			}
		];

		const result = addFlourToStage(
			ingredients,
			'main',
			{ id: 'spelt', name: 'Spelt', nameDa: 'Spelt' },
			15
		);

		const stageFlours = result.filter((i) => i.type === 'flour');
		const a = stageFlours.find((f) => f.id === 'a');
		const spelt = stageFlours.find((f) => f.id.startsWith('custom-flour-main-spelt'));

		expect(stageFlours).toHaveLength(3);
		expect(a?.percentage).toBeCloseTo(55, 2);
		expect(spelt?.percentage).toBeCloseTo(15, 2);
	});

	it('prevents removing the last flour in a stage', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'only',
				name: 'Only',
				nameDa: 'Only',
				percentage: 100,
				type: 'flour',
				mixingStepId: 'main'
			}
		];

		const result = removeFlourFromStage(ingredients, 'main', 'only');
		expect(result).toEqual(ingredients);
	});

	it('removes flour and redistributes proportionally', () => {
		const ingredients: FlatIngredient[] = [
			{
				id: 'a',
				name: 'A',
				nameDa: 'A',
				percentage: 50,
				type: 'flour',
				mixingStepId: 'main'
			},
			{
				id: 'b',
				name: 'B',
				nameDa: 'B',
				percentage: 30,
				type: 'flour',
				mixingStepId: 'main'
			},
			{
				id: 'c',
				name: 'C',
				nameDa: 'C',
				percentage: 20,
				type: 'flour',
				mixingStepId: 'main'
			}
		];

		const result = removeFlourFromStage(ingredients, 'main', 'c');

		const a = result.find((f) => f.id === 'a');
		const b = result.find((f) => f.id === 'b');

		expect(a?.percentage).toBeCloseTo(62.5, 1);
		expect(b?.percentage).toBeCloseTo(37.5, 1);
	});
});

describe('calculator custom flours', () => {
	it('persists added flour types per recipe and stage', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(baseRecipe);

		calculator.addFlourType('main', 'semola', 10);

		const stored = storage.get<CustomFlourState>('custom-flours', {});
		expect(stored[baseRecipe.id]?.main?.[0]?.flourTypeId).toBe('semola');
	});

	it('stores custom flour name and type for custom additions', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(baseRecipe);

		calculator.addFlourType('main', 'custom-nuvola', 10, {
			customName: 'Caputo Nuvola Super',
			flourType: 'whole-wheat'
		});

		const stored = storage.get<CustomFlourState>('custom-flours', {});
		const flour = stored[baseRecipe.id]?.main?.[0];
		expect(flour?.customName).toBe('Caputo Nuvola Super');
		expect(flour?.flourType).toBe('whole-wheat');

		const state = get(calculator);
		const customFlour = state.scaledIngredients.find(
			(i) => i.id === 'custom-flour-main-custom-nuvola'
		);
		expect(customFlour?.nameDa).toBe('Caputo Nuvola Super');
	});

	it('excludes original flour type from available options', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(typedFlourRecipe);

		const available = calculator.getAvailableFlourTypes('main');
		expect(available.find((f) => f.id === 'semola')).toBeUndefined();
	});

	it('removes custom flour and updates storage', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(baseRecipe);
		calculator.addFlourType('main', 'semola', 10);

		calculator.removeFlourType('main', 'custom-flour-main-semola');

		const stored = storage.get<CustomFlourState>('custom-flours', {});
		expect(stored[baseRecipe.id]?.main ?? []).toHaveLength(0);
	});

	it('clears custom flours on resetAllCustomizations', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(baseRecipe);
		calculator.addFlourType('main', 'semola', 10);

		calculator.resetAllCustomizations();

		const stored = storage.get<CustomFlourState>('custom-flours', {});
		expect(stored[baseRecipe.id]).toBeUndefined();
	});

	it('restores custom flours from storage on reload', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(baseRecipe);
		calculator.addFlourType('main', 'semola', 10);

		const storedBefore = storage.get<CustomFlourState>('custom-flours', {});
		expect(storedBefore[baseRecipe.id]?.main?.[0]?.flourTypeId).toBe('semola');

		vi.resetModules();
		const freshCalculator = await loadCalculator();
		freshCalculator.setRecipe(baseRecipe);
		const state = get(freshCalculator);

		expect(state.customFlours.main?.[0]?.flourTypeId).toBe('semola');
	});

	it('keeps custom flours recipe-specific', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(baseRecipe);
		calculator.addFlourType('main', 'semola', 10);

		calculator.setRecipe(twoFlourRecipe);

		const state = get(calculator);
		expect(state.customFlours.main ?? []).toHaveLength(0);
	});

	it('handles predough and main stages independently', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(predoughRecipe);

		calculator.addFlourType('poolish', 'spelt', 5);
		calculator.addFlourType('main', 'semola', 10);

		const state = get(calculator);
		expect(state.customFlours.poolish?.[0]?.flourTypeId).toBe('spelt');
		expect(state.customFlours.main?.[0]?.flourTypeId).toBe('semola');
	});

	it('keeps stage percentages sane when adding flours to predough and main', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(predoughRecipe);

		calculator.addFlourType('poolish', 'spelt', 5);
		calculator.addFlourType('main', 'semola', 10);

		const stagePercentages = get(calculator)
			.scaledIngredients.filter((i) => i.type === 'flour' || i.type === 'water')
			.map((i) => ({
				id: i.id,
				mixingStepId: i.mixingStepId ?? 'main',
				type: i.type,
				stagePercentage: i.stagePercentage
			}));

		const flourStageTotals = new Map<string, number>();
		for (const ingredient of stagePercentages.filter((i) => i.type === 'flour')) {
			flourStageTotals.set(
				ingredient.mixingStepId,
				(flourStageTotals.get(ingredient.mixingStepId) ?? 0) + ingredient.stagePercentage
			);
			expect(ingredient.stagePercentage).toBeLessThanOrEqual(100);
		}

		for (const total of flourStageTotals.values()) {
			expect(total).toBeCloseTo(100, 2);
		}

		for (const water of stagePercentages.filter((i) => i.type === 'water')) {
			expect(water.stagePercentage).toBeLessThanOrEqual(100);
			expect(water.stagePercentage).toBeGreaterThanOrEqual(0);
		}
	});

	it('keeps flour blends stable when hydration changes', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(twoFlourRecipe);
		calculator.addFlourType('main', 'semola', 10);

		const before = get(calculator).scaledIngredients.filter((i) => i.type === 'flour');
		calculator.setHydration(70);
		const after = get(calculator).scaledIngredients.filter((i) => i.type === 'flour');

		const beforePercents = before.map((f) => f.percentage).sort();
		const afterPercents = after.map((f) => f.percentage).sort();

		expect(afterPercents).toEqual(beforePercents);
	});

	it('rebalances correctly with three flours after custom addition', async () => {
		const calculator = await loadCalculator();
		calculator.setRecipe(twoFlourRecipe);
		calculator.addFlourType('main', 'semola', 10);

		calculator.setFlourBlend('main-a', 50);

		const stageFlours = get(calculator).scaledIngredients.filter((f) => f.type === 'flour');
		const total = stageFlours.reduce((sum, flour) => sum + flour.percentage, 0);
		expect(total).toBeCloseTo(100, 2);
	});

	it('makes controls available for single-flour stages to add custom flours', () => {
		const controls = getControllableIngredients(baseRecipe);
		expect(controls.flours).toHaveLength(1);
		expect(controls.flours[0].flours[0].percentage).toBe(100);
	});
});
