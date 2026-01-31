export type TimerStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface Timer {
	id: string;
	name: string;
	nameDa?: string;
	startTime: number; // Unix timestamp in milliseconds
	duration: number; // in milliseconds
	endTime: number; // Unix timestamp in milliseconds
	pausedAt?: number; // Unix timestamp when paused
	remainingWhenPaused?: number; // remaining time when paused
	status: TimerStatus;
	recipeId?: string;
	stageId?: string;
	notificationSent: boolean;
	createdAt: number;
}

export interface TimerPreset {
	id: string;
	name: string;
	nameDa: string;
	duration: number; // in minutes
	description?: string;
	descriptionDa?: string;
}

export const defaultPresets: TimerPreset[] = [
	{
		id: 'autolyse-30',
		name: 'Autolyse 30 min',
		nameDa: 'Autolyse 30 min',
		duration: 30,
		descriptionDa: 'Hvile af mel og vand'
	},
	{
		id: 'autolyse-60',
		name: 'Autolyse 1 hour',
		nameDa: 'Autolyse 1 time',
		duration: 60,
		descriptionDa: 'Laengere hvile af mel og vand'
	},
	{
		id: 'bulk-2h',
		name: 'Bulk fermentation 2h',
		nameDa: 'Stuehaevning 2 timer',
		duration: 120,
		descriptionDa: 'Haevning ved stuetemperatur'
	},
	{
		id: 'ball-rest',
		name: 'Ball rest 2h',
		nameDa: 'Kuglehvile 2 timer',
		duration: 120,
		descriptionDa: 'Hvile efter formning af kugler'
	},
	{
		id: 'poolish-12h',
		name: 'Poolish 12h',
		nameDa: 'Poolish 12 timer',
		duration: 720,
		descriptionDa: 'Poolish fordej natten over'
	},
	{
		id: 'poolish-24h',
		name: 'Poolish 24h',
		nameDa: 'Poolish 24 timer',
		duration: 1440,
		descriptionDa: 'Lang poolish haevning'
	},
	{
		id: 'cold-24h',
		name: 'Cold ferment 24h',
		nameDa: 'Kold haevning 24 timer',
		duration: 1440,
		descriptionDa: 'Haevning i koeleskab'
	},
	{
		id: 'cold-48h',
		name: 'Cold ferment 48h',
		nameDa: 'Kold haevning 48 timer',
		duration: 2880,
		descriptionDa: 'Lang haevning i koeleskab'
	}
];

export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} min`;
	}
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	if (remainingMinutes === 0) {
		return hours === 1 ? '1 time' : `${hours} timer`;
	}
	return `${hours}t ${remainingMinutes}m`;
}

export function formatTimeRemaining(ms: number): string {
	if (ms <= 0) return '0:00';

	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
