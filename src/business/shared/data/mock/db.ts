import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Ref from 'effect/Ref'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/index.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

const ProductDTO = Schema.Struct({
	maybeId: Schema.Option(Schema.String),
	maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
	maybeExpirationDate: Schema.Option(Integer.Schema),
	maybeCreationDate: Schema.Option(Integer.Schema),
})

type ProductDTO = Schema.Schema.Type<typeof ProductDTO>

export class Db extends Effect.Service<Db>()(`data/mock/Db`, {
	effect: Ref.make({
		index: 0,
		map: HashMap.empty<string, ProductDTO>(),
	}),
}) {}
