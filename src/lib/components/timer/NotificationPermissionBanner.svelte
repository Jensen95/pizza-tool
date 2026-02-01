<script lang="ts">
	import { onMount } from 'svelte';
	import {
		isNotificationSupported,
		getPermissionStatus,
		requestPermission
	} from '$lib/utils/notification';

	let permissionStatus = $state<'granted' | 'denied' | 'default' | 'unsupported'>('default');
	let isRequesting = $state(false);

	onMount(() => {
		// Check initial permission status
		permissionStatus = getPermissionStatus();

		// Listen for permission changes (if browser supports it)
		if (isNotificationSupported() && 'permissions' in navigator) {
			navigator.permissions.query({ name: 'notifications' }).then((permissionObj) => {
				permissionObj.onchange = () => {
					permissionStatus = getPermissionStatus();
				};
			});
		}
	});

	async function handleRequestPermission() {
		isRequesting = true;
		try {
			const result = await requestPermission();
			permissionStatus = result;
		} finally {
			isRequesting = false;
		}
	}

	// Only show banner if:
	// - Notifications are supported
	// - Permission is not granted (either 'default' or 'denied')
	let shouldShowBanner = $derived(
		isNotificationSupported() &&
			(permissionStatus === 'default' || permissionStatus === 'denied')
	);
</script>

{#if shouldShowBanner}
	<div class="notification-banner" role="alert" aria-live="polite">
		<div class="banner-content">
			<span class="banner-icon">🔔</span>
			<div class="banner-text">
				<strong class="banner-title">Notifikationer deaktiveret</strong>
				<p class="banner-description">
					{#if permissionStatus === 'denied'}
						Du har blokeret notifikationer. Aktiver dem i browserens indstillinger for at
						modtage beskeder når timere er faerdige.
					{:else}
						Tillad notifikationer for at få beskeder når dine timere er faerdige.
					{/if}
				</p>
			</div>
		</div>
		{#if permissionStatus === 'default'}
			<button class="btn btn-primary banner-button" onclick={handleRequestPermission} disabled={isRequesting}>
				{isRequesting ? 'Anmoder...' : 'Tillad notifikationer'}
			</button>
		{/if}
	</div>
{/if}

<style>
	.notification-banner {
		background: var(--color-warning, #fff3cd);
		border: 1px solid var(--color-warning-border, #ffc107);
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

	.banner-button {
		width: 100%;
	}

	@media (min-width: 600px) {
		.notification-banner {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}

		.banner-button {
			width: auto;
			flex-shrink: 0;
		}
	}
</style>
