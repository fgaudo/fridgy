import { Context } from 'effect';

import {
	Eff,
	Int,
	NETS,
	NNInt,
} from '$lib/core/imports.ts';
import type { OptionOrValue } from '$lib/core/utils.ts';

export type ProductDTO = {
	maybeId?: OptionOrValue<string>;
	maybeName?: OptionOrValue<NETS.NonEmptyTrimmedString>;
	maybeExpirationDate?: OptionOrValue<Int.Integer>;
	maybeCreationDate?: OptionOrValue<Int.Integer>;
};

export class Tag extends Context.Tag(
	'ProductsService',
)<
	Tag,
	Eff.Effect<
		{
			total: NNInt.NonNegativeInteger;
			products: ProductDTO[];
		},
		void
	>
>() {}
