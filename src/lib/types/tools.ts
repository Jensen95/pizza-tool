export type BakerMathIngredientType = 'water' | 'other';

export type BakerMathIngredient = {
	id: string;
	name: string;
	percentage: number;
	type: BakerMathIngredientType;
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
