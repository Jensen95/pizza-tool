import { describe, expect, test } from 'vitest';
import { formatFinishTime, formatTimeRemaining } from './timer.types';

describe('formatFinishTime', () => {
	test('formats a timestamp as HH:MM', () => {
		const date = new Date(2024, 0, 1, 18, 45, 0); // 18:45:00
		expect(formatFinishTime(date.getTime())).toBe('18:45');
	});

	test('pads hours and minutes with leading zeros', () => {
		const date = new Date(2024, 0, 1, 8, 5, 0); // 08:05:00
		expect(formatFinishTime(date.getTime())).toBe('08:05');
	});

	test('handles midnight', () => {
		const date = new Date(2024, 0, 1, 0, 0, 0); // 00:00:00
		expect(formatFinishTime(date.getTime())).toBe('00:00');
	});

	test('handles end of day', () => {
		const date = new Date(2024, 0, 1, 23, 59, 0); // 23:59:00
		expect(formatFinishTime(date.getTime())).toBe('23:59');
	});

	test('ignores seconds in the timestamp', () => {
		const date = new Date(2024, 0, 1, 12, 30, 59); // 12:30:59
		expect(formatFinishTime(date.getTime())).toBe('12:30');
	});
});

describe('formatTimeRemaining', () => {
	test('formats milliseconds as M:SS when under one hour', () => {
		expect(formatTimeRemaining(90000)).toBe('1:30');
		expect(formatTimeRemaining(60000)).toBe('1:00');
		expect(formatTimeRemaining(5000)).toBe('0:05');
	});

	test('formats milliseconds as H:MM:SS when one hour or more', () => {
		expect(formatTimeRemaining(3661000)).toBe('1:01:01');
		expect(formatTimeRemaining(7200000)).toBe('2:00:00');
	});

	test('returns 0:00 for zero or negative values', () => {
		expect(formatTimeRemaining(0)).toBe('0:00');
		expect(formatTimeRemaining(-1000)).toBe('0:00');
	});
});
