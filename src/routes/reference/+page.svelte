<script lang="ts">
	import FlourReference from '$lib/components/reference/FlourReference.svelte';
	import SauceRecipes from '$lib/components/reference/SauceRecipes.svelte';
	import TipsSection from '$lib/components/reference/TipsSection.svelte';

	type Tab = 'flour' | 'sauce' | 'tips';
	let activeTab = $state<Tab>('flour');

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'flour', label: 'Mel' },
		{ id: 'sauce', label: 'Sauce' },
		{ id: 'tips', label: 'Tips' }
	];
</script>

<svelte:head>
	<title>Reference - Pizza Tool</title>
</svelte:head>

<div class="reference-page">
	<h1 class="page-title">Reference</h1>

	<nav class="tabs">
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

	<div class="tab-content">
		{#if activeTab === 'flour'}
			<FlourReference />
		{:else if activeTab === 'sauce'}
			<SauceRecipes />
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

	.tabs {
		display: flex;
		gap: var(--spacing-xs);
		overflow-x: auto;
		padding-bottom: var(--spacing-xs);
		border-bottom: 2px solid var(--color-border);
	}

	.tab {
		flex-shrink: 0;
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
	}

	.tab:hover {
		color: var(--color-text);
	}

	.tab.active {
		color: var(--color-primary);
	}

	.tab.active::after {
		content: '';
		position: absolute;
		bottom: calc(-1 * var(--spacing-xs) - 2px);
		left: 0;
		right: 0;
		height: 2px;
		background: var(--color-primary);
	}

	.tab-content {
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
