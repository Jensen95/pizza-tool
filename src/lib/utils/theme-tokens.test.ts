// ABOUTME: Keeps the two copies of the dark palette in app.css from drifting apart
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../../app.css'), 'utf8');

/**
 * Every declaration in a block, not only custom properties: `color-scheme`
 * lives in these blocks too, and dropping it from one copy would leave native
 * inputs light in that dark state. Comments are stripped so a commented-out
 * token cannot count, and whitespace is collapsed because Prettier wraps the
 * copy nested inside @media one tab deeper than the other.
 */
function tokensIn(block: string): Map<string, string> {
	const tokens = new Map<string, string>();
	const code = block.replace(/\/\*[\s\S]*?\*\//g, '');
	for (const match of code.matchAll(/(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/g)) {
		tokens.set(match[1], match[2].replace(/\s+/g, ' ').trim());
	}
	return tokens;
}

function blockAfter(marker: string): string {
	const start = css.indexOf(marker);
	expect(start, `missing ${marker}`).toBeGreaterThan(-1);
	const open = css.indexOf('{', start + marker.length - 1);
	let depth = 0;
	for (let i = open; i < css.length; i++) {
		if (css[i] === '{') depth++;
		if (css[i] === '}') depth--;
		if (depth === 0) return css.slice(open + 1, i);
	}
	throw new Error(`unterminated block after ${marker}`);
}

describe('dark theme tokens', () => {
	const followingDevice = tokensIn(blockAfter(":root:not([data-theme='light'])"));
	const chosen = tokensIn(blockAfter(":root[data-theme='dark']"));

	test('the device-following and chosen dark palettes are identical', () => {
		// The dark tokens live twice so an explicit choice and a dark device both
		// get them; a colour added to one and not the other only breaks in one case.
		expect(Object.fromEntries(chosen)).toEqual(Object.fromEntries(followingDevice));
	});

	test('every dark token overrides something the light theme defines', () => {
		const light = tokensIn(blockAfter(':root {'));
		for (const name of chosen.keys()) {
			expect(light.has(name), `${name} has no light-mode value`).toBe(true);
		}
	});
});

describe('the parity check itself', () => {
	// Guards against the parser going blind again: each of these drifts used to
	// slip through when only custom properties were compared.
	test('sees color-scheme', () => {
		expect(tokensIn('color-scheme: dark; --a: 1;').get('color-scheme')).toBe('dark');
	});

	test('ignores a commented-out token', () => {
		expect(tokensIn('/* --gone: red; */ --kept: blue;').has('--gone')).toBe(false);
	});

	test('treats a wrapped value as the same value', () => {
		const flat = tokensIn('--shadow: 0 1px 2px red, 0 0 0 1px blue;').get('--shadow');
		const wrapped = tokensIn('--shadow:\n\t\t\t0 1px 2px red,\n\t\t\t0 0 0 1px blue;').get(
			'--shadow'
		);
		expect(wrapped).toBe(flat);
	});
});
