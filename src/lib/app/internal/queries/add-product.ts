import { Data } from 'effect';

import {
	C,
	Eff,
	Int,
	NETS,
} from '$lib/core/imports.ts';
import type { OptionOrValue } from '$lib/core/utils.ts';

export interface ProductDTO {
	maybeName: OptionOrValue<NETS.NonEmptyTrimmedString>;
	maybeExpirationDate: OptionOrValue<Int.Integer>;
	maybeCreationDate: OptionOrValue<Int.Integer>;
}

export class Infrastructure extends Data.TaggedError(
	'Infrastructure',
)<{ message: string }> {}

export class Tag extends C.Tag(
	'AddProductService',
)<
	Tag,
	(
		product: ProductDTO,
	) => Eff.Effect<void, Infrastructure>
>() {}
