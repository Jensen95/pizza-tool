// ABOUTME: Persisted dough plans (recorded recipes) from the dough planner tool
import { writable } from 'svelte/store';
import * as storage from '$lib/utils/storage';
import type { DoughPlannerState } from '$lib/utils/dough-planner';

const DOUGH_PLANS_KEY = 'dough-plans';
const MAX_PLANS = 50;

export interface SavedDoughPlan {
	id: string;
	name: string;
	input: DoughPlannerState;
	createdAt: string;
}

function loadPlans(): SavedDoughPlan[] {
	return storage.get<SavedDoughPlan[]>(DOUGH_PLANS_KEY, []);
}

function createDoughPlansStore() {
	const { subscribe, set } = writable<SavedDoughPlan[]>(loadPlans());

	function save(plans: SavedDoughPlan[]) {
		storage.set(DOUGH_PLANS_KEY, plans);
	}

	// Rehydrate when another tab changes this key so both tabs converge (§7.3).
	storage.subscribeToExternalChanges<SavedDoughPlan[]>(DOUGH_PLANS_KEY, (value) => {
		set(value ?? []);
	});

	return {
		subscribe,

		/**
		 * Record a plan under a name. Returns the saved entry.
		 */
		savePlan(name: string, input: DoughPlannerState): SavedDoughPlan {
			const entry: SavedDoughPlan = {
				id:
					typeof crypto !== 'undefined' && crypto.randomUUID
						? crypto.randomUUID()
						: `plan-${Date.now()}`,
				name: name.trim() || 'Uden navn',
				input: { ...input },
				createdAt: new Date().toISOString()
			};

			// Re-read the freshest persisted list so a concurrent write from another
			// tab isn't blown away by a stale in-memory snapshot (§7.3).
			const newState = [entry, ...loadPlans()].slice(0, MAX_PLANS);
			save(newState);
			set(newState);

			return entry;
		},

		/**
		 * Delete a saved plan
		 */
		deletePlan(id: string) {
			const newState = loadPlans().filter((plan) => plan.id !== id);
			save(newState);
			set(newState);
		},

		/**
		 * Remove all saved plans
		 */
		clearPlans() {
			set([]);
			save([]);
		}
	};
}

export const doughPlans = createDoughPlansStore();
