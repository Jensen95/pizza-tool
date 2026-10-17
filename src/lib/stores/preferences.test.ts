import { describe, expect, test } from 'vitest';
import { migratePreferences } from '$lib/stores/preferences';

describe('migratePreferences', () => {
	test('a fresh install follows the device', () => {
		expect(migratePreferences({}).colorTheme).toBe('system');
	});

	test('drops the legacy theme field nobody could ever choose', () => {
		// Saved alongside every other preference with its old default of 'light'.
		// Carrying it over would pin everyone who ever touched a setting to light.
		const prefs = migratePreferences({ theme: 'light', keepScreenAwake: true });
		expect(prefs.colorTheme).toBe('system');
		expect(prefs.keepScreenAwake).toBe(true);
		expect('theme' in prefs).toBe(false);
	});

	test('keeps a theme the person actually picked', () => {
		expect(migratePreferences({ colorTheme: 'dark' }).colorTheme).toBe('dark');
		expect(migratePreferences({ colorTheme: 'light' }).colorTheme).toBe('light');
	});

	test('falls back to the device on a value it does not recognise', () => {
		expect(migratePreferences({ colorTheme: 'sepia' }).colorTheme).toBe('system');
	});
});
