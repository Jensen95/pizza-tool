export type FlourCategory =
	| 'tipo-00'
	| 'tipo-0'
	| 'tipo-1'
	| 'bread'
	| 'all-purpose'
	| 'whole-wheat'
	| 'semolina'
	| 'rye'
	| 'spelt'
	| 'gluten-free'
	| 'other';

export interface FlourType {
	id: string;
	name: string;
	nameDa: string;
	brand?: string;
	proteinMin: number;
	proteinMax: number;
	wValue?: number;
	wValueMin?: number;
	wValueMax?: number;
	type: FlourCategory;
	origin?: string;
	notes?: string;
	notesDa?: string;
	recommended?: boolean;
}

export interface SauceIngredient {
	name: string;
	nameDa: string;
	amount: string;
	amountDa?: string;
	notes?: string;
}

export interface SauceRecipe {
	id: string;
	name: string;
	nameDa: string;
	description?: string;
	descriptionDa?: string;
	ingredients: SauceIngredient[];
	instructions: string[];
	instructionsDa: string[];
	yield?: string;
	yieldDa?: string;
	tips?: string[];
	tipsDa?: string[];
}

export interface Topping {
	id: string;
	name: string;
	nameDa: string;
	category: 'cheese' | 'meat' | 'vegetable' | 'herb' | 'sauce' | 'other';
	suggestedAmount?: string;
	suggestedAmountDa?: string;
	notes?: string;
	notesDa?: string;
}

export interface YeastInfo {
	id: string;
	type: 'fresh' | 'active-dry' | 'instant';
	name: string;
	nameDa: string;
	conversionFactor: number; // relative to fresh yeast
	notes?: string;
	notesDa?: string;
	storageTemp?: string;
	storageTempDa?: string;
	shelfLife?: string;
	shelfLifeDa?: string;
}

export interface Tip {
	id: string;
	title: string;
	titleDa: string;
	content: string;
	contentDa: string;
	category: 'dough' | 'baking' | 'ingredients' | 'technique' | 'equipment' | 'general';
}

export const toppingCategoryLabels: Record<Topping['category'], string> = {
	cheese: 'Ost',
	meat: 'Koed',
	vegetable: 'Groentsager',
	herb: 'Krydderier',
	sauce: 'Sauce',
	other: 'Andet'
};

export interface SeedType {
	id: string;
	name: string;
	nameDa: string;
	/** Grams of water a gram of seed binds in a soaker */
	waterFactor: number;
	/** How much a gram disrupts the gluten network, 0 (binds) to 1 (cuts most) */
	structureLoad: number;
	/** True for seeds that gel and must be soaked */
	hydrophilic: boolean;
	notesDa?: string;
}

export const flourTypeLabels: Record<FlourCategory, string> = {
	'tipo-00': 'Tipo 00',
	'tipo-0': 'Tipo 0',
	'tipo-1': 'Tipo 1',
	bread: 'Brodmel',
	'all-purpose': 'Hvedemel',
	'whole-wheat': 'Fuldkornsmel',
	semolina: 'Semolina',
	rye: 'Rugmel',
	spelt: 'Speltmel',
	'gluten-free': 'Glutenfri',
	other: 'Andet'
};

export const yeastTypeLabels: Record<YeastInfo['type'], string> = {
	fresh: 'Frisk gær',
	'active-dry': 'Aktiv tørgær',
	instant: 'Instant gær'
};

export const tipCategoryLabels: Record<Tip['category'], string> = {
	dough: 'Dej',
	baking: 'Bagning',
	ingredients: 'Ingredienser',
	technique: 'Teknik',
	equipment: 'Udstyr',
	general: 'Generelt'
};

export interface HydrationByStyle {
	style: string;
	styleDa: string;
	hydrationMin: number;
	hydrationMax: number;
}

export interface WStrengthTier {
	tierDa: string;
	wMin: number;
	wMax: number;
	proteinMin: number;
	proteinMax: number;
	useDa: string;
}

export interface ProteinToW {
	proteinMin: number;
	proteinMax: number;
	wMin: number;
	wMax: number;
}

export interface FlourReference {
	hydrationByStyle: HydrationByStyle[];
	wStrengthTiers: WStrengthTier[];
	proteinToW: ProteinToW[];
}

export interface FlourTypeOption {
	id: string;
	name: string;
	nameDa: string;
}

export interface SpreadRecipe {
	id: string;
	name: string;
	nameDa: string;
	descriptionDa?: string;
	ingredients: SauceIngredient[];
	instructionsDa: string[];
	tipsDa?: string[];
}

export interface ReheatingMethod {
	id: string;
	name: string;
	nameDa: string;
	rating: string;
	instructionsDa: string[];
	tipsDa?: string[];
}

export interface WaterTempFormula {
	formulaDa: string;
	frictionHeat: {
		lowSpeedPerMin: number;
		mediumSpeedPerMin: number;
	};
	targetDoughTemp: {
		min: number;
		max: number;
		notesDa: string;
	};
	exampleDa: string;
}

export interface PizzaSize {
	label: string;
	labelDa: string;
	neapolitanGrams: number;
	nyStyleGrams: number;
	diameter: string;
	slices: number;
	persons: string;
}

export interface PizzaSizeGuide {
	sizes: PizzaSize[];
	deepPanFormulas: {
		rectangleDa: string;
		roundDa: string;
	};
}

export interface ToppingAmounts {
	perCmDiameter: {
		nonNeapolitan: ToppingCategory;
		neapolitan: ToppingCategory;
	};
	notesDa: string;
}

export interface ToppingCategory {
	sauceGramsPerCm: number;
	cheeseGramsPerCm: number;
	meatGramsPerCm: number;
	vegetablesGramsPerCm: number;
	otherGramsPerCm: number;
}

export interface YeastLookupEntry {
	location: 'room' | 'fridge';
	hours: number;
	idyPercentage: number;
}

export interface YeastBrandConversion {
	brand: string;
	type: 'fresh' | 'active-dry' | 'instant';
	ratio: string;
	note?: string;
}

export interface YeastLookup {
	lookupTable: YeastLookupEntry[];
	brandConversions: YeastBrandConversion[];
}
