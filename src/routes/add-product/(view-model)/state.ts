import * as Schema from 'effect/Schema'

export const StateSchema = Schema.Struct({
	isAdding: Schema.Boolean,
	isLoading: Schema.Boolean,
	hasCrashOccurred: Schema.Boolean,
	toastMessage: Schema.String,
	toastType: Schema.Union(Schema.Literal(`error`), Schema.Literal(`success`)),
})

export type State = Schema.Schema.Type<typeof StateSchema>
