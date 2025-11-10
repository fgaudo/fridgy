import * as Schema from 'effect/Schema'

import * as NonEmptyTrimmedString from '../../core/non-empty-trimmed-string.ts'

export const ProductViewModelSchema = Schema.Union(
	Schema.Struct({
		isCorrupt: Schema.Literal(false),
		id: Schema.String,
		maybeName: Schema.Option(Schema.String),
		maybeExpirationDate: Schema.Option(Schema.Number),
		maybeCreationDate: Schema.Option(Schema.Number),
		isValid: Schema.Literal(false),
	}),
	Schema.Struct({
		isCorrupt: Schema.Literal(false),
		id: Schema.String,
		name: Schema.String,
		maybeExpirationDate: Schema.Option(Schema.Number),
		creationDate: Schema.Number,
		isValid: Schema.Literal(true),
	}),
	Schema.Struct({
		id: Schema.Symbol,
		isCorrupt: Schema.Literal(true),
		maybeName: Schema.Option(Schema.NonEmptyTrimmedString),
	}),
)

export type ProductViewModel = Schema.Schema.Type<typeof ProductViewModelSchema>

export const StateSchema = Schema.Struct({
	receivedError: Schema.Boolean,
	maybeRefreshingTaskId: Schema.Option(Schema.Symbol),
	isDeleteRunning: Schema.Boolean,
	hasCrashOccurred: Schema.Boolean,

	maybeMessage: Schema.Option(NonEmptyTrimmedString.Schema),
	messageType: Schema.Union(Schema.Literal(`error`), Schema.Literal(`success`)),

	isLoading: Schema.Boolean,

	maybeProducts: Schema.Option(Schema.NonEmptyArray(ProductViewModelSchema)),
})

export type State = Schema.Schema.Type<typeof StateSchema>
