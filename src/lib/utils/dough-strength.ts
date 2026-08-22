// ABOUTME: Dough strength analysis — can the gluten network carry this much wholegrain and seeds?
import type { FlourCategory } from '$lib/models';
import { seedTypes } from '$lib/data/reference';
import { flourRows, type DoughIngredientRow } from './dough-ingredients';

export type StrengthLevel = 'info' | 'caution' | 'warning';

export type StrengthFindingId =
	| 'wholegrain-share'
	| 'rye-share'
	| 'spelt-handling'
	| 'gluten-free-blend'
	| 'seed-share'
	| 'seed-soaker'
	| 'structure-overloaded';

export interface StrengthFinding {
	id: StrengthFindingId;
	level: StrengthLevel;
	titleDa: string;
	bodyDa: string;
}

/**
 * How much of a gluten network each flour category can build, relative to
 * strong white wheat. Bran cuts gluten strands, spelt's gluten is fragile, and
 * rye builds a pentosan gel rather than a network at all.
 */
const glutenFactor: Record<FlourCategory, number> = {
	'tipo-00': 1,
	'tipo-0': 1,
	'tipo-1': 0.85,
	bread: 1,
	'all-purpose': 0.85,
	semolina: 0.7,
	'whole-wheat': 0.6,
	spelt: 0.6,
	rye: 0.15,
	'gluten-free': 0,
	other: 0.85
};

/** How much of each category is actually wholegrain. */
const wholegrainFraction: Record<FlourCategory, number> = {
	'tipo-00': 0,
	'tipo-0': 0.05,
	'tipo-1': 0.3,
	bread: 0,
	'all-purpose': 0,
	semolina: 0,
	'whole-wheat': 1,
	spelt: 0.5,
	rye: 1,
	'gluten-free': 0,
	other: 0
};

const DEFAULT_CATEGORY: FlourCategory = 'tipo-00';

function categoryOf(row: DoughIngredientRow): FlourCategory {
	const variant = row.variant as FlourCategory | undefined;
	return variant && variant in glutenFactor ? variant : DEFAULT_CATEGORY;
}

function seedOf(row: DoughIngredientRow) {
	return seedTypes.find((seed) => seed.id === row.variant) ?? seedTypes[seedTypes.length - 1];
}

function sumPercentage(rows: DoughIngredientRow[]): number {
	return rows.reduce((sum, row) => sum + Math.max(0, row.percentage), 0);
}

export interface DoughStrength {
	/** Percentage of the flour that is wholegrain */
	wholegrainPercentage: number;
	ryePercentage: number;
	speltPercentage: number;
	glutenFreePercentage: number;
	/** Seeds, nuts and grains as a percentage of the flour */
	seedPercentage: number;
	/** Water the seeds will bind, in grams */
	seedWaterWeight: number;
	/** Hydration the dough needs to end up where it started once seeds have drunk */
	compensatedHydrationPercentage: number;
	/**
	 * 1.0 is strong white flour with nothing in it; below ~0.45 there is more
	 * weak flour and inert matter than the gluten can hold together.
	 */
	structureScore: number;
	findings: StrengthFinding[];
}

const seedRowsOf = (rows: DoughIngredientRow[] | undefined) =>
	(rows ?? []).filter((row) => row.type === 'seed');

/**
 * Judge whether the flour blend and the seeds still add up to a dough that can
 * hold gas. Everything is expressed against the total flour, as usual.
 */
