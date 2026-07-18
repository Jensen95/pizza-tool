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
	const { subscribe, set } = writable<Preferences>(loadPreferences());

	function save(prefs: Preferences) {
		storage.set(PREFERENCES_STORAGE_KEY, prefs);
	}

	// Rehydrate when another tab changes preferences so both tabs converge (§7.3).
	storage.subscribeToExternalChanges<Partial<Preferences>>(PREFERENCES_STORAGE_KEY, (value) => {
		set({ ...defaultPreferences, ...(value ?? {}) });
	});

	return {
		subscribe,

		/**
		 * Update a single preference
		 */
		updatePreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
			// Merge over the freshest persisted object so a change to a different
			// field in another tab isn't lost (§7.3).
			const newPrefs = { ...loadPreferences(), [key]: value };
			save(newPrefs);
			set(newPrefs);
		},

		/**
		 * Update multiple preferences
		 */
		updatePreferences(updates: Partial<Preferences>) {
			const newPrefs = { ...loadPreferences(), ...updates };
			save(newPrefs);
			set(newPrefs);
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
			const base = loadPreferences();
			const newPrefs = { ...base, notificationsEnabled: !base.notificationsEnabled };
			save(newPrefs);
			set(newPrefs);
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
			const base = loadPreferences();
			const newPrefs = { ...base, keepScreenAwake: !base.keepScreenAwake };
			save(newPrefs);
			set(newPrefs);
		}
	};
}

export const preferences = createPreferencesStore();
