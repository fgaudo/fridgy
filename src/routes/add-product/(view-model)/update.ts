import { endOfDay } from 'date-fns'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Function from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import type { UseCases } from '../../../business/app/use-cases.ts'
import { commands, modify, noOp } from '../../../core/helper.ts'
import * as Integer from '../../../core/integer/index.ts'
import * as NonEmptyTrimmedString from '../../../core/non-empty-trimmed-string.ts'
import type { Command, Update } from '../../../core/state-manager.ts'
import { addProduct, queueLoading, queueRemoveToast } from './commands.ts'
import type { State } from './state.ts'

type _Message = {
	AddProduct: object
	SetName: { name: string }
	SetExpirationDate: { expirationDate: string }

	SetNameInteracted: object
}

export type Message = Data.TaggedEnum<_Message>
export const Message = Data.taggedEnum<Message>()

export type InternalMessage = Data.TaggedEnum<
	_Message & {
		AddProductSucceeded: object
		AddProductFailed: object
		RemoveToast: { id: symbol }
		ShowSpinner: { id: symbol }
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
	AddProduct: () => state => {
		if (state.isAdding) {
			return noOp(state)
		}

		const maybeName = pipe(
			Option.fromNullable(state.name),
			Option.flatMap(NonEmptyTrimmedString.fromString),
		)

		if (Option.isNone(maybeName)) {
			return noOp(state)
		}

		const maybeExpirationDate = pipe(
			state.maybeExpirationDate,
			Option.flatMap(Integer.fromNumber),
		)

		return modify(state, draft => {
			const id = Symbol()

			draft.maybeToastId = Option.none()
			draft.maybeSpinnerId = Option.some(id)
			draft.isAdding = true

			return [
				queueLoading(id),
				addProduct({
					name: maybeName.value,
					maybeExpirationDate,
				}),
			]
		})
	},
	AddProductFailed: () =>
		modify(draft => {
			const id = Symbol()
			draft.isAdding = false
			draft.maybeSpinnerId = Option.none()
			draft.isLoading = false
			draft.toastMessage = `Failed to add product`
			draft.maybeToastId = Option.some(id)
			draft.toastType = `error`

			return [queueRemoveToast(id)] as const
		}),
	AddProductSucceeded: () =>
		modify(draft => {
			const id = Symbol()

			draft.isAdding = false
			draft.hasInteractedWithName = false
			draft.maybeExpirationDate = Option.none()
			draft.name = ``
			draft.toastMessage = `Product added`
			draft.maybeToastId = Option.some(id)
			draft.toastType = `success`
			draft.maybeSpinnerId = Option.none()
			draft.isLoading = false

			return [queueRemoveToast(id)] as const
		}),
	RemoveToast:
		({ id }) =>
		state => {
			if (
				Option.isNone(state.maybeToastId) ||
				id !== state.maybeToastId.value
			) {
				return commands(state, [
					Effect.gen(function* () {
						yield* Effect.logWarning(`RemoveToast is stale`)
						return InternalMessage.NoOp()
					}),
				])
			}

			return modify(state, draft => {
				draft.maybeToastId = Option.none()
			})
		},
	SetExpirationDate: ({ expirationDate }) => {
		if (expirationDate.length <= 0) {
			return modify(draft => {
				draft.maybeExpirationDate = Option.none()
			})
		}

		return modify(draft => {
			draft.maybeExpirationDate = Option.some(
				Integer.unsafeFromNumber(
					endOfDay(Date.parse(expirationDate)).valueOf(),
				),
			)
		})
	},
	SetName: ({ name }) =>
		modify(draft => {
			draft.hasInteractedWithName = true
			draft.name = name
		}),
	SetNameInteracted: () =>
		modify(draft => {
			draft.hasInteractedWithName = true
		}),
	ShowSpinner:
		({ id }) =>
		state => {
			if (
				Option.isNone(state.maybeSpinnerId) ||
				id !== state.maybeSpinnerId.value
			) {
				return commands(state, [
					Effect.gen(function* () {
						yield* Effect.logWarning(`ShowSpinner is stale`)
						return InternalMessage.NoOp()
					}),
				])
			}

			return modify(state, draft => {
				draft.isLoading = true
			})
		},
	NoOp: () => noOp(),
	ShowCrash: () =>
		modify(draft => {
			const id = Symbol()

			draft.toastMessage = `An unexpected error occurred and the app had to be reloaded`
			draft.maybeToastId = Option.some(id)
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
