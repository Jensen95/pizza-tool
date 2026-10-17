import { writable } from 'svelte/store';
import * as storage from '$lib/utils/storage';
import type { YeastInfo } from '$lib/models';

const PREFERENCES_STORAGE_KEY = 'preferences';

/** 'system' follows the phone or computer; the other two override it. */
export type ColorTheme = 'system' | 'light' | 'dark';

export const colorThemeOrder: ColorTheme[] = ['system', 'light', 'dark'];

export interface Preferences {
	defaultPizzaCount: number;
	defaultDoughWeight: number;
	notificationsEnabled: boolean;
	colorTheme: ColorTheme;
	notificationBannerDismissed: boolean;
	keepScreenAwake: boolean;
	/** Yeast the dough planner starts on — most bakers only keep one kind at home */
	defaultYeastType: YeastInfo['type'];
}

const defaultPreferences: Preferences = {
	defaultPizzaCount: 4,
	defaultDoughWeight: 270,
	notificationsEnabled: true,
	colorTheme: 'system',
	notificationBannerDismissed: false,
	keepScreenAwake: false,
	defaultYeastType: 'fresh'
};

/**
 * Older versions stored a `theme` field that nothing ever read and nothing let
 * anyone choose — it was saved along with every other preference, so it holds
 * the old default of 'light', not a decision. It is dropped rather than carried
 * over, or everyone who ever changed a setting would be pinned to light mode.
 */
export function migratePreferences(stored: Record<string, unknown>): Preferences {
	const { theme: _legacyTheme, ...rest } = stored;
	const merged = { ...defaultPreferences, ...rest } as Preferences;
	if (!colorThemeOrder.includes(merged.colorTheme)) merged.colorTheme = 'system';
	return merged;
}

function loadPreferences(): Preferences {
	return migratePreferences(storage.get<Record<string, unknown>>(PREFERENCES_STORAGE_KEY, {}));
}

function createPreferencesStore() {
	const { subscribe, set, update } = writable<Preferences>(loadPreferences());

	function save(prefs: Preferences) {
		storage.set(PREFERENCES_STORAGE_KEY, prefs);
	}

	return {
		subscribe,

		/**
		 * Update a single preference
		 */
		updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
			update((prefs) => {
				const newPrefs = { ...prefs, [key]: value };
				save(newPrefs);
				return newPrefs;
			});
		},

		/**
		 * Update multiple preferences
		 */
		updatePreferences(updates: Partial<Preferences>) {
			update((prefs) => {
				const newPrefs = { ...prefs, ...updates };
				save(newPrefs);
				return newPrefs;
			});
		},

		/**
		 * Reset to defaults
		 */
		reset() {
			save(defaultPreferences);
			set(defaultPreferences);
		},

		/**
		 * Set default pizza count
		 */
		setDefaultPizzaCount(count: number) {
			if (count < 1) count = 1;
			if (count > 20) count = 20;
			this.updatePreference('defaultPizzaCount', count);
		},

		/**
		 * Set default dough weight
		 */
		setDefaultDoughWeight(weight: number) {
			if (weight < 100) weight = 100;
			if (weight > 500) weight = 500;
			this.updatePreference('defaultDoughWeight', weight);
		},

		/**
		 * Toggle notifications
		 */
		toggleNotifications() {
			update((prefs) => {
				const newPrefs = { ...prefs, notificationsEnabled: !prefs.notificationsEnabled };
				save(newPrefs);
				return newPrefs;
			});
		},

		/**
		 * Choose light, dark, or follow the device
		 */
		setColorTheme(theme: ColorTheme) {
			this.updatePreference('colorTheme', theme);
		},

		/**
		 * Step to the next theme: automatic → light → dark → automatic
		 */
		cycleColorTheme() {
			update((prefs) => {
				const next =
					colorThemeOrder[(colorThemeOrder.indexOf(prefs.colorTheme) + 1) % colorThemeOrder.length];
				const newPrefs = { ...prefs, colorTheme: next };
				save(newPrefs);
				return newPrefs;
			});
		},

		/**
		 * Dismiss notification banner permanently
		 */
		dismissNotificationBanner() {
			this.updatePreference('notificationBannerDismissed', true);
		},

		/**
		 * Remember which yeast the planner should default to
		 */
		setDefaultYeastType(type: YeastInfo['type']) {
			this.updatePreference('defaultYeastType', type);
		},

		/**
		 * Toggle keeping the screen awake
		 */
		toggleKeepScreenAwake() {
			update((prefs) => {
				const newPrefs = { ...prefs, keepScreenAwake: !prefs.keepScreenAwake };
				save(newPrefs);
				return newPrefs;
			});
		}
	};
}

export const preferences = createPreferencesStore();
