<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/ui/Header.svelte';
	import Navigation from '$lib/components/ui/Navigation.svelte';
	import NotificationPermissionBanner from '$lib/components/timer/NotificationPermissionBanner.svelte';
	import PwaPrompts from '$lib/components/ui/PwaPrompts.svelte';
	import StorageHealthBanner from '$lib/components/ui/StorageHealthBanner.svelte';
	import { onMount } from 'svelte';
	import { timers, activeTimers, preferences } from '$lib/stores';
	import { setupWakeLockVisibilityHandler, syncWakeLock } from '$lib/utils/wake-lock';

	let { children } = $props();

	// Reflect the active theme's --color-primary into the theme-color meta so the
	// browser/OS chrome matches. Read after the theme attributes are applied.
	function updateThemeColor() {
		if (typeof document === 'undefined') return;
		const primaryColor = getComputedStyle(document.documentElement)
			.getPropertyValue('--color-primary')
			.trim();
		if (!primaryColor) return;
		let meta = document.querySelector('meta[name="theme-color"]');
		if (!meta) {
			meta = document.createElement('meta');
			meta.setAttribute('name', 'theme-color');
			document.head.appendChild(meta);
		}
		meta.setAttribute('content', primaryColor);
	}

	// §3.2 wiring: drive data-theme / data-primary on <html> from preferences.
	// - theme 'system' → remove data-theme so @media(prefers-color-scheme) drives it
	// - any explicit theme → set data-theme (wins over the media query)
	// - data-primary is only meaningful for Light/Dark (and system, which resolves
	//   to one of them); it is removed under Grey/Italiano.
	$effect(() => {
		const theme = $preferences.theme;
		const primary = $preferences.primary;
		if (typeof document === 'undefined') return;
		const root = document.documentElement;

		if (theme === 'system') {
			root.removeAttribute('data-theme');
		} else {
			root.setAttribute('data-theme', theme);
		}

		if (theme === 'light' || theme === 'dark' || theme === 'system') {
			root.setAttribute('data-primary', primary);
		} else {
			root.removeAttribute('data-primary');
		}

		updateThemeColor();
	});

	onMount(() => {
		// Initialize timers store (loads from localStorage and starts checking)
		timers.init();

		const removeVisibilityHandler = setupWakeLockVisibilityHandler();

		// In system mode the resolved primary flips with the OS light/dark
		// preference, so keep the theme-color meta in sync when it changes.
		const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleSchemeChange = () => updateThemeColor();
		darkModeQuery.addEventListener('change', handleSchemeChange);

		return () => {
			timers.destroy();
			removeVisibilityHandler();
			darkModeQuery.removeEventListener('change', handleSchemeChange);
			void syncWakeLock(false);
		};
	});

	// Check if there are active timers
	let hasActiveTimers = $derived($activeTimers.length > 0);
	let keepScreenAwake = $derived($preferences.keepScreenAwake && hasActiveTimers);

	$effect(() => {
		void syncWakeLock(keepScreenAwake);
	});
</script>

<svelte:head>
	<link rel="icon" href="/icons/icon.svg" />
	<title>Pizza Tool</title>
</svelte:head>

<div class="app">
	<Header />
	<main class="main-content">
		<PwaPrompts />
		<StorageHealthBanner />
		<NotificationPermissionBanner {hasActiveTimers} />
		{@render children()}
	</main>
	<Navigation />
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		min-height: 100dvh;
	}

	/* In screenshot mode, ensure app container spans full page height */
	:global(body.screenshot-mode) .app {
		min-height: 100%;
	}

	.main-content {
		flex: 1;
		padding: var(--spacing-md);
		padding-bottom: calc(var(--nav-height) + var(--spacing-md));
		max-width: 800px;
		margin: 0 auto;
		width: 100%;
	}
</style>
