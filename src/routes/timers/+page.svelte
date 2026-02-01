<script lang="ts">
	import TimerList from '$lib/components/timer/TimerList.svelte';
	import TimerCreator from '$lib/components/timer/TimerCreator.svelte';
</script>

<svelte:head>
	<title>Timere - Pizza Tool</title>
</svelte:head>

<div class="timers-page">
	<h1 class="page-title">Timere</h1>

	<TimerList />

	<section class="creator-section">
		<h2 class="section-title">Opret ny timer</h2>
		<TimerCreator />
	</section>
</div>

<style>
	.timers-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.page-title {
		margin: 0;
		font-size: var(--font-size-xl);
	}

	.section-title {
		margin: 0 0 var(--spacing-md);
		font-size: var(--font-size-lg);
	}

	.creator-section {
		background: var(--color-surface);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
	}
</style>
