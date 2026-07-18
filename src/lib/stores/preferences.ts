import { writable } from 'svelte/store';
import * as storage from '$lib/utils/storage';

const PREFERENCES_STORAGE_KEY = 'preferences';

export type Theme = 'light' | 'dark' | 'grey' | 'italiano' | 'system';
export type Primary = 'basil' | 'crust' | 'flip';

export interface Preferences {
	defaultPizzaCount: number;
	defaultDoughWeight: number;
	notificationsEnabled: boolean;
	theme: Theme;
	/**
	 * Light/Dark primary accent (§3.1). Additive/optional: old stored preference
	 * objects predate this field and merge over the default at read time, so no
	 * migration is needed. Ignored while the resolved theme is Grey or Italiano.
	 */
	primary: Primary;
	notificationBannerDismissed: boolean;
	keepScreenAwake: boolean;
}

const defaultPreferences: Preferences = {
	defaultPizzaCount: 4,
	defaultDoughWeight: 270,
	notificationsEnabled: true,
	theme: 'system',
	primary: 'basil',
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
		setTheme(theme: Theme) {
			this.updatePreference('theme', theme);
		},

		/**
		 * Set the Light/Dark primary accent (no-op visually under Grey/Italiano).
		 */
		setPrimary(primary: Primary) {
			this.updatePreference('primary', primary);
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
