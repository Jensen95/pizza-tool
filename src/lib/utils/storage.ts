const STORAGE_PREFIX = 'pizza-tool-';

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
 * Get an item from localStorage with type safety
 */
export function get<T>(key: string, defaultValue: T): T {
	if (!isStorageAvailable()) return defaultValue;

	try {
		const item = window.localStorage.getItem(STORAGE_PREFIX + key);
		if (item === null) return defaultValue;
		return JSON.parse(item) as T;
	} catch {
		return defaultValue;
	}
}

/**
 * Set an item in localStorage
 */
export function set<T>(key: string, value: T): boolean {
	if (!isStorageAvailable()) return false;

	try {
		window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
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
