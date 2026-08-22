// ABOUTME: Reactive state for the dough workbench — sizing, recipe, proofing plan and results
import type { YeastInfo } from '$lib/models';
import {
	nonFlourPercentageSum,
	planDough,
	predictYeast,
	resolveFlourWeight,
	type DoughIngredientRow,
	type DoughPlannerState,
	type DoughSizing,
	type LeaveningType,
	type SizingMode
} from '$lib/utils/dough-planner';
import { convertYeastPercentage } from '$lib/utils/yeast';
import { planSourdough, sourdoughFlourFromDoughWeight } from '$lib/utils/sourdough';
import {
	createPredoughConfig,
	fitPredoughWindow,
	predoughDefaults,
	type PredoughConfig,
	type PredoughKind
} from '$lib/utils/predough';
import {
	buildPhases,
	findProofingStyle,
	fitStyle,
	hoursUntil,
	scheduleBackwards,
	scheduleForwards,
	splitTotalHours,
	type ProofingSplit,
	type ProofingStyleId
} from '$lib/utils/proofing-styles';
import { REFERENCE_ROOM_TEMPERATURE } from '$lib/utils/fermentation';
import { createRow } from '$lib/utils/dough-ingredients';
import { get } from 'svelte/store';
import { preferences } from '$lib/stores/preferences';

export type TimeMode = 'duration' | 'deadline';

/** Format a Date for a `datetime-local` input, which works in local time. */
export function toDatetimeLocal(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
		date.getHours()
	)}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocal(value: string): Date | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** The next time dinner is plausible: 18:00 today, or tomorrow if that has passed. */
export function defaultReadyAt(now = new Date()): Date {
	const target = new Date(now);
	target.setMinutes(0, 0, 0);
	target.setHours(18);
	if (target.getTime() - now.getTime() < 3 * 3_600_000) {
		target.setDate(target.getDate() + 1);
	}
	return target;
}

export class DoughWorkbench {
	name = $state('');

	// How much dough
	sizingMode = $state<SizingMode>('balls');
	flourWeight = $state(1000);
	doughWeight = $state(1700);
	ballCount = $state(6);
	ballWeight = $state(260);

	// What is in it
	leavening = $state<LeaveningType>('yeast');
	hydrationPercentage = $state(65);
	saltPercentage = $state(2.5);
	targetHydrationPercentage = $state(65);
	yeastType = $state<YeastInfo['type']>(get(preferences).defaultYeastType);
	flours = $state<DoughIngredientRow[]>([]);
	extras = $state<DoughIngredientRow[]>([]);
	starterPercentage = $state(20);
	starterHydrationPercentage = $state(100);

	// Predough
	predoughEnabled = $state(false);
	predough = $state<PredoughConfig>(createPredoughConfig('poolish'));

	// When
	timeMode = $state<TimeMode>('duration');
	styleId = $state<ProofingStyleId>('cold-overnight');
	roomHours = $state(3);
	fridgeHours = $state(24);
	temperHours = $state(2);
	roomTemperature = $state(REFERENCE_ROOM_TEMPERATURE);
	autolyseEnabled = $state(false);
	autolyseHours = $state(0.75);
	readyAtValue = $state(toDatetimeLocal(defaultReadyAt()));
	nowMs = $state(Date.now());

	// Legacy fields kept so plans saved by the old planner still load
	oilPercentage = $state(0);
	sugarPercentage = $state(0);

	now = $derived(new Date(this.nowMs));
	readyAt = $derived(fromDatetimeLocal(this.readyAtValue));

	availableHours = $derived(this.readyAt ? hoursUntil(this.readyAt, this.now) : 0);

	autolyseWindow = $derived(this.autolyseEnabled ? Math.max(0, this.autolyseHours) : 0);

	styleFit = $derived(
		this.timeMode === 'deadline' && this.styleId !== 'custom'
			? fitStyle(this.styleId, this.availableHours, { autolyseHours: this.autolyseWindow })
			: null
	);

	/** The proofing split in play, either fitted to the deadline or typed in directly. */
	split = $derived<ProofingSplit>(
		this.styleFit?.split ?? {
			predoughHours:
				this.predoughEnabled && this.leavening === 'yeast'
					? Math.max(0, this.predough.roomHours) + Math.max(0, this.predough.fridgeHours)
					: 0,
			autolyseHours: this.autolyseWindow,
			roomHours: Math.max(0, this.roomHours),
			fridgeHours: Math.max(0, this.fridgeHours),
			temperHours: Math.max(0, this.temperHours)
		}
	);

