import * as Data from 'effect/Data'
import * as Function from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import type { UseCases } from '../../../business/app/use-cases.ts'
import { modify, noOp } from '../../../core/helper.ts'
import * as Integer from '../../../core/integer/index.ts'
import * as NonEmptyTrimmedString from '../../../core/non-empty-trimmed-string.ts'
import type { Command, Update } from '../../../core/state-manager.ts'
import { addProduct } from './commands.ts'
import type { State } from './state.ts'

type _Message = {
	AddProduct: {
		name: NonEmptyTrimmedString.NonEmptyTrimmedString
		maybeExpirationDate: Option.Option<Integer.Integer>
	}
}

export type Message = Data.TaggedEnum<_Message>
export const Message = Data.taggedEnum<Message>()

export type InternalMessage = Data.TaggedEnum<
	_Message & {
		AddProductSucceeded: object
		AddProductFailed: object
		NoOp: object
		ShowCrash: object
		Crash: { message: unknown }
	}
>

export const InternalMessage = Data.taggedEnum<InternalMessage>()

const matcher = Match.typeTags<
	InternalMessage,
	(s: Readonly<State>) => Readonly<{
		state: State
		commands: Command<InternalMessage, UseCases>[]
	}>
>()

const update_: Update<State, InternalMessage, UseCases> = matcher({
	AddProduct:
		({ maybeExpirationDate, name }) =>
		state => {
			if (state.isAdding) {
				return noOp(state)
			}

			return modify(state, draft => {
				draft.isAdding = true

				return [
					addProduct({
						name,
						maybeExpirationDate,
					}),
				]
			})
		},
	AddProductFailed: () =>
		modify(draft => {
			draft.isAdding = false
			draft.isLoading = false
		}),
	AddProductSucceeded: () =>
		modify(draft => {
			draft.isAdding = false
			draft.isLoading = false
		}),

	NoOp: () => noOp.func(),
	ShowCrash: () => noOp.func(),
	Crash: () =>
		modify(draft => {
			draft.hasCrashOccurred = true
		}),
})

export const update: Update<State, InternalMessage, UseCases> = Function.dual<
	(message: InternalMessage) => (state: State) => {
		state: State
		commands: Command<InternalMessage, UseCases>[]
	},
	(
		state: State,
		message: InternalMessage,
	) => {
		state: State
		commands: Command<InternalMessage, UseCases>[]
	}
>(2, (state, message) => update_(message)(state))
