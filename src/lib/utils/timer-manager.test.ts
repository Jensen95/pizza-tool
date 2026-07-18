import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Timer } from '$lib/models/timer.types';

// Hoisted, stateful storage mock so the vi.mock factories (hoisted above imports) can
// reference it. `backing` behaves like persisted localStorage: get() returns a clone,
// set() replaces it. `onGet(count)` is a per-test hook that lets us mutate `backing`
// between checkTimers' two reads — this is how we simulate a concurrent write from
// another tab landing between the snapshot read and the re-read-before-write (§7.6).
const mocks = vi.hoisted(() => {
	const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
	return {
		clone,
		backing: [] as Timer[],
		setCalls: [] as Timer[][],
		getCount: 0,
		onGet: null as ((count: number) => void) | null,
		sendNotification: vi.fn(async () => true)
	};
});

vi.mock('./storage', () => ({
	get: vi.fn(() => {
		mocks.getCount += 1;
		mocks.onGet?.(mocks.getCount);
		return mocks.clone(mocks.backing);
	}),
	set: vi.fn((_key: string, value: Timer[]) => {
		mocks.backing = mocks.clone(value);
		mocks.setCalls.push(mocks.clone(value));
		return true;
	}),
	subscribeToExternalChanges: vi.fn(() => () => {})
}));

vi.mock('./notification', () => ({
	sendNotification: mocks.sendNotification
}));

import { checkTimers, startTimerManager } from './timer-manager';

function makeTimer(overrides: Partial<Timer> = {}): Timer {
	const now = Date.now();
	return {
		id: 'timer-1',
		name: 'Autolyse',
		nameDa: 'Autolyse',
		startTime: now - 60_000,
		duration: 60_000,
		endTime: now - 1_000, // already past by default
		status: 'active',
		notificationSent: false,
		createdAt: now - 60_000,
		...overrides
	};
}

beforeEach(() => {
	mocks.backing = [];
	mocks.setCalls = [];
	mocks.getCount = 0;
	mocks.onGet = null;
	mocks.sendNotification.mockClear();
});

afterEach(() => {
	mocks.onGet = null;
});

describe('checkTimers', () => {
	test('completes an overdue timer and fires exactly one notification', async () => {
		mocks.backing = [makeTimer({ endTime: Date.now() - 5_000 })];

		const result = await checkTimers();

		const completed = result.find((t) => t.id === 'timer-1')!;
		expect(completed.status).toBe('completed');
		expect(completed.notificationSent).toBe(true);
		expect(typeof completed.notifiedAt).toBe('number');
		expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
		expect(mocks.setCalls).toHaveLength(1);
	});

	test('does not re-notify a timer already marked notificationSent (dedupe across wakes)', async () => {
		mocks.backing = [
			makeTimer({
				endTime: Date.now() - 5_000,
				status: 'completed',
				notificationSent: true,
				notifiedAt: Date.now() - 4_000
			})
		];

		await checkTimers();

		expect(mocks.sendNotification).not.toHaveBeenCalled();
		expect(mocks.setCalls).toHaveLength(0);
	});

	test('a repeat wake on an already-completed timer does not double-notify', async () => {
		mocks.backing = [makeTimer({ endTime: Date.now() - 5_000 })];

		await checkTimers(); // first wake: completes + notifies, persists the dedupe flag
		await checkTimers(); // second wake: sees notificationSent, does nothing

		expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
		expect(mocks.setCalls).toHaveLength(1);
	});

	test('detects completion against absolute endTime even with no interval (background catch-up)', async () => {
		// endTime far in the past — as if JS was suspended past the deadline. A single
		// catch-up call must complete it without any interval ever having ticked.
		mocks.backing = [makeTimer({ endTime: Date.now() - 3_600_000 })];

		const result = await checkTimers();

		expect(result[0].status).toBe('completed');
		expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
	});

	test('does not complete a timer that is not yet due', async () => {
		mocks.backing = [makeTimer({ endTime: Date.now() + 60_000 })];

		const result = await checkTimers();

		expect(result[0].status).toBe('active');
		expect(mocks.sendNotification).not.toHaveBeenCalled();
		expect(mocks.setCalls).toHaveLength(0);
	});

	test('§7.6 race: a concurrent pause in another tab survives our completion write', async () => {
		const aDue = makeTimer({ id: 'a', name: 'A', endTime: Date.now() - 2_000 });
		const bRunning = makeTimer({ id: 'b', name: 'B', endTime: Date.now() + 120_000 });
		mocks.backing = [mocks.clone(aDue), mocks.clone(bRunning)];

		// Between checkTimers' snapshot read (call 1) and its re-read-before-write (call 2),
		// tab A pauses timer B.
		mocks.onGet = (count) => {
			if (count === 2) {
				mocks.backing = [
					mocks.clone(aDue),
					{ ...mocks.clone(bRunning), status: 'paused', remainingWhenPaused: 120_000 }
				];
			}
		};

		await checkTimers();

		expect(mocks.setCalls).toHaveLength(1);
		const written = mocks.setCalls[0];
		const writtenA = written.find((t) => t.id === 'a')!;
		const writtenB = written.find((t) => t.id === 'b')!;

		// Our completion applied to A...
		expect(writtenA.status).toBe('completed');
		// ...but B's concurrent pause was NOT clobbered back to active.
		expect(writtenB.status).toBe('paused');
		expect(writtenB.remainingWhenPaused).toBe(120_000);
	});

	test('§7.6 race: does not force-complete a timer that was paused concurrently', async () => {
		const due = makeTimer({ id: 'x', endTime: Date.now() - 2_000 });
		mocks.backing = [mocks.clone(due)];

		// The very timer we were about to complete gets paused by another tab in between.
		mocks.onGet = (count) => {
			if (count === 2) {
				mocks.backing = [{ ...mocks.clone(due), status: 'paused', remainingWhenPaused: 4_000 }];
			}
		};

		await checkTimers();

		// Nothing to write (the only candidate is no longer active) and no notification.
		expect(mocks.setCalls).toHaveLength(0);
		expect(mocks.sendNotification).not.toHaveBeenCalled();
	});
});

