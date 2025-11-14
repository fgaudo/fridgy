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

export class DeleteProductById extends Context.Tag(
	`shared/queries/DeleteProductById`,
)<
	DeleteProductById,
	{ resolver: RequestResolver.RequestResolver<Request> }
>() {}
