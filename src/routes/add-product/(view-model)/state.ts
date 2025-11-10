import * as Schema from 'effect/Schema'

import * as Integer from '../../../core/integer/index.ts'

export const StateSchema = Schema.Struct({
	name: Schema.String,
	maybeExpirationDate: Schema.Option(Integer.Schema),
	currentDate: Integer.Schema,
	isAdding: Schema.Boolean,
	isLoading: Schema.Boolean,
	hasCrashOccurred: Schema.Boolean,
	toastMessage: Schema.String,
	maybeToastId: Schema.Option(Schema.Symbol),
	toastType: Schema.Union(Schema.Literal(`error`), Schema.Literal(`success`)),
	hasInteractedWithName: Schema.Boolean,
	maybeSpinnerId: Schema.Option(Schema.Symbol),
})

export type State = Schema.Schema.Type<typeof StateSchema>
