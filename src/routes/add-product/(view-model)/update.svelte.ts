import { endOfDay } from 'date-fns'

import { Da, Eff, Int, M, NETS, O, pipe } from '$lib/core/imports.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'
import type { Update } from '$lib/ui/helpers.svelte.ts'

import { addProduct, queueLoading, queueRemoveToast } from './commands.ts'
import type { State } from './state.svelte.ts'

export type Message = Da.TaggedEnum<{
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

export const Message = Da.taggedEnum<Message>()

export const update: Update<State, Message, UseCases> = (state, message) =>
	M.type<Message>().pipe(
		M.tag(`AddProduct`, () => {
			if (state.isAdding) {
				return []
			}

			const maybeName = pipe(
				O.fromNullable(state.name),
				O.flatMap(NETS.fromString),
			)

			if (O.isNone(maybeName)) {
				return []
			}

			state.toastMessage = undefined

			const maybeExpirationDate = pipe(
				O.fromNullable(state.expirationDate),
				O.flatMap(Int.fromNumber),
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
		M.tag(`AddProductFailed`, () => {
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
		M.tag(`AddProductSucceeded`, () => {
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
		M.tag(`RemoveToast`, ({ id }) => {
			if (id !== state.toastMessage?.id) {
				return [
					Eff.logWarning(`RemoveToast is stale`).pipe(Eff.as(Message.NoOp())),
				]
			}

			state.toastMessage = undefined

			return []
		}),
		M.tag(`SetExpirationDate`, ({ expirationDate }) => {
			if (expirationDate.length <= 0) {
				state.expirationDate = undefined
				return []
			}
			state.expirationDate = endOfDay(Date.parse(expirationDate)).valueOf()

			return []
		}),
		M.tag(`SetName`, ({ name }) => {
			state.hasInteractedWithName = true
			state.name = name

			return []
		}),
		M.tag(`SetNameInteracted`, () => {
			state.hasInteractedWithName = true
			return []
		}),
		M.tag(`ShowSpinner`, ({ id }) => {
			if (id !== state.spinnerId) {
				return [
					Eff.logWarning(`ShowSpinner is stale`).pipe(Eff.as(Message.NoOp())),
				]
			}
			state.isLoading = true

			return []
		}),
		M.tag(`NoOp`, () => []),
		M.tag(`ShowCrash`, () => {
			const id = Symbol()
			state.toastMessage = {
				message: `An unexpected error occurred and the app had to be reloaded`,
				id,
				type: `error`,
			}

			return [queueRemoveToast(id)]
		}),
		M.tag(`Crash`, () => {
			state.hasCrashOccurred = true
			return []
		}),

		M.exhaustive,
	)(message)
