// ABOUTME: Persisted Dough Log (bake journal) — records what actually happened on a
// bake vs. what the recipe/plan prescribed. Modeled exactly on dough-plans.ts /
// recipeHistory (store-map §5.5): a single writable array, newest-first, hard cap 50,
// immutable records (add/delete/clear, no edit). See DESIGN_PLAN.md §5.
//
// Precious-data deviation (§5.1): a bake log is far harder to reconstruct than a
// recomputed override, so — unlike the swallow-everything convention elsewhere — this
// store checks the boolean returned by `storage.set` and surfaces failures through the
// shared `storageHealth` signal from Phase 0. `add` returns `{ entry, persisted }` so a
// caller (the log sheet) can show an inline "kunne ikke gemmes" error and keep the sheet
// open, while the in-memory list still reflects the entry so nothing is lost on screen.
import { writable, get } from 'svelte/store';
import * as storage from '$lib/utils/storage';
import type { DoughLogEntry, NewDoughLogEntry } from '$lib/models/dough-log.types';

/** localStorage key (the storage wrapper prefixes it with `pizza-tool-`). */
export const DOUGH_LOG_KEY = 'dough-log';
const MAX_ENTRIES = 50;

/** Result of a persisting mutation — the record plus whether it reached localStorage. */
export interface DoughLogWriteResult {
	entry: DoughLogEntry;
	/** `false` when `storage.set` failed; the failure is also on `storageHealth`. */
	persisted: boolean;
}

function loadEntries(): DoughLogEntry[] {
	return storage.get<DoughLogEntry[]>(DOUGH_LOG_KEY, []);
}

function createId(): string {
	return typeof crypto !== 'undefined' && crypto.randomUUID
		? crypto.randomUUID()
		: `doughlog-${Date.now()}`;
}

function createDoughLogStore() {
	const { subscribe, set } = writable<DoughLogEntry[]>(loadEntries());

	/** Persist and report whether the write reached localStorage (§5.1). */
	function persist(entries: DoughLogEntry[]): boolean {
		return storage.set(DOUGH_LOG_KEY, entries);
	}

	// Rehydrate when another tab changes this key so both tabs converge (§7.3).
	storage.subscribeToExternalChanges<DoughLogEntry[]>(DOUGH_LOG_KEY, (value) => {
		set(value ?? []);
	});

	return {
		subscribe,

		/**
		 * Record a bake. Generates `id` + `createdAt`; the caller supplies everything
		 * else (including `bakedAt`). Newest-first, capped at 50.
		 *
		 * The entry is always committed to the in-memory store (so it stays visible even
		 * if the disk write fails), but `persisted` reflects whether `storage.set`
		 * succeeded so the UI can warn on failure — precious data must not fail silently.
		 */
		add(entry: NewDoughLogEntry): DoughLogWriteResult {
			const record: DoughLogEntry = {
				...entry,
				id: createId(),
				createdAt: new Date().toISOString()
			};

			// Re-read the freshest persisted list so a concurrent write from another tab
			// isn't blown away by a stale in-memory snapshot (§7.3).
			const newState = [record, ...loadEntries()].slice(0, MAX_ENTRIES);
			const persisted = persist(newState);
			set(newState);

			return { entry: record, persisted };
		},

		/**
		 * Delete a log entry by id.
		 */
		delete(id: string) {
			const newState = loadEntries().filter((e) => e.id !== id);
			persist(newState);
			set(newState);
		},

		/**
		 * Remove all log entries.
		 */
		clear() {
			set([]);
			persist([]);
		},

		/**
		 * All entries for a recipe, newest-first (the array is already ordered).
		 */
		getForRecipe(recipeId: string): DoughLogEntry[] {
			return get({ subscribe }).filter((e) => e.recipeId === recipeId);
		}
	};
}

export const doughLog = createDoughLogStore();
