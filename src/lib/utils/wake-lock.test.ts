import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
	isWakeLockSupported,
	setupWakeLockVisibilityHandler,
	syncWakeLock
} from '$lib/utils/wake-lock';

class FakeWakeLockSentinel {
	released = false;
	private listeners = new Set<() => void>();

	addEventListener(type: 'release', listener: () => void) {
		if (type === 'release') {
			this.listeners.add(listener);
		}
	}

	removeEventListener(type: 'release', listener: () => void) {
		if (type === 'release') {
			this.listeners.delete(listener);
		}
	}

	async release() {
		if (this.released) return;

		this.released = true;
		for (const listener of this.listeners) {
			listener();
		}
	}
}

type SetupOptions = {
	sentinels?: FakeWakeLockSentinel[];
	visibilityState?: 'visible' | 'hidden' | 'prerender';
	supported?: boolean;
};

let requestMock: ReturnType<typeof vi.fn>;

function setupEnvironment(options: SetupOptions = {}) {
	const {
		sentinels = [new FakeWakeLockSentinel()],
		visibilityState = 'visible',
		supported = true
	} = options;

	let requestIndex = 0;
	requestMock = vi.fn().mockImplementation(async () => {
		const sentinel = sentinels[Math.min(requestIndex, sentinels.length - 1)];
		requestIndex += 1;
		return sentinel;
	});

	Object.defineProperty(globalThis, 'navigator', {
		value: supported
			? ({ wakeLock: { request: requestMock } } as unknown as Navigator)
			: ({} as unknown as Navigator),
		writable: true,
		configurable: true
	});

	const addEventListener = vi.fn();
	const removeEventListener = vi.fn();

	Object.defineProperty(globalThis, 'document', {
		value: {
			visibilityState,
			addEventListener,
			removeEventListener
		} as unknown as Document,
		writable: true,
		configurable: true
	});
}

beforeEach(() => {
	setupEnvironment();
});

afterEach(async () => {
	await syncWakeLock(false);
	vi.restoreAllMocks();
});

describe('wake-lock', () => {
	test('detects support based on wakeLock API', () => {
		expect(isWakeLockSupported()).toBe(true);

		setupEnvironment({ supported: false });
		expect(isWakeLockSupported()).toBe(false);
	});

	test('requests wake lock when enabled and visible', async () => {
		const enabled = await syncWakeLock(true);

		expect(enabled).toBe(true);
		expect(requestMock).toHaveBeenCalledTimes(1);
	});

	test('releases wake lock when disabled', async () => {
		const sentinel = new FakeWakeLockSentinel();
		setupEnvironment({ sentinels: [sentinel] });

		await syncWakeLock(true);
		expect(requestMock).toHaveBeenCalledTimes(1);

		await syncWakeLock(false);
		expect(sentinel.released).toBe(true);
	});

	test('reacquires wake lock after release while still enabled', async () => {
		const first = new FakeWakeLockSentinel();
		const second = new FakeWakeLockSentinel();
		setupEnvironment({ sentinels: [first, second] });

		await syncWakeLock(true);
		expect(requestMock).toHaveBeenCalledTimes(1);

		await first.release();
		expect(requestMock).toHaveBeenCalledTimes(2);
		expect(second.released).toBe(false);
	});

	test('requests wake lock when visibility changes to visible', async () => {
		const sentinel = new FakeWakeLockSentinel();
		const addEventListener = vi.fn();
		const removeEventListener = vi.fn();

		Object.defineProperty(globalThis, 'navigator', {
			value: { wakeLock: { request: vi.fn().mockResolvedValue(sentinel) } } as unknown as Navigator,
			writable: true,
			configurable: true
		});

		const wakeLock = (navigator as Navigator & { wakeLock?: { request: () => Promise<unknown> } })
			.wakeLock;

		let visibilityHandler: (() => void) | undefined;
		addEventListener.mockImplementation((event: string, handler: () => void) => {
			if (event === 'visibilitychange') {
				visibilityHandler = handler;
			}
		});

		const documentMock = {
			visibilityState: 'hidden',
			addEventListener,
			removeEventListener
		};

		Object.defineProperty(globalThis, 'document', {
			value: documentMock as unknown as Document,
			writable: true,
			configurable: true
		});

		await syncWakeLock(true);
		expect(wakeLock?.request).not.toHaveBeenCalled();

		setupWakeLockVisibilityHandler();
		documentMock.visibilityState = 'visible';
		await visibilityHandler?.();

		expect(wakeLock?.request).toHaveBeenCalledTimes(1);
		expect(removeEventListener).not.toHaveBeenCalled();
	});
});
