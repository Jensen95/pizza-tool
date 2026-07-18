import { describe, it, expect, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { preferences } from './preferences';
import * as storage from '$lib/utils/storage';

describe('preferences store', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		preferences.reset();
	});

	it('defaults to system theme and basil primary', () => {
		preferences.reset();
		const prefs = get(preferences);
		expect(prefs.theme).toBe('system');
		expect(prefs.primary).toBe('basil');
	});

	it('merges the new primary field over legacy stored preferences without a migration', () => {
		// An object saved before `primary` (and before `theme: system`) existed.
		vi.spyOn(storage, 'get').mockReturnValue({
			defaultPizzaCount: 6,
			theme: 'dark'
		} as never);

		preferences.updatePreference('keepScreenAwake', true);
		const prefs = get(preferences);

		expect(prefs.theme).toBe('dark');
		expect(prefs.defaultPizzaCount).toBe(6);
		// Missing field is defaulted at read time, never left undefined.
		expect(prefs.primary).toBe('basil');
		expect(prefs.keepScreenAwake).toBe(true);
	});

	it('persists theme and primary selections', () => {
		vi.spyOn(storage, 'get').mockReturnValue({} as never);

		preferences.setTheme('italiano');
		expect(get(preferences).theme).toBe('italiano');

		preferences.setPrimary('crust');
		expect(get(preferences).primary).toBe('crust');
	});
});
