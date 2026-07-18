<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Timer } from '$lib/models';
	import { formatTimeRemaining, formatFinishTime } from '$lib/models/timer.types';
	import { timers, getTimeRemaining } from '$lib/stores';

	let { timer }: { timer: Timer } = $props();

	let timeRemaining = $state(0);
	let progress = $state(0);
	let finishTime = $state(0);
	let intervalId: ReturnType<typeof setInterval>;
	let confirmingDelete = $state(false);
	let confirmTimeoutId: ReturnType<typeof setTimeout> | undefined;

	function updateTimer() {
		timeRemaining = getTimeRemaining(timer);
		progress = timer.duration > 0 ? ((timer.duration - timeRemaining) / timer.duration) * 100 : 100;
		if (timer.status === 'active') {
			finishTime = timer.endTime;
		} else if (timer.status === 'paused' && timer.remainingWhenPaused !== undefined) {
			finishTime = Date.now() + timer.remainingWhenPaused;
		} else {
			finishTime = 0;
		}
	}

	onMount(() => {
		updateTimer();
		intervalId = setInterval(updateTimer, 1000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
		if (confirmTimeoutId) clearTimeout(confirmTimeoutId);
	});

	function handlePause() {
		timers.pause(timer.id);
	}

	function handleResume() {
		timers.resume(timer.id);
	}

	// Tap-again-to-confirm: first tap arms the confirm state (and reverts on its own
	// after a few seconds if untouched); a second tap while armed performs the delete.
	function handleCancel() {
		if (confirmingDelete) {
			if (confirmTimeoutId) clearTimeout(confirmTimeoutId);
			confirmingDelete = false;
			timers.remove(timer.id);
			return;
		}

		confirmingDelete = true;
		confirmTimeoutId = setTimeout(() => {
			confirmingDelete = false;
		}, 3000);
	}

	let isCompleted = $derived(timer.status === 'completed');
	let isPaused = $derived(timer.status === 'paused');
	let isActive = $derived(timer.status === 'active');
	let isNearingCompletion = $derived(isActive && progress >= 85);
	let deleteLabel = $derived(isCompleted ? 'Fjern' : 'Annuller');
</script>

<div class="timer-card" class:completed={isCompleted} class:paused={isPaused}>
	<div class="timer-meter" class:nearing={isNearingCompletion} aria-hidden="true">
		<div class="timer-meter-fill" style="width: {progress}%"></div>
	</div>
	{#if !isCompleted}
		<p class="timer-meter-label">{formatTimeRemaining(timeRemaining)} tilbage</p>
	{/if}

	<div class="timer-content">
		<div class="timer-info">
			<h3 class="timer-name">{timer.name}</h3>
			<div class="timer-status">
				{#if isCompleted}
					<span class="status-badge completed">Færdig!</span>
				{:else if isPaused}
					<span class="status-badge paused">Pauset</span>
				{:else}
					<span class="status-badge active">Aktiv</span>
				{/if}
			</div>
		</div>

		<div class="timer-display">
			<span class="time-remaining">{formatTimeRemaining(timeRemaining)}</span>
			{#if finishTime > 0}
				<span class="finish-time">Færdig: {formatFinishTime(finishTime)}</span>
			{/if}
		</div>

		<div class="timer-actions">
			{#if isActive}
				<button class="btn btn-secondary" onclick={handlePause}> Pause </button>
			{:else if isPaused}
				<button class="btn btn-primary" onclick={handleResume}> Fortsæt </button>
			{/if}

			<button
				class="btn btn-secondary delete-btn"
				class:confirming={confirmingDelete}
				onclick={handleCancel}
				aria-label={confirmingDelete
					? `Tryk igen for at ${deleteLabel.toLowerCase()} "${timer.name}"`
					: `${deleteLabel} "${timer.name}"`}
			>
				{confirmingDelete ? 'Sikker?' : deleteLabel}
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

	.timer-meter {
		height: 8px;
		width: 100%;
		background: var(--color-border);
	}

	.timer-meter-fill {
		height: 100%;
		background: var(--color-primary);
		transition:
			width 1s linear,
			background-color 0.3s ease;
	}

	.timer-card.completed .timer-meter-fill {
		background: var(--color-success);
	}

	.timer-card.paused .timer-meter-fill {
		background: var(--color-warning);
	}

	.timer-meter.nearing .timer-meter-fill {
		background: var(--color-warning);
	}

	.timer-meter-label {
		margin: 0;
		padding: 4px var(--spacing-md) 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	@media (prefers-reduced-motion: no-preference) {
		@keyframes completedPulse {
			0%,
			100% {
				box-shadow: var(--shadow-sm);
			}
			50% {
				box-shadow: 0 0 0 4px rgba(76, 175, 80, 0.3);
			}
		}

		.timer-card.completed {
			animation: completedPulse 2s ease-in-out 3;
		}
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
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.finish-time {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
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

	.delete-btn.confirming {
		background: var(--color-error, var(--color-warning));
		color: var(--color-text-light);
	}
</style>
