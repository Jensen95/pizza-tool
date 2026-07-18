<script lang="ts">
	// ABOUTME: Dumb, presentational "last time" nudge (§5.5). Given the most-recent
	// DoughLogEntry for the current recipe and the calculator's current effective
	// hydration, it renders a dismissible one-line hint like
	// "Sidste gang brugte du 5% mindre vand". No store access, no side effects —
	// the parent passes the values in and (optionally) reacts to dismissal.
	import type { DoughLogEntry } from '$lib/models/dough-log.types';

	let {
		latest = null,
		currentHydration = null,
		threshold = 1,
		ondismiss
	}: {
		/** The most recent log entry for this recipe, or null if there are none. */
		latest?: DoughLogEntry | null;
		/** The current effective hydration in the calculator (%). */
		currentHydration?: number | null;
		/** Minimum absolute % difference before the nudge shows. Defaults to 1. */
		threshold?: number;
		/** Optional callback when the user dismisses the hint. */
		ondismiss?: () => void;
	} = $props();

	let dismissed = $state(false);

	// Positive delta = last bake used MORE water than the current setting.
	let delta = $derived(
		latest != null &&
			latest.hydration != null &&
			currentHydration != null &&
			Number.isFinite(latest.hydration) &&
			Number.isFinite(currentHydration)
			? Math.round((latest.hydration - currentHydration) * 10) / 10
			: null
	);

	let message = $derived.by(() => {
		if (delta == null || Math.abs(delta) < threshold) return null;
		const amount = Math.abs(delta);
		const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
		const direction = delta < 0 ? 'mindre' : 'mere';
		return `Sidste gang brugte du ${formatted}% ${direction} vand`;
	});

	let visible = $derived(!dismissed && message != null);

	function handleDismiss() {
		dismissed = true;
		ondismiss?.();
	}
</script>

{#if visible}
	<div class="nudge" role="note">
		<span class="nudge-icon" aria-hidden="true">💧</span>
		<p class="nudge-text">{message}</p>
		<button type="button" class="nudge-dismiss" onclick={handleDismiss} aria-label="Skjul hint">
			✕
		</button>
	</div>
{/if}

<style>
	.nudge {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-accent);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
	}

	.nudge-icon {
		font-size: 1.125rem;
		flex-shrink: 0;
		line-height: 1;
	}

	.nudge-text {
		margin: 0;
		flex: 1;
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.nudge-dismiss {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		font-size: 1.125rem;
		line-height: 1;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.nudge-dismiss:hover {
		background: var(--color-border);
		color: var(--color-text);
	}

	.nudge-dismiss:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}
</style>