describe('startTimerManager background catch-up', () => {
	const listeners = new Map<string, Set<() => void>>();
	let originalDocument: PropertyDescriptor | undefined;
	let originalWindow: PropertyDescriptor | undefined;

	function record(target: 'doc' | 'win') {
		return {
			addEventListener: vi.fn((type: string, handler: () => void) => {
				const key = `${target}:${type}`;
				if (!listeners.has(key)) listeners.set(key, new Set());
				listeners.get(key)!.add(handler);
			}),
			removeEventListener: vi.fn((type: string, handler: () => void) => {
				listeners.get(`${target}:${type}`)?.delete(handler);
			})
		};
	}

	beforeEach(() => {
		listeners.clear();
		originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
		originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

		Object.defineProperty(globalThis, 'document', {
			value: { ...record('doc'), visibilityState: 'visible' },
			writable: true,
			configurable: true
		});
		Object.defineProperty(globalThis, 'window', {
			value: record('win'),
			writable: true,
			configurable: true
		});
	});

	afterEach(() => {
		if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
		else delete (globalThis as unknown as Record<string, unknown>).document;
		if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
		else delete (globalThis as unknown as Record<string, unknown>).window;
	});

	test('registers visibilitychange/pageshow/focus listeners and cleanup removes them', () => {
		const stop = startTimerManager(() => {});

		expect(listeners.get('doc:visibilitychange')?.size).toBe(1);
		expect(listeners.get('win:pageshow')?.size).toBe(1);
		expect(listeners.get('win:focus')?.size).toBe(1);

		stop();

		expect(listeners.get('doc:visibilitychange')?.size).toBe(0);
		expect(listeners.get('win:pageshow')?.size).toBe(0);
		expect(listeners.get('win:focus')?.size).toBe(0);
	});

	test('a visibility wake runs a catch-up that completes an overdue timer once', async () => {
		mocks.backing = [makeTimer({ endTime: Date.now() - 5_000 })];

		const stop = startTimerManager(() => {});

		// Wait for the immediate startup catch-up to complete + notify.
		await vi.waitFor(() => {
			expect(mocks.sendNotification).toHaveBeenCalledTimes(1);
		});

		// Now simulate the tab returning to the foreground.
		const handler = [...(listeners.get('doc:visibilitychange') ?? [])][0];
		handler();
		await Promise.resolve();
		await Promise.resolve();

		// The timer is already completed/persisted, so the wake must not re-notify.
		expect(mocks.sendNotification).toHaveBeenCalledTimes(1);

		stop();
	});
});
