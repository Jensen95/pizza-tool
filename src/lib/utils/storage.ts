import { writable } from 'svelte/store';

const STORAGE_PREFIX = 'pizza-tool-';
const CORRUPT_SUFFIX = '.corrupt';

/**
 * Reactive health signal the UI can react to. `lastFailure` is the key of the
 * most recent failed read/write (or `null` when everything is healthy);
 * `failedKeys` is the set of keys with an unresolved failure.
 */
export interface StorageHealth {
	lastFailure: string | null;
	failedKeys: string[];
}

export const storageHealth = writable<StorageHealth>({
	lastFailure: null,
	failedKeys: []
});

/**
 * Values we tried (and failed) to persist, keyed by storage key. `retryPendingWrites()`
 * re-attempts these. A corrupt read stages the caller's default here so a retry can
 * heal the corrupt key by overwriting it with a valid value.
 */
const pendingWrites = new Map<string, unknown>();

function recordFailure(key: string): void {
	storageHealth.update((health) => ({
		lastFailure: key,
		failedKeys: health.failedKeys.includes(key) ? health.failedKeys : [...health.failedKeys, key]
	}));
}

function recordSuccess(key: string): void {
	storageHealth.update((health) => {
		if (!health.failedKeys.includes(key)) return health;
		const failedKeys = health.failedKeys.filter((k) => k !== key);
		return {
			lastFailure: failedKeys.length > 0 ? health.lastFailure : null,
			failedKeys
		};
	});
}

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
	if (typeof window === 'undefined') return false;

	try {
		const test = '__storage_test__';
		window.localStorage.setItem(test, test);
		window.localStorage.removeItem(test);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get an item from localStorage with type safety.
 *
 * Distinguishes a genuinely missing key (returns `defaultValue` silently) from a
 * corrupt/unparseable value: on a parse failure the raw string is copied to
 * `<key>.corrupt` (best effort), the failure is recorded in `storageHealth`, and a
 * recovery write of `defaultValue` is staged so `retryPendingWrites()` can heal the key.
 */
export function get<T>(key: string, defaultValue: T): T {
	if (!isStorageAvailable()) return defaultValue;

	let item: string | null;
	try {
		item = window.localStorage.getItem(STORAGE_PREFIX + key);
	} catch {
		return defaultValue;
	}

	// Genuinely missing — never saved, not an error.
	if (item === null) return defaultValue;

	try {
		return JSON.parse(item) as T;
	} catch {
		// Corrupt value: back up the raw string before we overwrite it, surface the
		// failure, and stage a recovery write so the key can be healed on retry.
		try {
			window.localStorage.setItem(STORAGE_PREFIX + key + CORRUPT_SUFFIX, item);
		} catch {
			// best effort — a full/unavailable store just means no backup copy
		}
		pendingWrites.set(key, defaultValue);
		recordFailure(key);
		return defaultValue;
	}
}

/**
 * Set an item in localStorage. Still returns a boolean, but a failure is now also
 * recorded in `storageHealth` (and the value is queued for retry) so the UI can react
 * instead of the failure being swallowed silently.
 */
export function set<T>(key: string, value: T): boolean {
	if (!isStorageAvailable()) {
		// SSR: nothing to persist and no user to notify. In a real browser with an
		// unavailable store (e.g. iOS private mode, quota 0) surface the failure.
		if (typeof window !== 'undefined') {
			pendingWrites.set(key, value);
			recordFailure(key);
		}
		return false;
	}

	try {
		window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
		pendingWrites.delete(key);
		recordSuccess(key);
		return true;
	} catch {
		pendingWrites.set(key, value);
		recordFailure(key);
		return false;
	}
}

/**
 * Re-attempt every write that previously failed (and heal keys that failed to read
 * because they were corrupt). Returns true when all pending writes are now persisted.
 */
export function retryPendingWrites(): boolean {
	let allOk = true;
	for (const [key, value] of Array.from(pendingWrites.entries())) {
		// set() removes the key from pendingWrites and clears storageHealth on success.
		if (!set(key, value)) allOk = false;
	}
	return allOk;
}

/**
 * Subscribe to changes made to a key from *another* tab/window. The browser only
 * fires the `storage` event in tabs other than the one that made the change, which is
 * exactly what we need to rehydrate a store after a concurrent write. Returns an
 * unsubscribe function; a no-op during SSR.
 *
 * `cb` receives the parsed new value, or `null` when the key was removed/cleared. A
 * corrupt external value is ignored (the callback is not invoked) so a bad write in
 * another tab can't clobber healthy in-memory state.
 */
export function subscribeToExternalChanges<T>(
	key: string,
	cb: (value: T | null) => void
): () => void {
	if (typeof window === 'undefined') return () => {};

	const fullKey = STORAGE_PREFIX + key;

	const handler = (event: StorageEvent) => {
		if (event.storageArea && event.storageArea !== window.localStorage) return;
		// A `null` key means localStorage.clear() was called — affects every key.
		if (event.key !== null && event.key !== fullKey) return;

		if (event.newValue === null || event.newValue === undefined) {
			cb(null);
			return;
		}

		try {
			cb(JSON.parse(event.newValue) as T);
		} catch {
			// Corrupt external write — leave in-memory state untouched.
		}
	};

	window.addEventListener('storage', handler);
	return () => window.removeEventListener('storage', handler);
}

/**
 * Remove an item from localStorage
 */
export function remove(key: string): boolean {
	if (!isStorageAvailable()) return false;

	try {
		window.localStorage.removeItem(STORAGE_PREFIX + key);
		return true;
	} catch {
		return false;
	}
}

/**
 * Clear all pizza-tool items from localStorage
 */
export function clear(): boolean {
	if (!isStorageAvailable()) return false;

	try {
		const keysToRemove: string[] = [];
		for (let i = 0; i < window.localStorage.length; i++) {
			const key = window.localStorage.key(i);
			if (key && key.startsWith(STORAGE_PREFIX)) {
				keysToRemove.push(key);
			}
		}
		keysToRemove.forEach((key) => window.localStorage.removeItem(key));
		pendingWrites.clear();
		storageHealth.set({ lastFailure: null, failedKeys: [] });
		return true;
	} catch {
		return false;
	}
}

/**
 * Get all keys with the pizza-tool prefix
 */
export function getAllKeys(): string[] {
	if (!isStorageAvailable()) return [];

	const keys: string[] = [];
	for (let i = 0; i < window.localStorage.length; i++) {
		const key = window.localStorage.key(i);
		if (key && key.startsWith(STORAGE_PREFIX)) {
			keys.push(key.replace(STORAGE_PREFIX, ''));
		}
	}
	return keys;
}
