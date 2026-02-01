import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from '../../../routes/timers/+page.svelte';

describe('Timers Page', () => {
	it('renders the page title', () => {
		render(Page);
		const title = document.querySelector('title');
		expect(title?.textContent).toBe('Timere - Pizza Tool');
	});

	it('renders the main heading', () => {
		render(Page);
		const heading = screen.getByText('Timere');
		expect(heading).toBeInTheDocument();
	});

	it('renders the create timer section heading', () => {
		render(Page);
		const sectionHeading = screen.getByText('Opret ny timer');
		expect(sectionHeading).toBeInTheDocument();
	});

	it('renders TimerList and TimerCreator components', () => {
		const { container } = render(Page);
		// Check that the page container is rendered
		expect(container.querySelector('.timers-page')).toBeInTheDocument();
		expect(container.querySelector('.creator-section')).toBeInTheDocument();
	});
});
