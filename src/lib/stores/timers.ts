import { writable, derived } from 'svelte/store';
import type { Timer, TimerStatus } from '$lib/types';
import {
	getTimers,
	createTimer as createTimerUtil,
	addTimer as addTimerUtil,
	removeTimer as removeTimerUtil,
	updateTimerStatus as updateTimerStatusUtil,
	pauseTimer as pauseTimerUtil,
	resumeTimer as resumeTimerUtil,
	clearCompletedTimers as clearCompletedUtil,
	getTimeRemaining,
	isTimerComplete,
	startTimerManager
} from '$lib/utils/timer-manager';
import { requestPermission } from '$lib/utils/notification';

function createTimersStore() {
	const { subscribe, set } = writable<Timer[]>([]);

	// Initialize store with stored timers
	let cleanup: (() => void) | null = null;

	return {
		subscribe,

		/**
		 * Initialize the timers store and start the timer manager
		 */
		init() {
			const storedTimers = getTimers();
			set(storedTimers);

			// Start timer manager
			cleanup = startTimerManager((timers) => {
				set(timers);
			});
		},

		/**
		 * Cleanup timer manager
		 */
		destroy() {
			if (cleanup) {
				cleanup();
				cleanup = null;
			}
		},

		/**
		 * Create and add a new timer
		 */
		create(name: string, durationMinutes: number, recipeId?: string, stageId?: string): Timer {
			const timer = createTimerUtil(name, durationMinutes, recipeId, stageId);
			const timers = addTimerUtil(timer);
			set(timers);
			return timer;
		},

		/**
		 * Remove a timer
		 */
		remove(timerId: string) {
			const timers = removeTimerUtil(timerId);
			set(timers);
		},

		/**
		 * Pause a timer
		 */
		pause(timerId: string) {
			const timers = pauseTimerUtil(timerId);
			set(timers);
		},

		/**
		 * Resume a timer
		 */
		resume(timerId: string) {
			const timers = resumeTimerUtil(timerId);
			set(timers);
		},

		/**
		 * Update timer status
		 */
		updateStatus(timerId: string, status: TimerStatus) {
			const timers = updateTimerStatusUtil(timerId, status);
			set(timers);
		},

		/**
		 * Clear all completed timers
		 */
		clearCompleted() {
			const timers = clearCompletedUtil();
			set(timers);
		},

		/**
		 * Request notification permission
		 */
		async requestNotificationPermission() {
			return await requestPermission();
		}
	};
}

export const timers = createTimersStore();

/**
 * Derived store for active timers only
 */
export const activeTimers = derived(timers, ($timers) =>
	$timers.filter((t) => t.status === 'active' || t.status === 'paused')
);

/**
 * Derived store for completed timers
 */
export const completedTimers = derived(timers, ($timers) =>
	$timers.filter((t) => t.status === 'completed')
);

/**
 * Derived store for number of active timers
 */
export const activeTimerCount = derived(activeTimers, ($activeTimers) => $activeTimers.length);

/**
 * Export utility functions
 */
export { getTimeRemaining, isTimerComplete };
