import { Context, Data } from 'effect';

import {
	Eff,
	Int,
	NETS,
	NNInt,
} from '$lib/core/imports.ts';
import type { OptionOrValue } from '$lib/core/utils.ts';

export type ProductDTO = {
	maybeId: OptionOrValue<string>;
	maybeName: OptionOrValue<NETS.NonEmptyTrimmedString>;
	maybeExpirationDate: OptionOrValue<Int.Integer>;
	maybeCreationDate: OptionOrValue<Int.Integer>;
};

export class Infrastructure extends Data.TaggedError(
	'Infrastructure',
)<{ message: string }> {}

export class Invalid extends Data.TaggedError(
	'Invalid',
)<{ message: string }> {}

export class Tag extends Context.Tag(
	'ProductsService',
)<
	Tag,
	Eff.Effect<
		{
			total: NNInt.NonNegativeInteger;
			products: ProductDTO[];
		},
		Infrastructure | Invalid
	>
>() {}