export function analyseDoughStrength(
	flours: DoughIngredientRow[] | undefined,
	extras: DoughIngredientRow[] | undefined,
	options: { flourWeight: number; hydrationPercentage: number }
): DoughStrength {
	const blend = flourRows(flours);
	const blendSum = blend.reduce((sum, row) => sum + Math.max(0, row.percentage), 0);
	// Without a blend the flour is unknown, so treat it as plain strong white.
	const normalised =
		blendSum > 0
			? blend.map((row) => ({
					category: categoryOf(row),
					percentage: (Math.max(0, row.percentage) / blendSum) * 100
				}))
			: [{ category: DEFAULT_CATEGORY, percentage: 100 }];

	const wholegrainPercentage = normalised.reduce(
		(sum, row) => sum + row.percentage * wholegrainFraction[row.category],
		0
	);
	const byCategory = (category: FlourCategory) =>
		normalised
			.filter((row) => row.category === category)
			.reduce((sum, row) => sum + row.percentage, 0);

	const seeds = seedRowsOf(extras);
	const seedPercentage = sumPercentage(seeds);
	const seedWaterPercentage = seeds.reduce(
		(sum, row) => sum + Math.max(0, row.percentage) * seedOf(row).waterFactor,
		0
	);
	const seedLoad = seeds.reduce(
		(sum, row) => sum + (Math.max(0, row.percentage) / 100) * seedOf(row).structureLoad,
		0
	);

	const glutenShare = normalised.reduce(
		(sum, row) => sum + (row.percentage / 100) * glutenFactor[row.category],
		0
	);
	const structureScore = Math.max(0, Math.round((glutenShare - seedLoad) * 100) / 100);

	const strength: DoughStrength = {
		wholegrainPercentage: Math.round(wholegrainPercentage * 10) / 10,
		ryePercentage: Math.round(byCategory('rye') * 10) / 10,
		speltPercentage: Math.round(byCategory('spelt') * 10) / 10,
		glutenFreePercentage: Math.round(byCategory('gluten-free') * 10) / 10,
		seedPercentage: Math.round(seedPercentage * 10) / 10,
		seedWaterWeight:
			Math.round((seedWaterPercentage / 100) * Math.max(0, options.flourWeight) * 10) / 10,
		compensatedHydrationPercentage:
			Math.round((options.hydrationPercentage + seedWaterPercentage) * 10) / 10,
		structureScore,
		findings: []
	};

	const findings: StrengthFinding[] = [];

	if (strength.wholegrainPercentage > 60) {
		findings.push({
			id: 'wholegrain-share',
			level: 'warning',
			titleDa: `${strength.wholegrainPercentage} % fuldkorn`,
			bodyDa:
				'Over 60 % fuldkorn kan ikke holde en lang, våd hævning frit på pladen. Bag i form, sænk hydrationen lidt, eller bland stærkt hvidt mel i.'
		});
	} else if (strength.wholegrainPercentage > 35) {
		findings.push({
			id: 'wholegrain-share',
			level: 'caution',
			titleDa: `${strength.wholegrainPercentage} % fuldkorn`,
			bodyDa:
				'Over ca. 35 % fuldkorn bliver glutennettet mærkbart svagere. Ælt kortere, brug stræk og fold i stedet, og forvent en tættere krumme. Klidet fremskynder også hævningen — hold øje mod slutningen.'
		});
	} else if (strength.wholegrainPercentage > 15) {
		findings.push({
			id: 'wholegrain-share',
			level: 'info',
			titleDa: `${strength.wholegrainPercentage} % fuldkorn`,
			bodyDa:
				'Fuldkorn suger mere vand end hvidt mel: regn med 2-5 % mere hydration. Klidet giver også hurtigere fermentering, så dejen kan være klar før tid.'
		});
	}

	if (strength.ryePercentage > 50) {
		findings.push({
			id: 'rye-share',
			level: 'warning',
			titleDa: `${strength.ryePercentage} % rugmel`,
			bodyDa:
				'Rug danner ikke gluten. Med over halvdelen rug er det et rugbrød: ælt ikke for struktur, bag i form, og brug surdej til at holde krummen sammen.'
		});
	} else if (strength.ryePercentage > 20) {
		findings.push({
			id: 'rye-share',
			level: 'caution',
			titleDa: `${strength.ryePercentage} % rugmel`,
			bodyDa:
				'Rug bidrager ingen gluten og gør dejen klistret. Hold hydrationen nede, brug våde hænder, og forvent at dejen ikke kan strækkes som en hvedebolle.'
		});
	}

	if (strength.speltPercentage > 30) {
		findings.push({
			id: 'spelt-handling',
			level: 'info',
			titleDa: `${strength.speltPercentage} % spelt`,
			bodyDa:
				'Speltens gluten er strækbart men skrøbeligt. Ælt kortere end du ville med hvede — overæltet spelt falder sammen og kan ikke rettes op.'
		});
	}

	if (strength.glutenFreePercentage > 0 && strength.glutenFreePercentage < 100) {
		findings.push({
			id: 'gluten-free-blend',
			level: 'info',
			titleDa: 'Glutenfrit mel blandet i',
			bodyDa:
				'Glutenfrit mel i en hvededej fortynder bare glutennettet — dejen bliver ikke glutenfri, men den bliver svagere. Overvej psyllium husk til at binde den.'
		});
	}

	if (strength.seedPercentage > 40) {
		findings.push({
			id: 'seed-share',
			level: 'warning',
			titleDa: `${strength.seedPercentage} % frø og kerner`,
			bodyDa:
				'Det er mere, end dejen kan bære frit formet: kernerne skærer glutennettet i stykker, og dejen flækker under hævningen. Bag i form, eller skær ned til under 30 %.'
		});
	} else if (strength.seedPercentage > 25) {
		findings.push({
			id: 'seed-share',
			level: 'caution',
			titleDa: `${strength.seedPercentage} % frø og kerner`,
			bodyDa:
				'Krummen bliver tung. Ælt dejen færdig først og vend kernerne i til sidst, så glutennettet er dannet, inden det bliver skåret i.'
		});
	} else if (strength.seedPercentage > 12) {
		findings.push({
			id: 'seed-share',
			level: 'info',
			titleDa: `${strength.seedPercentage} % frø og kerner`,
			bodyDa:
				'En almindelig mængde til et kernebrød. Tilsæt dem sidst i æltningen, så de ikke river i dejen undervejs.'
		});
	}

	const thirstySeeds = seeds.filter(
		(row) => Math.max(0, row.percentage) > 0 && seedOf(row).hydrophilic
	);
	if (thirstySeeds.length > 0 && strength.seedWaterWeight >= 1) {
		const kinds = thirstySeeds.map((row) => seedOf(row));
		const names = kinds.map((seed) => seed.nameDa.toLowerCase()).join(', ');
		const notes = [...new Set(kinds.map((seed) => seed.notesDa).filter(Boolean))].join(' ');
		// Past roughly 95 % there is no honest way to hide that much water in the
		// dough's own hydration — it has to become a soaker.
		const advice =
			strength.compensatedHydrationPercentage > 95
				? `Så meget vand kan ikke lægges oven i dejens hydration — læg frøene i blød i ${strength.seedWaterWeight} g vand, og ælt soakeren i som sin egen ingrediens.`
				: `Læg dem i blød i ${strength.seedWaterWeight} g vand oveni dejens eget vand, eller hæv hydrationen til ${strength.compensatedHydrationPercentage} % hvis de skal i tørre.`;

		findings.push({
			id: 'seed-soaker',
			level: 'info',
			titleDa: `${names} binder ca. ${strength.seedWaterWeight} g vand`,
			bodyDa: `Tørre frø stjæler vandet fra dejen under hævningen. ${advice}${notes ? ` ${notes}` : ''}`
		});
	}

	if (strength.structureScore < 0.45) {
		findings.push({
			id: 'structure-overloaded',
			level: 'warning',
			titleDa: 'Dejen har for lidt at holde sig sammen med',
			bodyDa:
				'Svagt mel og frø tilsammen efterlader for lidt gluten til at holde luften. Byt noget af melet til stærkt hvidt mel, skær ned på kernerne, eller bag i form og accepter en tæt krumme.'
		});
	}

	strength.findings = findings;
	return strength;
}

export const strengthLevelLabels: Record<StrengthLevel, string> = {
	info: 'Godt at vide',
	caution: 'Pas på',
	warning: 'Advarsel'
};
