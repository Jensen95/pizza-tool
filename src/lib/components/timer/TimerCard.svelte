<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Timer } from '$lib/types';
	import { formatTimeRemaining } from '$lib/types/timer';
	import { timers, getTimeRemaining } from '$lib/stores';

	let { timer }: { timer: Timer } = $props();

	let timeRemaining = $state(0);
	let progress = $state(0);
	let intervalId: ReturnType<typeof setInterval>;

	function updateTimer() {
		timeRemaining = getTimeRemaining(timer);
		progress = timer.duration > 0 ? ((timer.duration - timeRemaining) / timer.duration) * 100 : 100;
	}

	onMount(() => {
		updateTimer();
		intervalId = setInterval(updateTimer, 1000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	function handlePause() {
		timers.pause(timer.id);
	}

	function handleResume() {
		timers.resume(timer.id);
	}

	function handleCancel() {
		timers.remove(timer.id);
	}

	let isCompleted = $derived(timer.status === 'completed');
	let isPaused = $derived(timer.status === 'paused');
	let isActive = $derived(timer.status === 'active');
</script>

<div class="timer-card" class:completed={isCompleted} class:paused={isPaused}>
	<div class="timer-progress" style="--progress: {progress}%"></div>

	<div class="timer-content">
		<div class="timer-info">
			<h3 class="timer-name">{timer.name}</h3>
			<div class="timer-status">
				{#if isCompleted}
					<span class="status-badge completed">Faerdig!</span>
				{:else if isPaused}
					<span class="status-badge paused">Pauset</span>
				{:else}
					<span class="status-badge active">Aktiv</span>
				{/if}
			</div>
		</div>

		<div class="timer-display">
			<span class="time-remaining">{formatTimeRemaining(timeRemaining)}</span>
		</div>

		<div class="timer-actions">
			{#if isActive}
				<button class="btn btn-secondary" onclick={handlePause}>
					Pause
				</button>
			{:else if isPaused}
				<button class="btn btn-primary" onclick={handleResume}>
					Fortsaet
				</button>
			{/if}

			<button class="btn btn-secondary delete-btn" onclick={handleCancel}>
				{isCompleted ? 'Fjern' : 'Annuller'}
			</button>
		</div>
	</div>
</div>

<style>
	.timer-card {
		position: relative;
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.timer-card.completed {
		border: 2px solid var(--color-success);
	}

	.timer-card.paused {
		opacity: 0.8;
	}

	.timer-progress {
		position: absolute;
		top: 0;
		left: 0;
		height: 4px;
		width: var(--progress, 0%);
		background: var(--color-primary);
		transition: width 1s linear;
	}

	.timer-card.completed .timer-progress {
		background: var(--color-success);
	}

	.timer-content {
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.timer-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.timer-name {
		margin: 0;
		font-size: var(--font-size-md);
		font-weight: 600;
	}

	.status-badge {
		font-size: var(--font-size-xs);
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-weight: 500;
	}

	.status-badge.active {
		background: var(--color-primary);
		color: var(--color-text-light);
	}

	.status-badge.paused {
		background: var(--color-warning);
		color: var(--color-text);
	}

	.status-badge.completed {
		background: var(--color-success);
		color: var(--color-text-light);
	}

	.timer-display {
		text-align: center;
		padding: var(--spacing-sm) 0;
	}

	.time-remaining {
		font-size: var(--font-size-2xl);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-primary);
	}

	.timer-card.completed .time-remaining {
		color: var(--color-success);
	}

	.timer-actions {
		display: flex;
		gap: var(--spacing-sm);
	}

	.timer-actions .btn {
		flex: 1;
	}

	.delete-btn {
		flex: 0 0 auto !important;
	}
</style>
