import * as Context from 'effect/Context'
import { type RequestResolver } from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as Integer from '$lib/core/integer/index.ts'
import * as NonEmptyTrimmedString from '$lib/core/non-empty-trimmed-string.ts'

export class Request extends Schema.TaggedRequest<Request>()(`AddProduct`, {
	failure: Schema.Void,
	success: Schema.Void,
	payload: {
		name: NonEmptyTrimmedString.Schema,
		maybeExpirationDate: Schema.Option(Integer.Schema),
		creationDate: Integer.Schema,
	},
}) {}

export class Resolver extends Context.Tag(`app/operations/AddProductResolver`)<
	Resolver,
	RequestResolver<Request>
>() {}
