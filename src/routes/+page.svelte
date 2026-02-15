<script lang="ts">
	import RecipeList from '$lib/components/recipe/RecipeList.svelte';
	import KeepAwakeToggle from '$lib/components/timer/KeepAwakeToggle.svelte';
</script>

<svelte:head>
	<title>Opskrifter - Pizza Tool</title>
</svelte:head>

<div class="page-stack">
	<KeepAwakeToggle />
	<RecipeList />
</div>

<style>
	.page-stack {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}
</style>
