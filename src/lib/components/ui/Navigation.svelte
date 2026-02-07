<script lang="ts">
	import { page } from '$app/state';
	import { activeTimerCount } from '$lib/stores';

	interface NavItem {
		href: string;
		label: string;
		icon: string;
	}

	const navItems: NavItem[] = [
		{ href: '/', label: 'Opskrifter', icon: '📖' },
		{ href: '/timers', label: 'Timere', icon: '⏱️' },
		{ href: '/reference', label: 'Reference', icon: '📚' }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/' || pathname.startsWith('/recipe');
		return pathname.startsWith(href);
	}
</script>

<nav class="navigation">
	{#each navItems as item}
		<a href={item.href} class="nav-item" class:active={isActive(item.href, page.url.pathname)}>
			<span class="nav-icon">
				{item.icon}
				{#if item.href === '/timers' && $activeTimerCount > 0}
					<span class="badge">{$activeTimerCount}</span>
				{/if}
			</span>
			<span class="nav-label">{item.label}</span>
		</a>
	{/each}
</nav>

<style>
	.navigation {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-around;
		align-items: center;
		height: var(--nav-height);
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
		z-index: 100;
		padding-bottom: env(safe-area-inset-bottom);
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		padding: 8px 16px;
		text-decoration: none;
		color: var(--color-text-secondary);
		transition: color 0.2s;
		min-width: 64px;
	}

	.nav-item:hover {
		color: var(--color-primary);
		text-decoration: none;
	}

	.nav-item.active {
		color: var(--color-primary);
	}

	.nav-icon {
		position: relative;
		font-size: 1.5rem;
		line-height: 1;
	}

	.nav-label {
		font-size: var(--font-size-xs);
		font-weight: 500;
	}

	.badge {
		position: absolute;
		top: -4px;
		right: -8px;
		background: var(--color-primary);
		color: white;
		font-size: 10px;
		min-width: 16px;
		height: 16px;
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
	}

	/* Fix navigation positioning for full-page screenshots */
	:global(body.screenshot-mode) .navigation {
		position: static;
	}
</style>
