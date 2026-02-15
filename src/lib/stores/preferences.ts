import { writable } from 'svelte/store';
import * as storage from '$lib/utils/storage';

const PREFERENCES_STORAGE_KEY = 'preferences';

export interface Preferences {
	defaultPizzaCount: number;
	defaultDoughWeight: number;
	notificationsEnabled: boolean;
	theme: 'light' | 'dark' | 'system';
	notificationBannerDismissed: boolean;
	keepScreenAwake: boolean;
}

const defaultPreferences: Preferences = {
	defaultPizzaCount: 4,
	defaultDoughWeight: 270,
	notificationsEnabled: true,
	theme: 'light',
	notificationBannerDismissed: false,
	keepScreenAwake: false
};

function loadPreferences(): Preferences {
	const stored = storage.get<Partial<Preferences>>(PREFERENCES_STORAGE_KEY, {});
	return {
		...defaultPreferences,
		...stored
	};
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
		 * Set theme
		 */
		setTheme(theme: 'light' | 'dark' | 'system') {
			this.updatePreference('theme', theme);
		},

		/**
		 * Dismiss notification banner permanently
		 */
		dismissNotificationBanner() {
			this.updatePreference('notificationBannerDismissed', true);
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
