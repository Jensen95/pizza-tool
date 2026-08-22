export type BakerMathIngredientType =
	'flour' | 'water' | 'salt' | 'oil' | 'sugar' | 'seed' | 'other';

export type BakerMathIngredient = {
	id: string;
	name: string;
	percentage: number;
	type: BakerMathIngredientType;
	/**
	 * Which kind of thing this row is: a FlourCategory on flour rows, a seed id on
	 * seed rows. Drives the dough-strength analysis; ignored for the weight maths.
	 */
	variant?: string;
};

export type BakerMathIngredientWithWeight = BakerMathIngredient & {
	weight: number;
};

export type BakerMathSummary = {
	flourWeight: number;
	totalDoughWeight: number;
	hydration: number;
	waterWeight: number;
	ingredients: BakerMathIngredientWithWeight[];
};
