import type { Timer, TimerStatus } from '$lib/types/timer';
import { sendNotification, requestPermission } from './notification';
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
 * Check all timers and send notifications for completed ones
 */
export async function checkTimers(): Promise<Timer[]> {
	const timers = getTimers();
	let updated = false;

	for (const timer of timers) {
		if (timer.status === 'active' && isTimerComplete(timer) && !timer.notificationSent) {
			timer.status = 'completed';
			timer.notificationSent = true;
			updated = true;

			// Send notification
			await sendNotification('Timer faerdig!', {
				body: `${timer.name} er faerdig`,
				tag: timer.id,
				requireInteraction: true
			});
		}
	}

	if (updated) {
		saveTimers(timers);
	}

	return timers;
}

/**
 * Start the timer manager interval
 * Returns a cleanup function
 */
export function startTimerManager(onUpdate: (timers: Timer[]) => void): () => void {
	// Request notification permission
	requestPermission();

	// Check immediately
	checkTimers().then(onUpdate);

	// Check every second
	const intervalId = setInterval(async () => {
		const timers = await checkTimers();
		onUpdate(timers);
	}, 1000);

	return () => clearInterval(intervalId);
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

	start(): void {
		if (this.isRunning) return;

		this.isRunning = true;

		// Request notification permission
		requestPermission();

		// Check immediately
		checkTimers();

		// Check every second
		this.intervalId = setInterval(() => {
			checkTimers();
		}, 1000);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		this.isRunning = false;
	}
}
