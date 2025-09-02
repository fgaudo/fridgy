import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type { Effect } from 'effect/Effect'
import * as Schema from 'effect/Schema'

import * as Integer from '$lib/core/integer/index.ts'
import * as NonEmptyTrimmedString from '$lib/core/non-empty-trimmed-string.ts'

export const ProductDTO = Schema.Struct({
	maybeId: Schema.Option(Schema.String),
	maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
	maybeExpirationDate: Schema.Option(Integer.Schema),
	maybeCreationDate: Schema.Option(Integer.Schema),
})
export type ProductDTO = Schema.Schema.Type<typeof ProductDTO>

export const GetSortedProductsDTO = Schema.Array(ProductDTO)

export type GetSortedProductsDTO = Schema.Schema.Type<
	typeof GetSortedProductsDTO
>

export class FetchingFailed extends Data.TaggedError(`FetchingFailed`) {}

export class InvalidDataReceived extends Data.TaggedError(
	`InvalidDataReceived`,
) {}

export class Tag extends Context.Tag(`app/operations/GetSortedProducts`)<
	Tag,
	Effect<GetSortedProductsDTO, FetchingFailed | InvalidDataReceived>
>() {}
