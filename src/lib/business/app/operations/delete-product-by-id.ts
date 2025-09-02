import * as Context from 'effect/Context'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

export class Request extends Schema.TaggedRequest<Request>()(
	`DeleteProductById`,
	{
		success: Schema.Void,
		failure: Schema.Void,
		payload: { id: Schema.String },
	},
) {}

export class Resolver extends Context.Tag(
	`app/operations/DeleteProductByIdResolver`,
)<Resolver, RequestResolver.RequestResolver<Request>>() {}
