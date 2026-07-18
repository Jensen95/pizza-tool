<script lang="ts">
	import BakerMathLab from '$lib/components/tools/BakerMathLab.svelte';
	import DoughPlanner from '$lib/components/tools/DoughPlanner.svelte';
	import YeastConverter from '$lib/components/tools/YeastConverter.svelte';
</script>

<svelte:head>
	<title>Værktøjer - Pizza Tool</title>
</svelte:head>

<div class="tools-page">
	<div class="page-header">
		<h1>Værktøjer</h1>
		<p class="lead">
			Hurtige værktøjer til at planlægge hævning, justere gær, arbejde i bagerprocenter og
			eksperimentere med hydration.
		</p>
	</div>

	<div class="tools-grid">
		<DoughPlanner />
		<YeastConverter />
		<BakerMathLab />
	</div>
</div>

<style>
	.tools-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.page-header h1 {
		margin: 0 0 var(--spacing-xs);
	}

	.lead {
		margin: 0;
		color: var(--color-text-secondary);
	}

	.tools-grid {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}
</style>
