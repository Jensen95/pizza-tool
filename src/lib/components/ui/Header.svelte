<script lang="ts">
	import { activeTimerCount, preferences } from '$lib/stores';
	import type { ColorTheme } from '$lib/stores/preferences';

	const themeLabels: Record<ColorTheme, string> = {
		system: 'Automatisk',
		light: 'Lys',
		dark: 'Mørk'
	};

	const nextTheme: Record<ColorTheme, ColorTheme> = {
		system: 'light',
		light: 'dark',
		dark: 'system'
	};

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

		<button
			type="button"
			class="theme-button"
			onclick={() => preferences.cycleColorTheme()}
			aria-label={`Tema: ${themeLabels[$preferences.colorTheme]}. Skift til ${themeLabels[nextTheme[$preferences.colorTheme]].toLowerCase()}`}
			title={`Tema: ${themeLabels[$preferences.colorTheme]}`}
		>
			{#if $preferences.colorTheme === 'light'}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="4" />
					<path
						d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
					/>
				</svg>
			{:else if $preferences.colorTheme === 'dark'}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
				</svg>
			{:else}
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="9" />
					<path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
				</svg>
			{/if}
			<span class="theme-label">{themeLabels[$preferences.colorTheme]}</span>
		</button>

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

	.theme-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		min-width: 44px;
		padding: 0 10px;
		border-radius: var(--radius-full);
		color: inherit;
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.theme-button:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	/* On a phone the icon says enough; the label is still in aria-label */
	@media (max-width: 420px) {
		.theme-label {
			display: none;
		}
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
