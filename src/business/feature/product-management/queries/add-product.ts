import * as Context from 'effect/Context'
import { type RequestResolver } from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string'

export class Request extends Schema.TaggedRequest<Request>()(`AddProduct`, {
	failure: Schema.Void,
	success: Schema.Void,
	payload: {
		name: NonEmptyTrimmedString.Schema,
		maybeExpirationDate: Schema.Option(Integer.Schema),
		creationDate: Integer.Schema,
	},
}) {}

export class AddProduct extends Context.Tag(
	`shared/queries/AddProductResolver`,
)<AddProduct, RequestResolver<Request>>() {}
