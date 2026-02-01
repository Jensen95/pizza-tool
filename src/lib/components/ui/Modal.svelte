<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = false,
		title = '',
		showClose = true,
		onclose,
		children,
		footer
	}: {
		open?: boolean;
		title?: string;
		showClose?: boolean;
		onclose?: () => void;
		children?: Snippet;
		footer?: Snippet;
	} = $props();

	function handleClose() {
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={handleBackdropClick}>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
			<div class="modal-header">
				<h2 id="modal-title" class="modal-title">{title}</h2>
				{#if showClose}
					<button class="close-button" onclick={handleClose} aria-label="Luk">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
			<div class="modal-body">
				{#if children}
					{@render children()}
				{/if}
			</div>
			{#if footer}
				<div class="modal-footer">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
		padding: var(--spacing-md);
	}

	.modal {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow: auto;
		animation: modalIn 0.2s ease-out;
	}

	@keyframes modalIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
	}

	.modal-title {
		margin: 0;
		font-size: var(--font-size-lg);
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		color: var(--color-text-secondary);
		border-radius: var(--radius-full);
	}

	.close-button:hover {
		background: var(--color-border);
		color: var(--color-text);
	}

	.modal-body {
		padding: var(--spacing-md);
	}

	.modal-footer {
		display: flex;
		gap: var(--spacing-sm);
		justify-content: flex-end;
		padding: var(--spacing-md);
		border-top: 1px solid var(--color-border);
	}
</style>