	/**
	 * The predough window. In deadline mode the fitted split decides how long it
	 * gets; a biga sits out, a poolish gets a short start before the fridge.
	 */
	predoughConfig = $derived<PredoughConfig | null>(
		this.predoughEnabled && this.leavening === 'yeast'
			? {
					...this.predough,
					...(this.styleFit
						? fitPredoughWindow(this.predough.kind, this.styleFit.split.predoughHours)
						: {}),
					roomTemperature: this.roomTemperature
				}
			: null
	);

	/** Yeast estimate used to work backwards from a target dough weight. */
	yeastPercentageEstimate = $derived.by(() => {
		const prediction = predictYeast({
			roomHours: this.split.roomHours,
			fridgeHours: this.split.fridgeHours,
			temperHours: this.split.temperHours,
			roomTemperature: this.roomTemperature
		});
		if (!prediction) return 0;
		return convertYeastPercentage(prediction.idyPercentage, 'instant', this.yeastType);
	});

	sizing = $derived<DoughSizing>({
		mode: this.sizingMode,
		flourWeight: this.flourWeight,
		doughWeight: this.doughWeight,
		ballCount: this.ballCount,
		ballWeight: this.ballWeight
	});

	sourdoughPartial = $derived({
		hydrationPercentage: this.hydrationPercentage,
		saltPercentage: this.saltPercentage,
		oilPercentage: this.oilPercentage,
		sugarPercentage: this.sugarPercentage,
		starterPercentage: this.starterPercentage,
		starterHydrationPercentage: this.starterHydrationPercentage,
		flours: this.flours,
		extras: this.extras
	});

	resolvedFlourWeight = $derived.by(() => {
		if (this.sizingMode === 'flour') return Math.max(0, this.flourWeight);

		const targetWeight =
			this.sizingMode === 'balls'
				? Math.max(0, this.ballCount) * Math.max(0, this.ballWeight)
				: Math.max(0, this.doughWeight);

		if (this.leavening === 'sourdough') {
			return sourdoughFlourFromDoughWeight(targetWeight, this.sourdoughPartial);
		}

		return resolveFlourWeight(
			this.sizing,
			nonFlourPercentageSum(
				{
					hydrationPercentage: this.hydrationPercentage,
					saltPercentage: this.saltPercentage,
					oilPercentage: this.oilPercentage,
					sugarPercentage: this.sugarPercentage,
					extras: this.extras
				},
				this.yeastPercentageEstimate
			)
		);
	});

	plannerState = $derived<DoughPlannerState>({
		flourWeight: this.resolvedFlourWeight,
		hydrationPercentage: this.hydrationPercentage,
		saltPercentage: this.saltPercentage,
		oilPercentage: this.oilPercentage,
		sugarPercentage: this.sugarPercentage,
		yeastType: this.yeastType,
		roomHours: this.split.roomHours,
		fridgeHours: this.split.fridgeHours,
		temperHours: this.split.temperHours,
		roomTemperature: this.roomTemperature,
		flours: this.flours,
		extras: this.extras,
		predough: this.predoughConfig,
		leavening: this.leavening,
		starterPercentage: this.starterPercentage,
		starterHydrationPercentage: this.starterHydrationPercentage,
		sizing: this.sizing,
		styleId: this.styleId,
		autolyseHours: this.autolyseWindow
	});

	yeastPlan = $derived(this.leavening === 'yeast' ? planDough(this.plannerState) : null);

	sourdoughPlan = $derived(
		this.leavening === 'sourdough'
			? planSourdough({ flourWeight: this.resolvedFlourWeight, ...this.sourdoughPartial })
			: null
	);

	hasPlan = $derived(Boolean(this.yeastPlan ?? this.sourdoughPlan));

	totalDoughWeight = $derived(this.yeastPlan?.totalWeight ?? this.sourdoughPlan?.totalWeight ?? 0);

	/** Water needed to reach the target hydration, compared with the plan's water. */
	hydrationDelta = $derived(
		Math.round(
			((this.targetHydrationPercentage - this.hydrationPercentage) / 100) *
				this.resolvedFlourWeight *
				10
		) / 10
	);

	phases = $derived(
		buildPhases(this.split, {
			predoughNameDa: this.predoughEnabled ? predoughDefaults[this.predough.kind].nameDa : 'Fordej',
			leavening: this.leavening
		})
	);

	steps = $derived(
		this.timeMode === 'deadline' && this.readyAt
			? scheduleBackwards(this.phases, this.readyAt)
			: scheduleForwards(this.phases, this.now)
	);

