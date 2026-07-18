import type { Timer, TimerStatus } from '$lib/models/timer.types';
import { sendNotification } from './notification';
import * as storage from './storage';

const TIMERS_STORAGE_KEY = 'timers';

/**
 * Generate unique timer ID
 */
export function generateTimerId(): string {
	return `timer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a new timer
 */
export function createTimer(
	name: string,
	durationMinutes: number,
	recipeId?: string,
	stageId?: string
): Timer {
	const now = Date.now();
	const durationMs = durationMinutes * 60 * 1000;

	return {
		id: generateTimerId(),
		name,
		nameDa: name,
		startTime: now,
		duration: durationMs,
		endTime: now + durationMs,
		status: 'active',
		recipeId,
		stageId,
		notificationSent: false,
		createdAt: now
	};
}

/**
 * Get all timers from storage
 */
export function getTimers(): Timer[] {
	return storage.get<Timer[]>(TIMERS_STORAGE_KEY, []);
}

/**
 * Save timers to storage
 */
export function saveTimers(timers: Timer[]): void {
	storage.set(TIMERS_STORAGE_KEY, timers);
}

/**
 * Add a timer
 */
export function addTimer(timer: Timer): Timer[] {
	const timers = getTimers();
	timers.push(timer);
	saveTimers(timers);
	return timers;
}

/**
 * Remove a timer
 */
export function removeTimer(timerId: string): Timer[] {
	let timers = getTimers();
	timers = timers.filter((t) => t.id !== timerId);
	saveTimers(timers);
	return timers;
}

/**
 * Update timer status
 */
export function updateTimerStatus(timerId: string, status: TimerStatus): Timer[] {
	const timers = getTimers();
	const timer = timers.find((t) => t.id === timerId);

	if (timer) {
		timer.status = status;

		if (status === 'paused') {
			timer.pausedAt = Date.now();
			timer.remainingWhenPaused = timer.endTime - Date.now();
		} else if (status === 'active' && timer.pausedAt && timer.remainingWhenPaused) {
			// Resume timer
			timer.endTime = Date.now() + timer.remainingWhenPaused;
			timer.startTime = timer.endTime - timer.duration;
			timer.pausedAt = undefined;
			timer.remainingWhenPaused = undefined;
		}

		saveTimers(timers);
	}

	return timers;
}

/**
 * Pause a timer
 */
export function pauseTimer(timerId: string): Timer[] {
	return updateTimerStatus(timerId, 'paused');
}

/**
 * Resume a timer
 */
export function resumeTimer(timerId: string): Timer[] {
	return updateTimerStatus(timerId, 'active');
}

/**
 * Get time remaining for a timer in milliseconds
 */
export function getTimeRemaining(timer: Timer): number {
	if (timer.status === 'paused' && timer.remainingWhenPaused !== undefined) {
		return timer.remainingWhenPaused;
	}

	if (timer.status === 'completed' || timer.status === 'cancelled') {
		return 0;
	}

	return Math.max(0, timer.endTime - Date.now());
}

/**
 * Check if a timer is complete
 */
export function isTimerComplete(timer: Timer): boolean {
	if (timer.status === 'completed') return true;
	if (timer.status === 'paused') return false;
	return Date.now() >= timer.endTime;
}

/**
 * Check all timers and send notifications for completed ones.
 *
 * Completion is detected against each timer's **absolute** `endTime`, not against
 * the running interval, so a timer that finished while JS was suspended (backgrounded
 * tab / locked device) is caught the next time this runs — including from the
 * visibility/pageshow catch-up in `startTimerManager` (§7.7).
 *
 * The write is race-safe (§7.6): completions are computed from an initial snapshot, but
 * the persisted array is **re-read immediately before writing** and the completion is
 * merged in per-timer, applied only to timers that are *still* `active` in the freshest
 * state. A concurrent pause/resume/remove/add from another tab therefore survives — we
 * never write back a stale whole-array snapshot. Notifications fire only for timers that
 * actually transitioned (deduped by `notificationSent`), so multi-tab or repeated wakes
 * don't double-notify.
 */
export async function checkTimers(): Promise<Timer[]> {
	const snapshot = getTimers();
	const now = Date.now();

	const completedIds = new Set<string>();
	for (const timer of snapshot) {
		if (timer.status === 'active' && !timer.notificationSent && now >= timer.endTime) {
			completedIds.add(timer.id);
		}
	}

	if (completedIds.size === 0) {
		return snapshot;
	}

	// Re-read the freshest persisted state right before writing and merge by id, so a
	// concurrent write from another tab (e.g. a pause) isn't clobbered by our snapshot.
	const fresh = getTimers();
	const toNotify: Timer[] = [];
	for (const timer of fresh) {
		// Only complete timers that are still active — respect a concurrent pause/resume.
		if (completedIds.has(timer.id) && timer.status === 'active' && !timer.notificationSent) {
			timer.status = 'completed';
			timer.notificationSent = true;
			timer.notifiedAt = now;
			toNotify.push(timer);
		}
	}

	if (toNotify.length === 0) {
		return fresh;
	}

	// Persist the completion (and the notificationSent dedupe flag) before sending, so a
	// concurrent tab reacting to the storage event won't also fire the same notification.
	saveTimers(fresh);

	for (const timer of toNotify) {
		await sendNotification('Timer færdig!', {
			body: `${timer.name} er færdig`,
			tag: timer.id,
			requireInteraction: true
		});
	}

	return fresh;
}

/**
 * Start the timer manager interval
 * Returns a cleanup function
 */
export function startTimerManager(onUpdate: (timers: Timer[]) => void): () => void {
	// Note: Do not auto-request notification permission here
	// Firefox mobile requires permission to be requested from a user interaction
	// The permission should be requested when the user creates their first timer

	// Check immediately
	checkTimers().then(onUpdate);

	// Foreground ticking. Completion detection does NOT depend on this interval having
	// been alive at the completion moment — checkTimers() compares against absolute
	// endTimes, so a wake-up catch-up recovers anything the frozen interval missed.
	const intervalId = setInterval(async () => {
		const timers = await checkTimers();
		onUpdate(timers);
	}, 1000);

	// Background catch-up (§7.7): mobile browsers freeze JS timers while the tab is
	// backgrounded/suspended, so the 1s interval can't fire the completion notification
	// at the moment a timer finishes. On every wake — tab becomes visible again, the
	// page is restored from the bfcache (pageshow), or the window regains focus — run an
	// immediate catch-up that recomputes remaining time, fires any missed completion
	// notification (once), and snaps the UI to reality instead of a stale countdown.
	const catchUp = () => {
		void checkTimers().then(onUpdate);
	};
	const onVisibilityChange = () => {
		if (typeof document === 'undefined' || document.visibilityState === 'visible') {
			catchUp();
		}
	};

	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', onVisibilityChange);
	}
	if (typeof window !== 'undefined') {
		window.addEventListener('pageshow', catchUp);
		// Belt-and-braces: some browsers/OSes fire focus but not visibilitychange on wake.
		window.addEventListener('focus', catchUp);
	}

	return () => {
		clearInterval(intervalId);
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', onVisibilityChange);
		}
		if (typeof window !== 'undefined') {
			window.removeEventListener('pageshow', catchUp);
			window.removeEventListener('focus', catchUp);
		}
	};
}

/**
 * Get active timers
 */
export function getActiveTimers(): Timer[] {
	return getTimers().filter((t) => t.status === 'active' || t.status === 'paused');
}

/**
 * Get completed timers
 */
export function getCompletedTimers(): Timer[] {
	return getTimers().filter((t) => t.status === 'completed');
}

/**
 * Clear completed timers
 */
export function clearCompletedTimers(): Timer[] {
	let timers = getTimers();
	timers = timers.filter((t) => t.status !== 'completed');
	saveTimers(timers);
	return timers;
}

/**
 * Timer Manager class for managing timer checking lifecycle
 */
export class TimerManager {
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private isRunning = false;
	private catchUp = () => {
		void checkTimers();
	};
	private onVisibilityChange = () => {
		if (typeof document === 'undefined' || document.visibilityState === 'visible') {
			this.catchUp();
		}
	};

	start(): void {
		if (this.isRunning) return;

		this.isRunning = true;

		// Note: Do not auto-request notification permission here
		// Firefox mobile requires permission to be requested from a user interaction
		// The permission should be requested when the user creates their first timer

		// Check immediately
		checkTimers();

		// Check every second
		this.intervalId = setInterval(() => {
			checkTimers();
		}, 1000);

		// Background catch-up on wake — see startTimerManager for the rationale (§7.7).
		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', this.onVisibilityChange);
		}
		if (typeof window !== 'undefined') {
			window.addEventListener('pageshow', this.catchUp);
			window.addEventListener('focus', this.catchUp);
		}
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', this.onVisibilityChange);
		}
		if (typeof window !== 'undefined') {
			window.removeEventListener('pageshow', this.catchUp);
			window.removeEventListener('focus', this.catchUp);
		}
		this.isRunning = false;
	}
}
