import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { doughLog, DOUGH_LOG_KEY } from './dough-log';
import { storageHealth } from '$lib/utils/storage';
import type { NewDoughLogEntry } from '$lib/models/dough-log.types';

// The unit-test environment is `node`, so there is no real localStorage. We install a
// minimal in-memory one (browser-shaped) so the store's re-read-before-write persistence
// path actually round-trips; the failure test swaps in a variant whose setItem throws for
// the dough-log key, exercising the real `storage.set` failure branch end-to-end.
function makeLocalStorage(throwForDoughLog = false) {
	const store = new Map<string, string>();
	return {
		getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
		setItem: (k: string, v: string) => {
			if (throwForDoughLog && k.includes(DOUGH_LOG_KEY)) {
				throw new Error('QuotaExceededError');
			}
			store.set(k, String(v));
		},
		removeItem: (k: string) => {
			store.delete(k);
		},
		clear: () => store.clear(),
		key: (i: number) => Array.from(store.keys())[i] ?? null,
		get length() {
			return store.size;
		}
	};
}

function installStorage(ls: ReturnType<typeof makeLocalStorage>) {
	vi.stubGlobal('localStorage', ls);
	vi.stubGlobal('window', {
		localStorage: ls,
		addEventListener: () => {},
		removeEventListener: () => {}
	});
}

function makeEntry(overrides: Partial<NewDoughLogEntry> = {}): NewDoughLogEntry {
	return {
		recipeId: 'napoletana',
		recipeName: 'Napoletana',
		recipeCategory: 'neapolitan',
		numberOfPizzas: 4,
		doughBallWeight: 270,
		hydration: 65,
		predoughRatio: null,
		ingredientDeviations: [],
		fermentationDeviations: [],
		bakedAt: '2026-07-18T18:00:00.000Z',
		...overrides
	};
}

describe('dough-log store', () => {
	beforeEach(() => {
		installStorage(makeLocalStorage());
		storageHealth.set({ lastFailure: null, failedKeys: [] });
		doughLog.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('adds an entry newest-first with generated id/createdAt and reports it persisted', () => {
		const first = doughLog.add(makeEntry({ recipeName: 'First' }));
		const second = doughLog.add(makeEntry({ recipeName: 'Second' }));

		expect(first.persisted).toBe(true);
		expect(second.persisted).toBe(true);
		expect(second.entry.id).toBeTruthy();
		expect(second.entry.id).not.toBe(first.entry.id);
		expect(second.entry.createdAt).toBeTruthy();

		const all = get(doughLog);
		expect(all).toHaveLength(2);
		// Newest first.
		expect(all[0].recipeName).toBe('Second');
		expect(all[1].recipeName).toBe('First');
	});

	it('caps the log at 50 entries, dropping the oldest', () => {
		for (let i = 0; i < 55; i++) {
			doughLog.add(makeEntry({ recipeName: `bake-${i}` }));
		}

		const all = get(doughLog);
		expect(all).toHaveLength(50);
		// The most recent add is at the head; the 5 oldest were dropped.
		expect(all[0].recipeName).toBe('bake-54');
		expect(all[all.length - 1].recipeName).toBe('bake-5');
		expect(all.some((e) => e.recipeName === 'bake-4')).toBe(false);
	});

	it('deletes a single entry by id and leaves the rest intact', () => {
		const a = doughLog.add(makeEntry({ recipeName: 'keep-a' }));
		const b = doughLog.add(makeEntry({ recipeName: 'remove-b' }));
		const c = doughLog.add(makeEntry({ recipeName: 'keep-c' }));

		doughLog.delete(b.entry.id);

		const all = get(doughLog);
		expect(all).toHaveLength(2);
		expect(all.map((e) => e.id)).toEqual([c.entry.id, a.entry.id]);
		expect(all.some((e) => e.id === b.entry.id)).toBe(false);
	});

	it('clears every entry', () => {
		doughLog.add(makeEntry());
		doughLog.add(makeEntry());
		doughLog.clear();
		expect(get(doughLog)).toHaveLength(0);
	});

	it('getForRecipe returns only that recipe’s entries, newest-first', () => {
		doughLog.add(makeEntry({ recipeId: 'napoletana', recipeName: 'napo-1' }));
		doughLog.add(makeEntry({ recipeId: 'poolish', recipeName: 'poolish-1' }));
		doughLog.add(makeEntry({ recipeId: 'napoletana', recipeName: 'napo-2' }));

		const napo = doughLog.getForRecipe('napoletana');
		expect(napo.map((e) => e.recipeName)).toEqual(['napo-2', 'napo-1']);

		expect(doughLog.getForRecipe('poolish')).toHaveLength(1);
		expect(doughLog.getForRecipe('does-not-exist')).toHaveLength(0);
	});

	it('surfaces a save failure via storageHealth but still keeps the entry in memory', () => {
		// Swap in a store whose write throws for the dough-log key.
		installStorage(makeLocalStorage(true));
		storageHealth.set({ lastFailure: null, failedKeys: [] });

		const result = doughLog.add(makeEntry({ recipeName: 'unsaved' }));

		// Persistence failed and is surfaced on the shared health signal (§5.1)...
		expect(result.persisted).toBe(false);
		expect(get(storageHealth).lastFailure).toBe(DOUGH_LOG_KEY);
		expect(get(storageHealth).failedKeys).toContain(DOUGH_LOG_KEY);

		// ...but the record is still visible in-memory so nothing is lost on screen.
		expect(get(doughLog).some((e) => e.recipeName === 'unsaved')).toBe(true);
		expect(result.entry.recipeName).toBe('unsaved');
	});
});
