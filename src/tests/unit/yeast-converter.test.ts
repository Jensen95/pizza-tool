// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import YeastConverter from '$lib/components/tools/YeastConverter.svelte';
import { tick } from 'svelte';

describe('YeastConverter', () => {
	it('converts grams between yeast types without flour input', async () => {
		render(YeastConverter);

		expect(screen.queryByLabelText('Mel i opskriften (valgfrit)')).toBeNull();

		const amountInput = screen.getByLabelText('Gærmængde i gram') as HTMLInputElement;
		const swapButton = screen.getByRole('button', { name: 'Byt gærtyper' });

		amountInput.value = '5';
		await fireEvent.input(amountInput);
		await tick();

		await fireEvent.click(swapButton);
		await tick();

		await screen.findByText(/15\.15/);
		expect(await screen.findByText(/x3\.03/)).toBeVisible();
	});
});
