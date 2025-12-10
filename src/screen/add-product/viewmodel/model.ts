import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'
import * as SM from '@/core/state-manager.ts'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import { Message } from './message.ts'
import * as State from './state.ts'

export type Model = {
	canSubmit: Data.TaggedEnum<{
		True: { submit: Effect.Effect<void> }
		False: object
	}>
	canSetName: Data.TaggedEnum<{
		True: { setName: (name: string) => Effect.Effect<void> }
		False: object
	}>
	canSetExpirationDate: Data.TaggedEnum<{
		True: {
			setExpirationDate: (
				date: Option.Option<Integer.Integer>,
			) => Effect.Effect<void>
		}
		False: object
	}>
	isNameValid: boolean
	isAdding: boolean
	maybeName: Option.Option<string>
	maybeExpirationDate: Option.Option<Integer.Integer>
}

export const make =
	(dispatch: SM.StateManager<State.State, Message, UC.All>['dispatch']) =>
	(state: State.State): Model => {
		return {
			...state,

			canSetName: {
				_tag: 'True',
				setName: (name: string) => dispatch(Message.SetName({ name })),
			} as const,

			canSetExpirationDate: {
				_tag: 'True',
				setExpirationDate: (
					maybeExpirationDate: Option.Option<Integer.Integer>,
				) => dispatch(Message.SetExpiration({ maybeExpirationDate })),
			} as const,

			canSubmit: State.isSubmittable(state)
				? { _tag: 'True', submit: dispatch(Message.StartAddProduct()) }
				: { _tag: 'False' },

			isNameValid: State.isNameValid(state),
		}
	}

export const init = (state: State.State): Model => ({
	...state,

	canSetName: { _tag: 'False' },
	canSetExpirationDate: { _tag: 'False' },
	canSubmit: { _tag: 'False' },
	isNameValid: State.isNameValid(state),
})
