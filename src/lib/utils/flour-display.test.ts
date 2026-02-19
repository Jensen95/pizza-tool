import { describe, it, expect } from 'vitest';
import { resolveFlourDisplayName } from './flour-display';
import type { FlourType } from '$lib/models/reference.types';

const testProducts: FlourType[] = [
	{
		id: 'caputo-nuvola-super',
		name: 'Caputo Nuvola Super (lilla)',
		nameDa: 'Caputo Nuvola Super (lilla)',
		type: 'tipo-0',
		proteinMin: 13.5,
		proteinMax: 13.5,
		wValueMin: 320,
		wValueMax: 340
	},
	{
		id: 'caputo-pizzeria',
		name: 'Caputo Pizzaria (rød)',
		nameDa: 'Caputo Pizzaria (rød)',
		type: 'tipo-00',
		proteinMin: 12.5,
		proteinMax: 12.5,
		wValueMin: 260,
		wValueMax: 270
	}
];

describe('resolveFlourDisplayName', () => {
	it('returns category label when no flourId is provided', () => {
		const result = resolveFlourDisplayName('tipo-00', undefined, testProducts);
		expect(result).toEqual({ name: 'Tipo 00', nameDa: 'Tipo 00' });
	});

	it('returns product name when flourId matches a product', () => {
		const result = resolveFlourDisplayName('tipo-0', 'caputo-nuvola-super', testProducts);
		expect(result).toEqual({
			name: 'Caputo Nuvola Super (lilla)',
			nameDa: 'Caputo Nuvola Super (lilla)'
		});
	});

	it('falls back to category label when flourId does not match any product', () => {
		const result = resolveFlourDisplayName('tipo-00', 'unknown-flour', testProducts);
		expect(result).toEqual({ name: 'Tipo 00', nameDa: 'Tipo 00' });
	});

	it('returns category label for bread flour', () => {
		const result = resolveFlourDisplayName('bread', undefined, testProducts);
		expect(result).toEqual({ name: 'Bread flour', nameDa: 'Brødmel' });
	});

	it('returns category label for gluten-free flour', () => {
		const result = resolveFlourDisplayName('gluten-free', undefined, testProducts);
		expect(result).toEqual({ name: 'Gluten-free flour', nameDa: 'Glutenfri mel' });
	});

	it('returns generic fallback for unknown category', () => {
		const result = resolveFlourDisplayName('nonexistent' as any, undefined, testProducts);
		expect(result).toEqual({ name: 'Flour', nameDa: 'Mel' });
	});

	it('uses default product list when none provided', () => {
		const result = resolveFlourDisplayName('tipo-00');
		expect(result).toEqual({ name: 'Tipo 00', nameDa: 'Tipo 00' });
	});
});
