<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	type BeforeInstallPromptEvent = Event & {
		prompt: () => Promise<void>;
		userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' | 'cancelled' }>;
	};

	let showInstallBanner = $state(false);
	let showUpdateBanner = $state(false);
	let deferredPrompt: BeforeInstallPromptEvent | null = null;
	let registration: ServiceWorkerRegistration | null = null;
	let refreshing = false;

	function hideInstallBanner() {
		showInstallBanner = false;
		deferredPrompt = null;
	}

	async function handleInstall() {
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		await deferredPrompt.userChoice?.catch(() => {});
		hideInstallBanner();
	}

	function handleBeforeInstall(event: Event) {
		event.preventDefault();

		const isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as unknown as { standalone?: boolean }).standalone;

		if (isStandalone) {
			return;
		}

		deferredPrompt = event as BeforeInstallPromptEvent;
		showInstallBanner = true;
	}

	function watchForUpdates(reg: ServiceWorkerRegistration) {
		if (reg.waiting) {
			showUpdateBanner = true;
		}

		reg.addEventListener('updatefound', () => {
			const installing = reg.installing;
			if (!installing) return;

			installing.addEventListener('statechange', () => {
				if (installing.state === 'installed' && navigator.serviceWorker.controller) {
					showUpdateBanner = true;
				}
			});
		});
	}

	function activateUpdate() {
		if (!registration) return;
		showUpdateBanner = false;

		const waiting = registration.waiting;
		if (waiting) {
			waiting.postMessage({ type: 'SKIP_WAITING' });
		} else {
			registration.update();
		}
	}

	async function ensureServiceWorker() {
		if (!('serviceWorker' in navigator)) return;

		const serviceWorkerPath = `${base || ''}/service-worker.js`;
		const serviceWorkerScope = base || '/';

		try {
			const existing = await navigator.serviceWorker.getRegistration(serviceWorkerScope);
			registration =
				existing ||
				(await navigator.serviceWorker.register(serviceWorkerPath, { scope: serviceWorkerScope }));

			if (registration) {
				watchForUpdates(registration);
			}
		} catch (error) {
			console.error('Service worker registration failed', error);
		}
	}

	onMount(() => {
		let controllerChangeHandler: (() => void) | null = null;

		window.addEventListener('beforeinstallprompt', handleBeforeInstall);
		window.addEventListener('appinstalled', hideInstallBanner);

		if ('serviceWorker' in navigator) {
			ensureServiceWorker();

			controllerChangeHandler = () => {
				if (refreshing) return;
				refreshing = true;
				window.location.reload();
			};

			navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler);
		}

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
			window.removeEventListener('appinstalled', hideInstallBanner);

			if (controllerChangeHandler) {
				navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler);
			}
		};
	});
</script>

{#if showInstallBanner}
	<div class="pwa-banner" role="alert" aria-live="polite">
		<div class="banner-content">
			<span class="banner-icon" aria-hidden="true">📲</span>
			<div class="banner-text">
				<h3 class="banner-title">Installer Pizza Tool</h3>
				<p class="banner-description">
					Gem appen på din enhed for hurtig adgang og offline support.
				</p>
			</div>
			<button
				class="dismiss-button"
				onclick={hideInstallBanner}
				aria-label="Luk installeringsbanner"
				title="Luk installeringsbanner"
			>
				✕
			</button>
		</div>
		<div class="banner-actions">
			<button class="btn btn-secondary" onclick={hideInstallBanner}>Senere</button>
			<button class="btn btn-primary" onclick={handleInstall}>Installer app</button>
		</div>
	</div>
{/if}

{#if showUpdateBanner}
	<div class="pwa-banner update" role="status" aria-live="polite">
		<div class="banner-content">
			<span class="banner-icon" aria-hidden="true">🔄</span>
			<div class="banner-text">
				<h3 class="banner-title">Ny version tilgængelig</h3>
				<p class="banner-description">Genindlæs for at få de seneste forbedringer.</p>
			</div>
		</div>
		<div class="banner-actions">
			<button class="btn btn-secondary" onclick={() => (showUpdateBanner = false)}>Senere</button>
			<button class="btn btn-primary" onclick={activateUpdate}>Opdater nu</button>
		</div>
	</div>
{/if}

<style>
	.pwa-banner {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		margin-bottom: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		box-shadow: var(--shadow-sm);
	}

	.pwa-banner.update {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-md);
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
		margin: 0 0 var(--spacing-xs) 0;
		color: var(--color-text);
		font-size: var(--font-size-md);
	}

	.banner-description {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.4;
	}

	.banner-actions {
		display: flex;
		gap: var(--spacing-sm);
		justify-content: flex-end;
		flex-wrap: wrap;
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

	.dismiss-button:focus {
		outline: 2px solid var(--color-primary, #2e7d32);
		outline-offset: 2px;
	}

	@media (min-width: 640px) {
		.pwa-banner {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}

		.banner-actions {
			justify-content: flex-end;
		}
	}
</style>
