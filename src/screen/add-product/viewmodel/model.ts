import * as Data from 'effect/Data'
import * as Option from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'

import { Message } from './message.ts'
import * as State from './state.ts'

export type Model = {
	canSubmit: Data.TaggedEnum<{
		True: { submit: Message }
		False: object
	}>
	canSetName: Data.TaggedEnum<{
		True: { setName: (name: string) => Message }
		False: object
	}>
	canSetExpirationDate: Data.TaggedEnum<{
		True: {
			setExpirationDate: (date: Option.Option<Integer.Integer>) => Message
		}
		False: object
	}>
	isNameValid: boolean
	isAdding: boolean
	maybeName: Option.Option<string>
	maybeExpirationDate: Option.Option<Integer.Integer>
}

export const make = (state: State.State): Model => {
	return {
		...state,

		canSetName: {
			_tag: 'True',
			setName: (name: string) => Message.SetName({ name }),
		} as const,

		canSetExpirationDate: {
			_tag: 'True',
			setExpirationDate: (
				maybeExpirationDate: Option.Option<Integer.Integer>,
			) => Message.SetExpiration({ maybeExpirationDate }),
		} as const,

		canSubmit: State.isSubmittable(state)
			? { _tag: 'True', submit: Message.StartAddProduct() }
			: { _tag: 'False' },

		isNameValid: State.isNameValid(state),
	}
}
