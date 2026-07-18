<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { activeTimers, completedTimers, timers } from '$lib/stores';
	import type { TimerStatus } from '$lib/models';
	import { getPermissionStatus, isNotificationSupported } from '$lib/utils/notification';
	import TimerCard from './TimerCard.svelte';

	// Use store subscriptions directly in template with $
	// For derived values, compute from store values
	let hasActiveTimers = $derived($activeTimers.length > 0);
	let hasCompletedTimers = $derived($completedTimers.length > 0);
	let hasAnyTimers = $derived(hasActiveTimers || hasCompletedTimers);

	// Track notification permission so we can set honest expectations once it is granted:
	// notifications only fire while the app is open or resumed from the background (there
	// is no push server), so a fully-closed app won't alert. See §7.7.
	let permissionStatus = $state<'granted' | 'denied' | 'default' | 'unsupported'>('default');

	onMount(() => {
		permissionStatus = getPermissionStatus();

		if (isNotificationSupported() && 'permissions' in navigator) {
			navigator.permissions.query({ name: 'notifications' }).then((permissionObj) => {
				permissionObj.onchange = () => {
					permissionStatus = getPermissionStatus();
				};
			});
		}
	});

	let showNotificationHint = $derived(hasActiveTimers && permissionStatus === 'granted');

	// Tap-again-to-confirm: first tap arms the confirm state (auto-reverts after a few
	// seconds if untouched); a second tap while armed actually clears the timers.
	let confirmingClear = $state(false);
	let confirmClearTimeoutId: ReturnType<typeof setTimeout> | undefined;

	function clearCompleted() {
		if (confirmingClear) {
			if (confirmClearTimeoutId) clearTimeout(confirmClearTimeoutId);
			confirmingClear = false;
			timers.clearCompleted();
			return;
		}

		confirmingClear = true;
		confirmClearTimeoutId = setTimeout(() => {
			confirmingClear = false;
		}, 3000);
	}

	// Visually-hidden live region: announce timer status transitions (complete/pause/resume)
	// for screen-reader users, since the visual status badge alone doesn't notify them.
	let announcement = $state('');
	let previousStatuses = new Map<string, TimerStatus>();

	$effect(() => {
		const current = $timers;
		for (const timer of current) {
			const prev = previousStatuses.get(timer.id);
			if (prev !== undefined && prev !== timer.status) {
				if (timer.status === 'completed') {
					announcement = `"${timer.name}" er færdig`;
				} else if (timer.status === 'paused') {
					announcement = `"${timer.name}" er sat på pause`;
				} else if (timer.status === 'active' && prev === 'paused') {
					announcement = `"${timer.name}" er genoptaget`;
				}
			}
		}
		previousStatuses = new Map(current.map((timer) => [timer.id, timer.status]));
	});

	onDestroy(() => {
		if (confirmClearTimeoutId) clearTimeout(confirmClearTimeoutId);
	});
</script>

<div class="visually-hidden" role="status" aria-live="polite">{announcement}</div>

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
					<button
						class="btn btn-secondary clear-btn"
						class:confirming={confirmingClear}
						onclick={clearCompleted}
						aria-label={confirmingClear
							? 'Tryk igen for at rydde alle færdige timere'
							: 'Ryd alle færdige timere'}
					>
						{confirmingClear ? 'Sikker?' : 'Ryd alle'}
					</button>
				</div>
				<div class="timer-grid">
					{#each $completedTimers as timer (timer.id)}
						<TimerCard {timer} />
					{/each}
				</div>
			</section>
		{/if}

		{#if showNotificationHint}
			<p class="notification-hint">
				Notifikationer sendes kun, mens appen er åben eller aktiv i baggrunden — de virker ikke,
				hvis appen er lukket helt.
			</p>
		{/if}
	{/if}
</div>

<style>
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

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

	.clear-btn.confirming {
		background: var(--color-error, var(--color-warning));
		color: var(--color-text-light);
	}

	.timer-grid {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.notification-hint {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.4;
	}

	@media (min-width: 600px) {
		.timer-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
