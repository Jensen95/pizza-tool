<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';

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

	let modalEl: HTMLDivElement | undefined = $state();
	let previouslyFocused: HTMLElement | null = null;

	const focusableSelector =
		'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

	function getFocusableElements(): HTMLElement[] {
		if (!modalEl) return [];
		return Array.from(modalEl.querySelectorAll<HTMLElement>(focusableSelector)).filter(
			(el) => el.offsetParent !== null
		);
	}

	// Move focus into the dialog on open and restore it to the opener on close.
	$effect(() => {
		if (open) {
			previouslyFocused = document.activeElement as HTMLElement | null;
			tick().then(() => {
				const focusable = getFocusableElements();
				(focusable[0] ?? modalEl)?.focus();
			});
		} else if (previouslyFocused) {
			previouslyFocused.focus();
			previouslyFocused = null;
		}
	});

	function handleClose() {
		onclose?.();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			handleClose();
			return;
		}
		if (e.key === 'Tab' && open) {
			const focusable = getFocusableElements();
			if (focusable.length === 0) {
				e.preventDefault();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement;
			const isInsideModal = active instanceof Node && modalEl?.contains(active);
			if (e.shiftKey) {
				if (active === first || !isInsideModal) {
					e.preventDefault();
					last.focus();
				}
			} else if (active === last || !isInsideModal) {
				e.preventDefault();
				first.focus();
			}
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
		<div
			class="modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			tabindex="-1"
			bind:this={modalEl}
		>
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
	}

	@media (prefers-reduced-motion: no-preference) {
		.modal {
			animation: modalIn 0.2s ease-out;
		}
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