	/** Fermentation only — the autolyse carries no yeast, so it is not proofing time. */
	totalProofHours = $derived(splitTotalHours(this.split) - this.split.autolyseHours);

	/** Everything the plan occupies on the clock, autolyse included. */
	totalWindowHours = $derived(splitTotalHours(this.split));

	style = $derived(findProofingStyle(this.styleId));

	/** Apply a style's split to the editable hour fields. */
	applyStyle(id: ProofingStyleId) {
		this.styleId = id;
		const style = findProofingStyle(id);
		if (!style) return;

		const window =
			this.timeMode === 'deadline' && this.availableHours > 0
				? this.availableHours
				: Math.min(style.maxHours, Math.max(style.minHours, this.totalProofHours));
		const fit = fitStyle(id, window);
		if (!fit) return;

		this.roomHours = fit.split.roomHours;
		this.fridgeHours = fit.split.fridgeHours;
		this.temperHours = fit.split.temperHours;

		if (style.usesPredough) {
			this.predoughEnabled = true;
			const predoughWindow = fitPredoughWindow(this.predough.kind, fit.split.predoughHours);
			this.predough = { ...this.predough, ...predoughWindow };
		}
	}

	/** Any manual change to the hours means the plan no longer follows a style. */
	markCustomSplit() {
		this.styleId = 'custom';
	}

	/** Changing yeast type sticks, since it is a pantry fact rather than a per-plan choice. */
	setYeastType(type: YeastInfo['type']) {
		this.yeastType = type;
		preferences.setDefaultYeastType(type);
	}

	setPredoughKind(kind: PredoughKind) {
		this.predough = createPredoughConfig(kind);
	}

	addFlour() {
		const existing = this.flours.length;
		this.flours = [
			...this.flours,
			createRow(existing === 0 ? 'Tipo 00' : 'Mel', existing === 0 ? 100 : 0, 'flour')
		];
	}

	addExtra(type: DoughIngredientRow['type'] = 'other') {
		this.extras = [
			...this.extras,
			createRow(type === 'water' ? 'Vand (autolyse)' : 'Ny ingrediens', 0, type)
		];
	}

	updateRow(
		collection: 'flours' | 'extras',
		id: string,
		patch: Partial<Omit<DoughIngredientRow, 'id'>>
	) {
		const rows = this[collection].map((row) => (row.id === id ? { ...row, ...patch } : row));
		this[collection] = rows;
	}

	removeRow(collection: 'flours' | 'extras', id: string) {
		this[collection] = this[collection].filter((row) => row.id !== id);
	}

	/**
	 * Restore a saved plan. Deadlines are not saved — the hours are — so the plan
	 * comes back as a duration and can be laid on a new deadline.
	 */
	load(state: DoughPlannerState, name: string) {
		this.name = name;
		this.leavening = state.leavening ?? 'yeast';
		this.hydrationPercentage = state.hydrationPercentage;
		this.targetHydrationPercentage = state.hydrationPercentage;
		this.saltPercentage = state.saltPercentage;
		this.oilPercentage = state.oilPercentage ?? 0;
		this.sugarPercentage = state.sugarPercentage ?? 0;
		this.setYeastType(state.yeastType);
		this.roomHours = state.roomHours;
		this.fridgeHours = state.fridgeHours;
		this.temperHours = state.temperHours ?? 0;
		this.roomTemperature = state.roomTemperature ?? REFERENCE_ROOM_TEMPERATURE;
		this.autolyseHours =
			state.autolyseHours && state.autolyseHours > 0 ? state.autolyseHours : 0.75;
		this.autolyseEnabled = Boolean(state.autolyseHours && state.autolyseHours > 0);
		this.flours = state.flours ? [...state.flours] : [];
		this.extras = state.extras ? [...state.extras] : [];
		this.starterPercentage = state.starterPercentage ?? 20;
		this.starterHydrationPercentage = state.starterHydrationPercentage ?? 100;
		this.predoughEnabled = Boolean(state.predough);
		if (state.predough) this.predough = { ...state.predough };
		this.styleId = state.styleId ?? 'custom';
		this.timeMode = 'duration';

		const sizing = state.sizing;
		this.sizingMode = sizing?.mode ?? 'flour';
		this.flourWeight = sizing?.flourWeight ?? state.flourWeight;
		this.doughWeight = sizing?.doughWeight ?? 0;
		this.ballCount = sizing?.ballCount ?? 6;
		this.ballWeight = sizing?.ballWeight ?? 260;
	}
}

export const workbench = new DoughWorkbench();
