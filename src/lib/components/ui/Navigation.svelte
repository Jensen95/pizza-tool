<script lang="ts">
	import { page } from '$app/state';
	import { activeTimerCount } from '$lib/stores';

	interface NavItem {
		href: string;
		label: string;
		icon: string;
	}

	const navItems: NavItem[] = [
		{
			href: '/',
			label: 'Opskrifter',
			icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
		},
		{
			href: '/timers',
			label: 'Timere',
			icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
		},
		{
			href: '/tools',
			label: 'Værktøjer',
			icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`
		},
		{
			href: '/reference',
			label: 'Reference',
			icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
		}
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
				{@html item.icon}
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
		position: relative;
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
		min-height: 44px;
	}

	.nav-item:hover {
		color: var(--color-primary);
		text-decoration: none;
	}

	.nav-item.active {
		color: var(--color-primary);
	}

	.nav-item.active::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 26px;
		height: 3px;
		border-radius: var(--radius-full);
		background: var(--color-accent);
	}

	.nav-icon {
		position: relative;
		line-height: 0;
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
