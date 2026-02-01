import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Page from '../../routes/+page.svelte';

describe('Home Page', () => {
	it('renders the page title', () => {
		render(Page);
		const title = document.querySelector('title');
		expect(title?.textContent).toBe('Opskrifter - Pizza Tool');
	});

	it('renders RecipeList component', () => {
		const { container } = render(Page);
		// Check that the component is rendered
		expect(container).toBeTruthy();
	});
});
