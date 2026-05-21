import { describe, expect, test } from 'vitest';
import { formatFinishTime, formatTimeRemaining } from './timer.types';

describe('formatFinishTime', () => {
	const now = new Date(2024, 0, 1, 18, 33, 0).getTime(); // Jan 1, 2024 18:33

	test('formats a timestamp as HH:MM when same day', () => {
		const finish = new Date(2024, 0, 1, 18, 45, 0).getTime(); // same day
		expect(formatFinishTime(finish, now)).toBe('18:45');
	});

	test('pads hours and minutes with leading zeros', () => {
		const finish = new Date(2024, 0, 1, 8, 5, 0).getTime();
		expect(formatFinishTime(finish, now)).toBe('08:05');
	});

	test('handles midnight on same day', () => {
		const finish = new Date(2024, 0, 1, 0, 0, 0).getTime();
		expect(formatFinishTime(finish, now)).toBe('00:00');
	});

	test('handles end of day on same day', () => {
		const finish = new Date(2024, 0, 1, 23, 59, 0).getTime();
		expect(formatFinishTime(finish, now)).toBe('23:59');
	});

	test('ignores seconds in the timestamp', () => {
		const finish = new Date(2024, 0, 1, 12, 30, 59).getTime();
		expect(formatFinishTime(finish, now)).toBe('12:30');
	});

	test('appends (i morgen) when finish time is the next day', () => {
		const finish = new Date(2024, 0, 2, 18, 33, 0).getTime(); // Jan 2
		expect(formatFinishTime(finish, now)).toBe('18:33 (i morgen)');
	});

	test('appends (+ X dage) when finish time is 2 or more days away', () => {
		const twoDay = new Date(2024, 0, 3, 18, 33, 0).getTime(); // Jan 3
		expect(formatFinishTime(twoDay, now)).toBe('18:33 (+ 2 dage)');

		const threeDay = new Date(2024, 0, 4, 6, 0, 0).getTime(); // Jan 4
		expect(formatFinishTime(threeDay, now)).toBe('06:00 (+ 3 dage)');
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
