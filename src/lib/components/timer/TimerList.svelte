<script lang="ts">
	import { activeTimers, completedTimers, timers } from '$lib/stores';
	import TimerCard from './TimerCard.svelte';

	// Use store subscriptions directly in template with $
	// For derived values, compute from store values
	let hasActiveTimers = $derived($activeTimers.length > 0);
	let hasCompletedTimers = $derived($completedTimers.length > 0);
	let hasAnyTimers = $derived(hasActiveTimers || hasCompletedTimers);

	function clearCompleted() {
		timers.clearCompleted();
	}
</script>

<div class="timer-list">
	{#if !hasAnyTimers}
		<div class="empty-state">
			<span class="empty-icon" aria-hidden="true">
				<svg
					width="48"
					height="48"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<polyline points="12 6 12 12 16 14" />
				</svg>
			</span>
			<p class="empty-text">Ingen aktive timere</p>
			<p class="empty-hint">Opret en timer nedenfor eller start en fra en opskrift</p>
		</div>
	{:else}
		{#if hasActiveTimers}
			<section class="timer-section">
				<h3 class="section-title">Aktive timere</h3>
				<div class="timer-grid">
					{#each $activeTimers as timer (timer.id)}
						<TimerCard {timer} />
					{/each}
				</div>
			</section>
		{/if}

		{#if hasCompletedTimers}
			<section class="timer-section">
				<div class="section-header">
					<h3 class="section-title">Færdige timere</h3>
					<button class="btn btn-secondary clear-btn" onclick={clearCompleted}> Ryd alle </button>
				</div>
				<div class="timer-grid">
					{#each $completedTimers as timer (timer.id)}
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
		color: var(--color-text-secondary);
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
