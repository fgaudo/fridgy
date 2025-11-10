import * as Data from 'effect/Data'
import * as Function from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import type { UseCases } from '../../../business/app/use-cases.ts'
import { modify, noOp } from '../../../core/helper.ts'
import * as Integer from '../../../core/integer/index.ts'
import * as NonEmptyTrimmedString from '../../../core/non-empty-trimmed-string.ts'
import type { Command, Update } from '../../../core/state-manager.ts'
import { addProduct, queueLoading, queueRemoveToast } from './commands.ts'
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
				const id = Symbol()

				draft.isAdding = true

				return [
					queueLoading(id),
					addProduct({
						name,
						maybeExpirationDate,
					}),
				]
			})
		},
	AddProductFailed: () =>
		modify(draft => {
			const id = Symbol()
			draft.isAdding = false
			draft.isLoading = false
			draft.toastMessage = `Failed to add product`
			draft.toastType = `error`

			return [queueRemoveToast(id)] as const
		}),
	AddProductSucceeded: () =>
		modify(draft => {
			const id = Symbol()

			draft.isAdding = false
			draft.toastMessage = `Product added`
			draft.toastType = `success`
			draft.isLoading = false

			return [queueRemoveToast(id)] as const
		}),

	NoOp: () => noOp.curried(),
	ShowCrash: () =>
		modify(draft => {
			const id = Symbol()

			draft.toastMessage = `An unexpected error occurred and the app had to be reloaded`
			draft.toastType = `error`

			return [queueRemoveToast(id)] as const
		}),
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
	) => { state: State; commands: Command<InternalMessage, UseCases>[] }
>(2, (state, message) => update_(message)(state))
