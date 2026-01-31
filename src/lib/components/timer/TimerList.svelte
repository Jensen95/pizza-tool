<script lang="ts">
	import { get } from 'svelte/store';
	import { activeTimers, completedTimers, timers } from '$lib/stores';
	import TimerCard from './TimerCard.svelte';

	let activeList = $derived(get(activeTimers));
	let completedList = $derived(get(completedTimers));
	let hasActiveTimers = $derived(activeList.length > 0);
	let hasCompletedTimers = $derived(completedList.length > 0);
	let hasAnyTimers = $derived(hasActiveTimers || hasCompletedTimers);

	function clearCompleted() {
		timers.clearCompleted();
	}
</script>

<div class="timer-list">
	{#if !hasAnyTimers}
		<div class="empty-state">
			<span class="empty-icon">⏱️</span>
			<p class="empty-text">Ingen aktive timere</p>
			<p class="empty-hint">Opret en timer nedenfor eller start en fra en opskrift</p>
		</div>
	{:else}
		{#if hasActiveTimers}
			<section class="timer-section">
				<h3 class="section-title">Aktive timere</h3>
				<div class="timer-grid">
					{#each activeList as timer (timer.id)}
						<TimerCard {timer} />
					{/each}
				</div>
			</section>
		{/if}

		{#if hasCompletedTimers}
			<section class="timer-section">
				<div class="section-header">
					<h3 class="section-title">Faerdige timere</h3>
					<button class="btn btn-secondary clear-btn" onclick={clearCompleted}>
						Ryd alle
					</button>
				</div>
				<div class="timer-grid">
					{#each completedList as timer (timer.id)}
						<TimerCard {timer} />
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.timer-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-xl);
		background: var(--color-surface);
		border-radius: var(--radius-md);
	}

	.empty-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: var(--spacing-md);
	}

	.empty-text {
		font-size: var(--font-size-lg);
		margin: 0 0 var(--spacing-sm);
	}

	.empty-hint {
		color: var(--color-text-secondary);
		margin: 0;
	}

	.timer-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-title {
		margin: 0;
		font-size: var(--font-size-lg);
	}

	.clear-btn {
		font-size: var(--font-size-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		min-height: auto;
	}

	.timer-grid {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	@media (min-width: 600px) {
		.timer-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
