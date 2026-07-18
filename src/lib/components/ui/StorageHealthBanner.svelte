<script lang="ts">
	import { storageHealth, retryPendingWrites } from '$lib/utils/storage';

	let isRetrying = $state(false);
	// The `failedKeys` signature the user last dismissed. When a new failure
	// appears the signature changes and the banner surfaces itself again.
	let dismissedSignature = $state<string | null>(null);

	let signature = $derived($storageHealth.failedKeys.join(','));
	let hasFailure = $derived($storageHealth.lastFailure !== null);
	let visible = $derived(hasFailure && signature !== dismissedSignature);

	async function handleRetry() {
		isRetrying = true;
		try {
			retryPendingWrites();
		} finally {
			isRetrying = false;
		}
	}

	function handleDismiss() {
		dismissedSignature = signature;
	}
</script>

{#if visible}
	<div class="storage-banner" role="alert" aria-live="assertive">
		<div class="banner-content">
			<span class="banner-icon" aria-hidden="true">💾</span>
			<div class="banner-text">
				<strong class="banner-title">Ændringer kunne ikke gemmes på enheden</strong>
				<p class="banner-description">
					Dine seneste ændringer er stadig synlige her, men blev ikke gemt. Luk ikke appen — prøv at
					gemme igen.
				</p>
			</div>
			<button
				class="dismiss-button"
				onclick={handleDismiss}
				aria-label="Luk besked"
				title="Skjul denne besked"
			>
				✕
			</button>
		</div>
		<button class="btn btn-retry" onclick={handleRetry} disabled={isRetrying}>
			{isRetrying ? 'Prøver igen...' : 'Prøv igen'}
		</button>
	</div>
{/if}

<style>
	.storage-banner {
		background: var(--color-warning-bg);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		margin-bottom: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.banner-content {
		display: flex;
		gap: var(--spacing-sm);
		align-items: flex-start;
	}

	.banner-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.banner-text {
		flex: 1;
	}

	.banner-title {
		display: block;
		margin-bottom: var(--spacing-xs);
		color: var(--color-text);
		font-size: var(--font-size-md);
	}

	.banner-description {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.4;
	}

	.dismiss-button {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 1.5rem;
		line-height: 1;
		padding: 0;
		margin-left: var(--spacing-xs);
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.dismiss-button:hover {
		background-color: var(--color-border);
		color: var(--color-text);
	}

	.dismiss-button:focus-visible {
		outline: 2px solid var(--color-warning);
		outline-offset: 2px;
	}

	.btn-retry {
		width: 100%;
		min-height: 44px;
		background: var(--color-warning);
		color: var(--color-text-light);
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--font-size-md);
		cursor: pointer;
	}

	.btn-retry:disabled {
		opacity: 0.6;
		cursor: default;
	}

	@media (min-width: 600px) {
		.storage-banner {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}

		.btn-retry {
			width: auto;
			flex-shrink: 0;
		}
	}
</style>
