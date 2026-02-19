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

export interface FlourTypeOption {
	id: string;
	name: string;
	nameDa: string;
}
