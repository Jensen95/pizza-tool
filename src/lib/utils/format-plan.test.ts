import { describe, expect, test } from 'vitest';
import { formatHours, warningLabels } from '$lib/utils/format-plan';

describe('formatHours', () => {
	test('whole hours', () => {
		expect(formatHours(24)).toBe('24 t');
		expect(formatHours(3)).toBe('3 t');
	});

	test('hours and minutes', () => {
		expect(formatHours(3.5)).toBe('3 t 30 min');
		expect(formatHours(1.25)).toBe('1 t 15 min');
	});

	test('minutes only', () => {
		expect(formatHours(0.25)).toBe('15 min');
		expect(formatHours(0.75)).toBe('45 min');
	});

	test('rounds up rather than showing 60 minutes', () => {
		expect(formatHours(2.999)).toBe('3 t');
	});

	test('never goes negative', () => {
		expect(formatHours(-5)).toBe('0 t');
	});
});

describe('warningLabels', () => {
	test('every warning has Danish copy', () => {
		for (const [key, label] of Object.entries(warningLabels)) {
			expect(label.length, key).toBeGreaterThan(10);
		}
	});
});
