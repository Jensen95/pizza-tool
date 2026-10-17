// ABOUTME: Danish formatting helpers for the dough workbench — hours, clock times and warnings
import type { DoughPlanWarning } from './dough-planner';
import type { SourdoughPlanWarning } from './sourdough';

/** "3 t 30 min", "45 min", "24 t" */
export function formatHours(hours: number): string {
	const safe = Math.max(0, hours);
	const whole = Math.floor(safe);
	const minutes = Math.round((safe - whole) * 60);
	if (minutes === 60) return `${whole + 1} t`;
	if (minutes === 0) return `${whole} t`;
	if (whole === 0) return `${minutes} min`;
	return `${whole} t ${minutes} min`;
}

const clockFormatter = new Intl.DateTimeFormat('da-DK', {
	weekday: 'short',
	hour: '2-digit',
	minute: '2-digit'
});

const dateFormatter = new Intl.DateTimeFormat('da-DK', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	hour: '2-digit',
	minute: '2-digit'
});

const savedFormatter = new Intl.DateTimeFormat('da-DK', {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit'
});

/** "lør. 18.00" — enough to place a step in the week */
export function formatClock(date: Date): string {
	return clockFormatter.format(date);
}

/** "lørdag 23. august 18.00" — for the one date that matters, the deadline */
export function formatFullDate(date: Date): string {
	return dateFormatter.format(date);
}

export function formatSavedDate(iso: string): string {
	return savedFormatter.format(new Date(iso));
}

export const warningLabels: Record<DoughPlanWarning | SourdoughPlanWarning, string> = {
	'no-proof-time': 'Angiv mindst én hævetid, eller vælg et tidspunkt dejen skal være klar.',
	'outside-table':
		'Tiden ligger uden for opslagstabellen (2-18 t ved stuetemperatur, 24-72 t på køl) — gærmængden er et estimat.',
	'tiny-yeast-amount':
		'Gærmængden er under 0,1 g og svær at afveje. Overvej kortere hævetid eller lav en større dej og frys noget af den.',
	'starter-exceeds-water':
		'Surdejen indeholder mere vand end hydrationen tillader. Sænk surdejsprocenten eller hæv hydrationen.',
	'water-over-allocated':
		'Vandlinjerne bruger mere vand end hydrationen giver. Sænk en vandlinje eller hæv hydrationen.',
	'flour-blend-off': 'Melblandingen summer ikke til 100 %. Juster procenterne, så de passer.',
	'predough-covers-yeast':
		'Fordejen indeholder al gæren, der er brug for — hoveddejen skal ikke have mere.',
	'predough-too-wet':
		'Fordejen kræver mere vand end dejens hydration giver. Sænk fordejens hydration eller melandel.'
};
