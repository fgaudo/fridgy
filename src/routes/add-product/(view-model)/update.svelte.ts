import { endOfDay } from 'date-fns'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import * as Integer from '$lib/core/integer/index.ts'
import * as NonEmptyTrimmedString from '$lib/core/non-empty-trimmed-string.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import type { Update } from '$lib/ui/helpers.svelte.ts'

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

export const update: Update<State, Message, UseCases> = (state, message) =>
	Match.type<Message>().pipe(
		Match.tag(`AddProduct`, () => {
			if (state.isAdding) {
				return []
			}

			const maybeName = pipe(
				Option.fromNullable(state.name),
				Option.flatMap(NonEmptyTrimmedString.fromString),
			)

			if (Option.isNone(maybeName)) {
				return []
			}

			state.toastMessage = undefined

			const maybeExpirationDate = pipe(
				Option.fromNullable(state.expirationDate),
				Option.flatMap(Integer.fromNumber),
			)

			const id = Symbol()
			state.spinnerId = id
			state.isAdding = true

			return [
				queueLoading(id),
				addProduct({
					name: maybeName.value,
					maybeExpirationDate,
				}),
			]
		}),
		Match.tag(`AddProductFailed`, () => {
			state.isAdding = false
			state.spinnerId = undefined
			state.isLoading = false
			const id = Symbol()
			state.toastMessage = {
				message: `Failed to add product`,
				id,
				type: `error`,
			}
			return [queueRemoveToast(id)]
		}),
		Match.tag(`AddProductSucceeded`, () => {
			state.isAdding = false
			state.hasInteractedWithName = false
			state.expirationDate = undefined
			state.name = ``
			const id = Symbol()
			state.toastMessage = {
				message: `Product added`,
				id,
				type: `success`,
			}
			state.spinnerId = undefined
			state.isLoading = false

			return [queueRemoveToast(id)]
		}),
		Match.tag(`RemoveToast`, ({ id }) => {
			if (id !== state.toastMessage?.id) {
				return [
					Effect.logWarning(`RemoveToast is stale`).pipe(
						Effect.as(Message.NoOp()),
					),
				]
			}

			state.toastMessage = undefined

			return []
		}),
		Match.tag(`SetExpirationDate`, ({ expirationDate }) => {
			if (expirationDate.length <= 0) {
				state.expirationDate = undefined
				return []
			}
			state.expirationDate = endOfDay(Date.parse(expirationDate)).valueOf()

			return []
		}),
		Match.tag(`SetName`, ({ name }) => {
			state.hasInteractedWithName = true
			state.name = name

			return []
		}),
		Match.tag(`SetNameInteracted`, () => {
			state.hasInteractedWithName = true
			return []
		}),
		Match.tag(`ShowSpinner`, ({ id }) => {
			if (id !== state.spinnerId) {
				return [
					Effect.logWarning(`ShowSpinner is stale`).pipe(
						Effect.as(Message.NoOp()),
					),
				]
			}
			state.isLoading = true

			return []
		}),
		Match.tag(`NoOp`, () => []),
		Match.tag(`ShowCrash`, () => {
			const id = Symbol()
			state.toastMessage = {
				message: `An unexpected error occurred and the app had to be reloaded`,
				id,
				type: `error`,
			}

			return [queueRemoveToast(id)]
		}),
		Match.tag(`Crash`, () => {
			state.hasCrashOccurred = true
			return []
		}),

		Match.exhaustive,
	)(message)
