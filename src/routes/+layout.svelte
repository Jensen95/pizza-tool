<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/ui/Header.svelte';
	import Navigation from '$lib/components/ui/Navigation.svelte';
	import NotificationPermissionBanner from '$lib/components/timer/NotificationPermissionBanner.svelte';
	import PwaPrompts from '$lib/components/ui/PwaPrompts.svelte';
	import { onMount } from 'svelte';
	import { timers, activeTimers, preferences } from '$lib/stores';
	import { setupWakeLockVisibilityHandler, syncWakeLock } from '$lib/utils/wake-lock';

	let { children } = $props();

	onMount(() => {
		// Initialize timers store (loads from localStorage and starts checking)
		timers.init();

		const removeVisibilityHandler = setupWakeLockVisibilityHandler();

		return () => {
			timers.destroy();
			removeVisibilityHandler();
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
