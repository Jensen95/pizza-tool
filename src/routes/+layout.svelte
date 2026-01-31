<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/ui/Header.svelte';
	import Navigation from '$lib/components/ui/Navigation.svelte';
	import { onMount } from 'svelte';
	import { TimerManager } from '$lib/utils/timer-manager';

	let { children } = $props();

	onMount(() => {
		// Initialize timer manager
		const timerManager = new TimerManager();
		timerManager.start();

		return () => {
			timerManager.stop();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href="/icons/icon.svg" />
	<title>Pizza Tool</title>
</svelte:head>

<div class="app">
	<Header />
	<main class="main-content">
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

	.main-content {
		flex: 1;
		padding: var(--spacing-md);
		padding-bottom: calc(var(--nav-height) + var(--spacing-md));
		max-width: 800px;
		margin: 0 auto;
		width: 100%;
	}
</style>
