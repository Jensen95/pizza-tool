import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from '../../../routes/reference/+page.svelte';

describe('Reference Page', () => {
	it('renders the page title', () => {
		render(Page);
		const title = document.querySelector('title');
		expect(title?.textContent).toBe('Reference - Pizza Tool');
	});

	it('renders the main heading', () => {
		render(Page);
		const heading = screen.getByText('Reference');
		expect(heading).toBeInTheDocument();
	});

	it('renders all tab buttons', () => {
		render(Page);
		expect(screen.getByText('Pizzaer')).toBeInTheDocument();
		expect(screen.getByText('Mel')).toBeInTheDocument();
		expect(screen.getByText('Sauce')).toBeInTheDocument();
		expect(screen.getByText('Tips')).toBeInTheDocument();
	});

	it('renders with pizzas tab active by default', () => {
		const { container } = render(Page);
		const activeTab = container.querySelector('.tab.active');
		expect(activeTab?.textContent).toBe('Pizzaer');
	});
});
