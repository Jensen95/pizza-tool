<script lang="ts">
	import { onMount } from 'svelte';
	import { preferences } from '$lib/stores/preferences';
	import { isWakeLockSupported } from '$lib/utils/wake-lock';

	let isSupported = $state(false);

	onMount(() => {
		isSupported = isWakeLockSupported();
	});

	function toggleKeepAwake(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		preferences.updatePreference('keepScreenAwake', target.checked);
	}
</script>

<div class="keep-awake-card">
	<div class="card-content">
		<div class="title-row">
			<h2 class="card-title">Hold skærmen tændt under bagning</h2>
			<label class="switch">
				<input
					type="checkbox"
					checked={$preferences.keepScreenAwake}
					onchange={toggleKeepAwake}
					disabled={!isSupported}
					aria-label="Hold skærmen tændt under bagning"
				/>
				<span class="slider"></span>
			</label>
		</div>
		<p class="card-description">
			Forhindrer at skærmen slukker mens timere kører. Kan øge batteriforbruget.
		</p>
		{#if !isSupported}
			<p class="support-note">Din browser understøtter ikke at holde skærmen vågen.</p>
		{:else if !$preferences.keepScreenAwake}
			<p class="support-note">Aktiver når du bager, så timere forbliver synlige.</p>
		{/if}
	</div>
</div>

<style>
	.keep-awake-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.card-content {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.card-title {
		margin: 0;
		font-size: var(--font-size-lg);
	}

	.card-description {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.4;
	}

	.support-note {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
	}

	.switch {
		position: relative;
		display: inline-block;
		width: 48px;
		height: 26px;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
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

	input:checked + .slider {
		background-color: var(--color-primary);
	}

	input:checked + .slider::before {
		transform: translateX(22px);
	}

	input:disabled + .slider {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
