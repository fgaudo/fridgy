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

export class FetchingFailed extends Data.TaggedError(
	'FetchingFailed',
)<{ message: string }> {}

export class InvalidDataReceived extends Data.TaggedError(
	'InvalidDataReceived',
)<{ message: string }> {}

export class Tag extends Context.Tag(
	'data/GetSortedProducts',
)<
	Tag,
	Eff.Effect<
		{
			total: NNInt.NonNegativeInteger;
			products: ProductDTO[];
		},
		FetchingFailed | InvalidDataReceived
	>
>() {}
