<script lang="ts">
	import { activeTimerCount } from '$lib/stores';

	let {
		title = 'Pizza Tool',
		showBack = false,
		backHref = '/'
	}: {
		title?: string;
		showBack?: boolean;
		backHref?: string;
	} = $props();
</script>

<header class="header">
	<div class="header-content">
		{#if showBack}
			<a href={backHref} class="back-button" aria-label="Tilbage">
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M19 12H5M12 19l-7-7 7-7" />
				</svg>
			</a>
		{/if}

		<h1 class="header-title">{title}</h1>

		{#if $activeTimerCount > 0}
			<a href="/timers" class="timer-indicator" aria-label="{$activeTimerCount} aktive timere">
				<span class="timer-icon">⏱️</span>
				<span class="timer-count">{$activeTimerCount}</span>
			</a>
		{/if}
	</div>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		background: var(--color-primary);
		color: var(--color-text-light);
		z-index: 50;
		padding-top: env(safe-area-inset-top);
	}

	.header-content {
		display: flex;
		align-items: center;
		height: var(--header-height);
		padding: 0 var(--spacing-md);
		gap: var(--spacing-md);
	}

	.back-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		color: inherit;
		margin-left: -8px;
	}

	.back-button:hover {
		opacity: 0.8;
	}

	.header-title {
		flex: 1;
		font-size: var(--font-size-lg);
		font-weight: 600;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.timer-indicator {
		display: flex;
		align-items: center;
		gap: 4px;
		background: rgba(255, 255, 255, 0.2);
		padding: 4px 10px;
		border-radius: var(--radius-full);
		color: inherit;
		text-decoration: none;
		font-size: var(--font-size-sm);
	}

	.timer-indicator:hover {
		background: rgba(255, 255, 255, 0.3);
		text-decoration: none;
	}

	.timer-icon {
		font-size: 1rem;
	}

	.timer-count {
		font-weight: 600;
	}
</style>
