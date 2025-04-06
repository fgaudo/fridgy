import { Context } from 'effect';

import {
	Eff,
	Int,
	NETS,
	NNInt,
	O,
} from '$lib/core/imports.ts';

export type ProductDTO = {
	maybeId?: O.Option<string>;
	maybeName?: O.Option<NETS.NonEmptyTrimmedString>;
	maybeExpirationDate?: O.Option<Int.Integer>;
	maybeCreationDate?: O.Option<Int.Integer>;
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
