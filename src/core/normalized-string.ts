import * as Brand from 'effect/Brand'
import * as Filter from 'effect/Filter'
import { pipe } from 'effect/Function'
import * as Predicate from 'effect/Predicate'
import * as Result from 'effect/Result'
import * as Schema from 'effect/Schema'

import * as NonEmptyTrimmedString from './non-empty-trimmed-string.ts'

type NormalizedString = Brand.Branded<string, 'NormalizedString'>
const NormalizedString = pipe(
	Filter.make((s: string) =>
		s.length > 0 ? Result.succeed(s) : Result.fail(s),
	),
	Filter.compose(
		Filter.make(s => (s.trim() === s ? Result.succeed(s) : Result.fail(s))),
	),
	Filter.compose(
		Filter.make(s => (/ {2,}/.test(s) ? Result.fail(s) : Result.succeed(s))),
	),
	Filter.toPredicate,
	Brand.make<NormalizedString>,
)

class NotFound1 extends Schema.Class<NotFound1>('NotFound1')({
	id: Schema.Number,
}) {}

const asd = new NotFound1({ id: 3 })

NotFound1.rebuild
