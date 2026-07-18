<script lang="ts">
	import { activeTimerCount } from '$lib/stores';
	import ThemeSwitcher from './ThemeSwitcher.svelte';

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

		{#if !showBack}
			<img
				src="/icons/icon.svg"
				alt=""
				aria-hidden="true"
				class="header-logo"
				width="28"
				height="28"
			/>
		{/if}

		<h1 class="header-title">{title}</h1>

		{#if $activeTimerCount > 0}
			<a href="/timers" class="timer-indicator" aria-label="{$activeTimerCount} aktive timere">
				<span class="timer-icon">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
				</span>
				<span class="timer-count">{$activeTimerCount}</span>
			</a>
		{/if}

		<ThemeSwitcher />
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

	.header-logo {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
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
		line-height: 0;
	}

	.timer-count {
		font-weight: 600;
	}
</style>
