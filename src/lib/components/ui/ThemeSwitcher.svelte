<script lang="ts">
	import { onMount } from 'svelte';
	import { preferences } from '$lib/stores';
	import type { Theme, Primary } from '$lib/stores/preferences';
	import { isWakeLockSupported } from '$lib/utils/wake-lock';

	// Compact, accessible theme + accent picker (§3.2). Lives as a gear in the
	// Header; opens a small popover. Native radios give full keyboard/AT support.
	const themeOptions: { value: Theme; label: string }[] = [
		{ value: 'system', label: 'System' },
		{ value: 'light', label: 'Lys' },
		{ value: 'dark', label: 'Mørk' },
		{ value: 'grey', label: 'Grå' },
		{ value: 'italiano', label: 'Italiano' }
	];

	const primaryOptions: { value: Primary; label: string }[] = [
		{ value: 'basil', label: 'Basil' },
		{ value: 'crust', label: 'Crust' },
		{ value: 'flip', label: 'Flip' }
	];

	let open = $state(false);
	let triggerEl: HTMLButtonElement | undefined = $state();
	let panelEl: HTMLDivElement | undefined = $state();

	// Keep-awake is a global preference (not timer-scoped), so it lives here in the
	// header settings popover rather than on the Timers page (§4 Proposal A / §6 decision 7).
	let wakeLockSupported = $state(false);
	onMount(() => {
		wakeLockSupported = isWakeLockSupported();
	});

	function toggleKeepAwake(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		preferences.updatePreference('keepScreenAwake', target.checked);
	}

	// The accent picker is only meaningful for Light/Dark (and System, which
	// resolves to one of them); hidden under Grey/Italiano.
	let showPrimary = $derived(
		$preferences.theme === 'system' ||
			$preferences.theme === 'light' ||
			$preferences.theme === 'dark'
	);

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			close();
			triggerEl?.focus();
		}
	}

	function onWindowPointerDown(event: PointerEvent) {
		if (!open) return;
		const target = event.target as Node;
		if (panelEl?.contains(target) || triggerEl?.contains(target)) return;
		close();
	}

	function selectTheme(value: Theme) {
		preferences.setTheme(value);
	}

	function selectPrimary(value: Primary) {
		preferences.setPrimary(value);
	}
</script>

<svelte:window onkeydown={onKeydown} onpointerdown={onWindowPointerDown} />

<div class="theme-switcher">
	<button
		bind:this={triggerEl}
		type="button"
		class="trigger"
		aria-label="Temaindstillinger"
		aria-haspopup="dialog"
		aria-expanded={open}
		onclick={toggle}
	>
		<svg
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="3" />
			<path
				d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
			/>
		</svg>
	</button>

	{#if open}
		<div bind:this={panelEl} class="panel" role="dialog" aria-label="Vælg tema">
			<fieldset class="group">
				<legend class="group-legend">Tema</legend>
				<div class="segments">
					{#each themeOptions as option (option.value)}
						<label class="segment" class:active={$preferences.theme === option.value}>
							<input
								type="radio"
								name="theme"
								value={option.value}
								checked={$preferences.theme === option.value}
								onchange={() => selectTheme(option.value)}
							/>
							<span>{option.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>

			{#if showPrimary}
				<fieldset class="group">
					<legend class="group-legend">Accentfarve</legend>
					<div class="segments">
						{#each primaryOptions as option (option.value)}
							<label class="segment" class:active={$preferences.primary === option.value}>
								<input
									type="radio"
									name="primary"
									value={option.value}
									checked={$preferences.primary === option.value}
									onchange={() => selectPrimary(option.value)}
								/>
								<span>{option.label}</span>
							</label>
						{/each}
					</div>
				</fieldset>
			{/if}

			<div class="group">
				<span class="group-legend">Under bagning</span>
				<label class="toggle-row">
					<span class="toggle-text">
						<span class="toggle-title">Hold skærmen tændt</span>
						<span class="toggle-help">Forhindrer at skærmen slukker mens timere kører.</span>
					</span>
					<span class="switch">
						<input
							type="checkbox"
							checked={$preferences.keepScreenAwake}
							onchange={toggleKeepAwake}
							disabled={!wakeLockSupported}
							aria-label="Hold skærmen tændt under bagning"
						/>
						<span class="slider"></span>
					</span>
				</label>
				{#if !wakeLockSupported}
					<p class="toggle-help unsupported">
						Din browser understøtter ikke at holde skærmen vågen.
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.theme-switcher {
		position: relative;
		display: flex;
	}

	.trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		color: inherit;
		border-radius: var(--radius-md);
		background: none;
	}

	.trigger:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.panel {
		position: absolute;
		top: calc(100% + var(--spacing-xs));
		right: 0;
		z-index: 100;
		width: min(280px, calc(100vw - 2 * var(--spacing-md)));
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface-elevated);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
	}

	.group {
		border: none;
		padding: 0;
		margin: 0;
	}

	.group-legend {
		padding: 0;
		margin-bottom: var(--spacing-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.segments {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.segment {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 var(--spacing-md);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	.segment:hover {
		border-color: var(--color-primary);
	}

	.segment.active {
		background: var(--color-primary);
		color: var(--color-on-primary);
		border-color: var(--color-primary);
	}

	/* Visually-hidden native radio keeps full keyboard + screen-reader support. */
	.segment input {
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

	.segment:has(input:focus-visible) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
		min-height: 44px;
		cursor: pointer;
	}

	.toggle-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.toggle-title {
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.toggle-help {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.toggle-help.unsupported {
		margin-top: var(--spacing-xs);
	}

	.switch {
		position: relative;
		display: inline-block;
		flex-shrink: 0;
		width: 48px;
		height: 26px;
	}

	.switch input {
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

	.slider {
		position: absolute;
		inset: 0;
		cursor: pointer;
		background-color: var(--color-border);
		transition: 0.2s;
		border-radius: 26px;
	}

	.slider::before {
		position: absolute;
		content: '';
		height: 22px;
		width: 22px;
		left: 2px;
		bottom: 2px;
		background-color: white;
		transition: 0.2s;
		border-radius: 50%;
		box-shadow: var(--shadow-sm);
	}

	.switch input:checked + .slider {
		background-color: var(--color-primary);
	}

	.switch input:checked + .slider::before {
		transform: translateX(22px);
	}

	.switch input:disabled + .slider {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.switch input:focus-visible + .slider {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
</style>
