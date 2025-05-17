import { endOfDay } from 'date-fns'

import { Da, Eff, Int, M, NETS, O, pipe } from '$lib/core/imports.ts'

import type { Update } from '$lib/ui/adapters.ts'

import { addProduct, queueLoading, queueRemoveToast } from './commands.ts'
import type { StateContext } from './state.svelte.ts'

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
}>

export const Message = Da.taggedEnum<Message>()

export const update: Update<
	{ state: StateContext[`state`]; derived: StateContext[`derived`] },
	Message
> = (context, message) =>
	M.type<Message>().pipe(
		M.tag(`AddProduct`, () => {
			if (context.state.isAdding) {
				return []
			}

			const maybeName = pipe(
				O.fromNullable(context.state.name),
				O.flatMap(NETS.fromString),
			)

			if (O.isNone(maybeName)) {
				return []
			}

			context.state.toastMessage = undefined

			const maybeExpirationDate = pipe(
				O.fromNullable(context.state.expirationDate),
				O.flatMap(Int.fromNumber),
			)

			const id = Symbol()
			context.state.spinnerId = id
			context.state.isAdding = true

			return [
				queueLoading(id),
				addProduct({
					name: maybeName.value,
					maybeExpirationDate,
				}),
			]
		}),
		M.tag(`AddProductFailed`, () => {
			context.state.isAdding = false
			context.state.spinnerId = undefined
			context.state.isLoading = false

			return []
		}),
		M.tag(`AddProductSucceeded`, () => {
			context.state.isAdding = false
			context.state.hasInteractedWithName = false
			context.state.expirationDate = undefined
			context.state.name = ``
			const id = Symbol()
			context.state.toastMessage = {
				message: `Product added`,
				id,
			}
			context.state.spinnerId = undefined
			context.state.isLoading = false

			return [queueRemoveToast(id)]
		}),
		M.tag(`RemoveToast`, ({ id }) => {
			if (id !== context.state.toastMessage?.id) {
				return [
					Eff.logWarning(`RemoveToast is stale`).pipe(Eff.as(Message.NoOp())),
				]
			}

			context.state.toastMessage = undefined

			return []
		}),
		M.tag(`SetExpirationDate`, ({ expirationDate }) => {
			if (expirationDate.length <= 0) {
				context.state.expirationDate = undefined
				return []
			}
			context.state.expirationDate = endOfDay(
				Date.parse(expirationDate),
			).valueOf()

			return []
		}),
		M.tag(`SetName`, ({ name }) => {
			context.state.hasInteractedWithName = true
			context.state.name = name

			return []
		}),
		M.tag(`SetNameInteracted`, () => {
			context.state.hasInteractedWithName = true
			return []
		}),
		M.tag(`ShowSpinner`, ({ id }) => {
			if (id !== context.state.spinnerId) {
				return [
					Eff.logWarning(`ShowSpinner is stale`).pipe(Eff.as(Message.NoOp())),
				]
			}
			context.state.isLoading = true

			return []
		}),
		M.tag(`NoOp`, () => []),
		M.exhaustive,
	)(message)
