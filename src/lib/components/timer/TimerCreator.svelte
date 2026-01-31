<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { timers } from '$lib/stores';
	import { defaultPresets } from '$lib/types/timer';

	const dispatch = createEventDispatcher<{ created: void }>();

	let timerName = '';
	let hours = 0;
	let minutes = 30;
	let showCustom = false;

	function createFromPreset(preset: typeof defaultPresets[0]) {
		timers.create(preset.nameDa, preset.duration);
		dispatch('created');
	}

	function createCustomTimer() {
		if (!timerName.trim()) {
			timerName = 'Timer';
		}

		const totalMinutes = hours * 60 + minutes;
		if (totalMinutes <= 0) return;

		timers.create(timerName, totalMinutes);

		// Reset form
		timerName = '';
		hours = 0;
		minutes = 30;
		showCustom = false;

		dispatch('created');
	}

	function toggleCustom() {
		showCustom = !showCustom;
	}
</script>

<div class="timer-creator">
	{#if showCustom}
		<div class="custom-timer-form">
			<h3 class="form-title">Ny timer</h3>

			<div class="form-group">
				<label class="label" for="timer-name">Navn</label>
				<input
					id="timer-name"
					type="text"
					class="input"
					placeholder="F.eks. Poolish, Autolyse..."
					bind:value={timerName}
				/>
			</div>

			<div class="duration-inputs">
				<div class="form-group">
					<label class="label" for="timer-hours">Timer</label>
					<input
						id="timer-hours"
						type="number"
						class="input"
						min="0"
						max="72"
						bind:value={hours}
					/>
				</div>

				<div class="form-group">
					<label class="label" for="timer-minutes">Minutter</label>
					<input
						id="timer-minutes"
						type="number"
						class="input"
						min="0"
						max="59"
						bind:value={minutes}
					/>
				</div>
			</div>

			<div class="form-actions">
				<button class="btn btn-secondary" on:click={toggleCustom}>
					Annuller
				</button>
				<button
					class="btn btn-primary"
					on:click={createCustomTimer}
					disabled={hours === 0 && minutes === 0}
				>
					Start timer
				</button>
			</div>
		</div>
	{:else}
		<div class="presets">
			<h3 class="presets-title">Hurtige timere</h3>

			<div class="preset-grid">
				{#each defaultPresets as preset}
					<button
						class="preset-btn"
						on:click={() => createFromPreset(preset)}
					>
						<span class="preset-name">{preset.nameDa}</span>
						{#if preset.descriptionDa}
							<span class="preset-desc">{preset.descriptionDa}</span>
						{/if}
					</button>
				{/each}
			</div>

			<button class="btn btn-outline custom-btn" on:click={toggleCustom}>
				Opret tilpasset timer
			</button>
		</div>
	{/if}
</div>

<style>
	.timer-creator {
		background: var(--color-surface);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.presets-title,
	.form-title {
		margin: 0 0 var(--spacing-md);
		font-size: var(--font-size-lg);
	}

	.preset-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-md);
	}

	@media (max-width: 400px) {
		.preset-grid {
			grid-template-columns: 1fr;
		}
	}

	.preset-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		text-align: left;
		transition: border-color 0.2s, background 0.2s;
	}

	.preset-btn:hover {
		border-color: var(--color-primary);
		background: var(--color-surface);
	}

	.preset-name {
		font-weight: 500;
		color: var(--color-text);
	}

	.preset-desc {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.custom-btn {
		width: 100%;
	}

	.custom-timer-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.duration-inputs {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-md);
	}

	.form-actions {
		display: flex;
		gap: var(--spacing-sm);
		justify-content: flex-end;
	}
</style>
