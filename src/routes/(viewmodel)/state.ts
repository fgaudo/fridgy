import * as Schema from 'effect/Schema'

import * as NonEmptyTrimmedString from '../../core/non-empty-trimmed-string.ts'

export const ProductViewModel = Schema.Union(
	Schema.Struct({
		isCorrupt: Schema.Literal(false),
		id: Schema.String,
		maybeName: Schema.UndefinedOr(Schema.String),
		maybeExpirationDate: Schema.UndefinedOr(Schema.Number),
		maybeCreationDate: Schema.UndefinedOr(Schema.Number),
		isValid: Schema.Literal(false),
		isSelected: Schema.Boolean,
	}),
	Schema.Struct({
		isCorrupt: Schema.Literal(false),
		id: Schema.String,
		name: Schema.String,
		maybeExpirationDate: Schema.UndefinedOr(Schema.Number),
		creationDate: Schema.Number,
		isValid: Schema.Literal(true),
		isSelected: Schema.Boolean,
	}),
	Schema.Struct({
		id: Schema.Symbol,
		isCorrupt: Schema.Literal(true),
		maybeName: Schema.UndefinedOr(Schema.NonEmptyTrimmedString),
	}),
)

export type ProductViewModel = Schema.Schema.Type<typeof ProductViewModel>

export const StateSchema = Schema.Struct({
	receivedError: Schema.Boolean,
	refreshingTaskId: Schema.UndefinedOr(Schema.Symbol),
	isDeleteRunning: Schema.Boolean,
	spinnerTaskId: Schema.UndefinedOr(Schema.Symbol),
	hasCrashOccurred: Schema.Boolean,

	toastId: Schema.UndefinedOr(Schema.Symbol),
	toastMessage: Schema.UndefinedOr(NonEmptyTrimmedString.Schema),
	toastType: Schema.Union(Schema.Literal(`error`), Schema.Literal(`success`)),

	isLoading: Schema.Boolean,

	products: Schema.UndefinedOr(Schema.Array(ProductViewModel)),
	selectedProducts: Schema.HashSet(Schema.String),
})

export type State = Schema.Schema.Type<typeof StateSchema>
