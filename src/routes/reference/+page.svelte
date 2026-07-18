<script lang="ts">
	import { onMount } from 'svelte';
	import FlourReference from '$lib/components/reference/FlourReference.svelte';
	import SauceRecipes from '$lib/components/reference/SauceRecipes.svelte';
	import TipsSection from '$lib/components/reference/TipsSection.svelte';
	import PizzaSuggestions from '$lib/components/reference/PizzaSuggestions.svelte';
	import YeastReference from '$lib/components/reference/YeastReference.svelte';
	import SizeGuide from '$lib/components/reference/SizeGuide.svelte';

	type Tab = 'pizzas' | 'flour' | 'sauce' | 'yeast' | 'sizes' | 'tips';
	let activeTab = $state<Tab>('pizzas');

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'pizzas', label: 'Pizzaer' },
		{ id: 'flour', label: 'Mel' },
		{ id: 'sauce', label: 'Sauce' },
		{ id: 'yeast', label: 'Gær' },
		{ id: 'sizes', label: 'Størrelser' },
		{ id: 'tips', label: 'Tips' }
	];

	// Right-edge fade mask: only visible while there is more tab-bar content to
	// scroll to, so it never lies about overflow that no longer exists.
	let tabsEl: HTMLElement | undefined = $state();
	let canScrollRight = $state(false);

	function updateScrollState() {
		if (!tabsEl) return;
		canScrollRight = tabsEl.scrollWidth - tabsEl.clientWidth - tabsEl.scrollLeft > 1;
	}

	onMount(() => {
		updateScrollState();
		window.addEventListener('resize', updateScrollState);
		return () => window.removeEventListener('resize', updateScrollState);
	});
</script>

<svelte:head>
	<title>Reference - Pizza Tool</title>
</svelte:head>

<div class="reference-page">
	<h1 class="page-title">Reference</h1>

	<div class="tabs-wrapper">
		<nav class="tabs" bind:this={tabsEl} onscroll={updateScrollState}>
			{#each tabs as tab}
				<button
					class="tab"
					class:active={activeTab === tab.id}
					onclick={() => (activeTab = tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</nav>
		<div class="tabs-fade" class:visible={canScrollRight} aria-hidden="true"></div>
	</div>

	<div class="tab-content">
		{#if activeTab === 'pizzas'}
			<PizzaSuggestions />
		{:else if activeTab === 'flour'}
			<FlourReference />
		{:else if activeTab === 'sauce'}
			<SauceRecipes />
		{:else if activeTab === 'yeast'}
			<YeastReference />
		{:else if activeTab === 'sizes'}
			<SizeGuide />
		{:else if activeTab === 'tips'}
			<TipsSection />
		{/if}
	</div>
</div>

<style>
	.reference-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.page-title {
		margin: 0;
		font-size: var(--font-size-xl);
	}

	.tabs-wrapper {
		position: relative;
		margin-bottom: var(--spacing-md);
	}

	.tabs {
		display: flex;
		gap: var(--spacing-xs);
		border-bottom: 2px solid var(--color-border);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	.tabs-fade {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 2px;
		width: 32px;
		background: linear-gradient(to right, transparent, var(--color-background));
		opacity: 0;
		transition: opacity 0.2s ease;
		pointer-events: none;
	}

	.tabs-fade.visible {
		opacity: 1;
	}

	.tab {
		flex-shrink: 0;
		min-height: 44px;
		display: flex;
		align-items: center;
		padding: var(--spacing-sm) var(--spacing-md);
		background: none;
		border: none;
		font-size: var(--font-size-md);
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		position: relative;
		transition: color 0.2s;
		white-space: nowrap;
		margin-bottom: -2px;
	}

	.tab:hover {
		color: var(--color-text);
	}

	.tab.active {
		color: var(--color-primary);
		border-bottom: 2px solid var(--color-primary);
	}

	@media (prefers-reduced-motion: no-preference) {
		.tab-content {
			animation: fadeIn 0.2s ease-out;
		}
	}
</style>
