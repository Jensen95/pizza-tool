<script lang="ts">
	import YeastConverter from '$lib/components/tools/YeastConverter.svelte';
</script>

<svelte:head>
	<title>Værktøjer - Pizza Tool</title>
</svelte:head>

<div class="tools-page">
	<div class="page-header">
		<h1>Værktøjer</h1>
		<p class="lead">Hurtige værktøjer til at justere gær og regne dej om.</p>
	</div>

	<div class="tools-grid">
		<a class="planner-card" href="/dough">
			<div>
				<p class="eyebrow">Dejplanlægger</p>
				<h2>Planlæg dejen efter klokken</h2>
				<p class="muted">
					Vælg hvornår dejen skal være klar, og få gærmængde, ingredienser i bagerprocent og en
					tidsplan. Håndterer melblandinger, fordej, surdej og hævning uden køleskab.
				</p>
			</div>
			<span class="go">Åbn dejplanlæggeren →</span>
		</a>

		<YeastConverter />
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

	.planner-card {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--color-primary-light);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		color: var(--color-text);
		text-decoration: none;
	}

	.planner-card:hover {
		text-decoration: none;
		box-shadow: var(--shadow-md);
	}

	.planner-card h2 {
		margin: 4px 0 8px;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: var(--font-size-xs);
		color: var(--color-primary);
		font-weight: 700;
		margin: 0;
	}

	.muted {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	.go {
		color: var(--color-primary);
		font-weight: 600;
		font-size: var(--font-size-sm);
	}
</style>
