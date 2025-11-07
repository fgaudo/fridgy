import { endOfDay } from 'date-fns'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Function from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import type { Command, Update } from '$lib/helpers.ts'

import * as Integer from '../../../core/integer/index.ts'
import * as NonEmptyTrimmedString from '../../../core/non-empty-trimmed-string.ts'
import { addProduct, queueLoading, queueRemoveToast } from './commands.ts'
import type { State } from './state.svelte.ts'

export type Message = Data.TaggedEnum<{
	AddProduct: object
	AddProductSucceeded: object
	AddProductFailed: object
	RemoveToast: { id: symbol }
	SetExpirationDate: { expirationDate: string }
	SetName: { name: string }
	SetNameInteracted: object
	ShowSpinner: { id: symbol }
	NoOp: object
	ShowCrash: object
	Crash: { message: unknown }
}>

export const Message = Data.taggedEnum<Message>()

const matcher = Match.typeTags<
	Message,
	(s: Readonly<State>) => {
		state: State
		commands: Command<Message>[]
	}
>()

const update_: Update<State, Message> = matcher({
	AddProduct: () => state => {
		if (state.isAdding) {
			return { state, commands: [] }
		}

		const maybeName = pipe(
			Option.fromNullable(state.name),
			Option.flatMap(NonEmptyTrimmedString.fromString),
		)

		if (Option.isNone(maybeName)) {
			return { state, commands: [] }
		}

		const maybeExpirationDate = pipe(
			Option.fromNullable(state.expirationDate),
			Option.flatMap(Integer.fromNumber),
		)

		const id = Symbol()

		return {
			state: {
				...state,
				toastId: undefined,
				spinnerId: id,
				isAdding: true,
			},
			commands: [
				queueLoading(id),
				addProduct({
					name: maybeName.value,
					maybeExpirationDate,
				}),
			],
		}
	},
	AddProductFailed: () => state => {
		const id = Symbol()

		return {
			state: {
				...state,
				isAdding: false,
				spinnerId: undefined,
				isLoading: false,
				toastMessage: `Failed to add product`,
				toastId: id,
				toastType: `error`,
			},
			commands: [queueRemoveToast(id)],
		}
	},
	AddProductSucceeded: () => state => {
		const id = Symbol()

		return {
			state: {
				...state,
				isAdding: false,
				hasInteractedWithName: false,
				expirationDate: undefined,
				name: ``,
				toastMessage: `Product added`,
				toastId: id,
				toastType: `success`,
				spinnerId: undefined,
				isLoading: false,
			},
			commands: [queueRemoveToast(id)],
		}
	},
	RemoveToast:
		({ id }) =>
		state => {
			if (id !== state.toastId) {
				return {
					state,
					commands: [
						Effect.logWarning(`RemoveToast is stale`).pipe(
							Effect.as(Message.NoOp()),
						),
					],
				}
			}

			return { state: { ...state, toastId: undefined }, commands: [] }
		},
	SetExpirationDate:
		({ expirationDate }) =>
		state => {
			if (expirationDate.length <= 0) {
				return { state: { ...state, expirationDate: undefined }, commands: [] }
			}

			return {
				state: {
					...state,
					expirationDate: endOfDay(Date.parse(expirationDate)).valueOf(),
				},
				commands: [],
			}
		},
	SetName:
		({ name }) =>
		state => {
			return {
				state: { ...state, hasInteractedWithName: true, name },
				commands: [],
			}
		},
	SetNameInteracted: () => state => {
		return {
			state: { ...state, hasInteractedWithName: true },
			commands: [],
		}
	},
	ShowSpinner:
		({ id }) =>
		state => {
			if (id !== state.spinnerId) {
				return {
					state,
					commands: [
						Effect.logWarning(`ShowSpinner is stale`).pipe(
							Effect.as(Message.NoOp()),
						),
					],
				}
			}

			return { state: { ...state, isLoading: true }, commands: [] }
		},
	NoOp: () => state => ({ state, commands: [] }),
	ShowCrash: () => state => {
		const id = Symbol()

		return {
			state: {
				...state,
				toastMessage: `An unexpected error occurred and the app had to be reloaded`,
				toastId: id,
				toastType: `error`,
			},
			commands: [queueRemoveToast(id)],
		}
	},
	Crash: () => state => {
		return {
			state: {
				...state,
				hasCrashOccurred: true,
			},
			commands: [],
		}
	},
})

export const update: Update<State, Message> = Function.dual<
	(
		message: Message,
	) => (state: State) => { state: State; commands: Command<Message>[] },
	(
		state: State,
		message: Message,
	) => { state: State; commands: Command<Message>[] }
>(2, (state, message) => update_(message)(state))
