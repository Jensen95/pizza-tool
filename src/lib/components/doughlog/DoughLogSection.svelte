<script lang="ts">
	// ABOUTME: "Tidligere bagninger (N)" collapsible list of past bakes for a recipe
	// (§5.5). Presentational: the parent passes the already-filtered entries and an
	// `ondelete` callback. Each row shows date, star rating, and a one-line deviation
	// digest, with a tap-to-confirm delete affordance (Proposal C, §4).
	import type { DoughLogEntry } from '$lib/models/dough-log.types';

	let {
		entries = [],
		open = false,
		ondelete
	}: {
		/** Log entries to show, newest-first (already filtered to one recipe by the parent). */
		entries?: DoughLogEntry[];
		/** Whether the section starts expanded. */
		open?: boolean;
		/** Called with the entry id when a delete is confirmed. */
		// eslint-disable-next-line no-unused-vars
		ondelete?: (id: string) => void;
	} = $props();

	// `open` seeds the initial expansion only; the toggle owns it thereafter.
	// svelte-ignore state_referenced_locally
	let expanded = $state(open);
	// The entry whose delete is awaiting confirmation, if any.
	let confirmingId = $state<string | null>(null);

	const dateFormatter = new Intl.DateTimeFormat('da-DK', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});

	function formatDate(iso: string): string {
		const d = new Date(iso);
		return Number.isNaN(d.getTime()) ? '' : dateFormatter.format(d);
	}

	function round1(n: number): string {
		const r = Math.round(n * 10) / 10;
		return Number.isInteger(r) ? String(r) : r.toFixed(1);
	}

	function ingredientPhrase(d: DoughLogEntry['ingredientDeviations'][number]): string {
		const label = d.label?.trim() || 'ingrediens';
		if (d.kind === 'added') return `+ ${label}`;
		if (d.kind === 'omitted') return `− ${label}`;
		if (d.plannedPct != null && d.actualPct != null) {
			const diff = d.actualPct - d.plannedPct;
			if (Math.abs(diff) >= 0.1) {
				return `${round1(Math.abs(diff))}% ${diff < 0 ? 'mindre' : 'mere'} ${label.toLowerCase()}`;
			}
		}
		return `${label} ændret`;
	}

	function fermentationPhrase(d: DoughLogEntry['fermentationDeviations'][number]): string {
		const label = (d.stepLabel?.trim() || 'hævning').toLowerCase();
		if (
			d.plannedMinutes != null &&
			d.actualMinutes != null &&
			d.plannedMinutes !== d.actualMinutes
		) {
			return `${d.actualMinutes < d.plannedMinutes ? 'kortere' : 'længere'} ${label}`;
		}
		if (
			d.actualLocation != null &&
			d.plannedLocation != null &&
			d.actualLocation !== d.plannedLocation
		) {
			return `${label}: ${d.plannedLocation} → ${d.actualLocation}`;
		}
		return label;
	}

	function digest(entry: DoughLogEntry): string {
		const parts = [
			...entry.ingredientDeviations.map(ingredientPhrase),
			...entry.fermentationDeviations.map(fermentationPhrase)
		];
		if (parts.length > 0) return parts.join(' · ');
		if (entry.notes?.trim()) return 'Noter tilføjet';
		return 'Ingen afvigelser';
	}

	function toggle() {
		expanded = !expanded;
	}

	function requestDelete(id: string) {
		confirmingId = id;
	}

	function cancelDelete() {
		confirmingId = null;
	}

	function confirmDelete(id: string) {
		ondelete?.(id);
		confirmingId = null;
	}
</script>

<section class="log-section">
	<h3 class="section-heading">
		<button
			type="button"
			class="section-toggle"
			onclick={toggle}
			aria-expanded={expanded}
			aria-controls="dough-log-list"
		>
			<span class="toggle-caret" class:open={expanded} aria-hidden="true">▸</span>
			<span class="toggle-label">Tidligere bagninger ({entries.length})</span>
		</button>
	</h3>

	{#if expanded}
		{#if entries.length === 0}
			<p class="empty">Ingen bagninger logget endnu.</p>
		{:else}
			<ul id="dough-log-list" class="log-list">
				{#each entries as entry (entry.id)}
					<li class="log-item">
						<div class="log-main">
							<div class="log-top">
								<span class="log-date">{formatDate(entry.bakedAt)}</span>
								{#if entry.outcome}
									<span
										class="log-rating"
										aria-label={`Bedømmelse: ${entry.outcome} ud af 5`}
										title={`Bedømmelse: ${entry.outcome} ud af 5`}
									>
										{#each [1, 2, 3, 4, 5] as star (star)}
											<span
												class="star"
												class:filled={star <= (entry.outcome ?? 0)}
												aria-hidden="true">★</span
											>
										{/each}
									</span>
								{/if}
							</div>
							<p class="log-digest">{digest(entry)}</p>
						</div>

						{#if confirmingId === entry.id}
							<div class="confirm" role="group" aria-label="Bekræft sletning">
								<button
									type="button"
									class="confirm-btn confirm-yes"
									onclick={() => confirmDelete(entry.id)}
								>
									Slet
								</button>
								<button type="button" class="confirm-btn confirm-no" onclick={cancelDelete}>
									Fortryd
								</button>
							</div>
						{:else}
							<button
								type="button"
								class="delete-btn"
								onclick={() => requestDelete(entry.id)}
								aria-label={`Slet bagning fra ${formatDate(entry.bakedAt)}`}
							>
								✕
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</section>

<style>
	.log-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.section-heading {
		margin: 0;
	}

	.section-toggle {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		width: 100%;
		min-height: 44px;
		padding: var(--spacing-sm) 0;
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--color-text);
	}

	.toggle-caret {
		display: inline-block;
		transition: transform 0.2s ease;
		color: var(--color-text-secondary);
	}

	.toggle-caret.open {
		transform: rotate(90deg);
	}

	@media (prefers-reduced-motion: reduce) {
		.toggle-caret {
			transition: none;
		}
	}

	.empty {
		margin: 0;
		padding: var(--spacing-sm) 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.log-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.log-item {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-surface-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
	}

	.log-main {
		flex: 1;
		min-width: 0;
	}

	.log-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
	}

	.log-date {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.log-rating {
		display: inline-flex;
		flex-shrink: 0;
		font-size: var(--font-size-sm);
		line-height: 1;
	}

	.star {
		color: var(--color-border);
	}

	.star.filled {
		color: var(--color-accent);
	}

	.log-digest {
		margin: var(--spacing-xs) 0 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.delete-btn {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		font-size: 1.125rem;
		line-height: 1;
		cursor: pointer;
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.delete-btn:hover {
		background: var(--color-border);
		color: var(--color-error);
	}

	.delete-btn:focus-visible {
		outline: 2px solid var(--color-error);
		outline-offset: 2px;
	}

	.confirm {
		display: flex;
		flex-shrink: 0;
		gap: var(--spacing-xs);
	}

	.confirm-btn {
		min-height: 44px;
		padding: 0 var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
	}

	.confirm-yes {
		background: var(--color-error);
		color: var(--color-on-primary);
	}

	.confirm-no {
		background: var(--color-border);
		color: var(--color-text);
	}
</style>
