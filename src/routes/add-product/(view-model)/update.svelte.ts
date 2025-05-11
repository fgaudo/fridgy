import { endOfDay } from 'date-fns'

import {
	Da,
	Int,
	M,
	NETS,
	O,
	pipe,
} from '$lib/core/imports.ts'
import type { Update } from '$lib/core/store.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'

import {
	addProduct,
	queueLoading,
	queueRemoveToast,
} from './commands.ts'
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
}>

export const Message = Da.taggedEnum<Message>()

export const update: Update<
	State,
	Message,
	UseCases
> = (state, message) =>
	M.type<Message>().pipe(
		M.tag('AddProduct', () => {
			if (state.isAdding) {
				return { state, commands: [] }
			}

			const maybeName = pipe(
				O.fromNullable(state.name),
				O.flatMap(NETS.fromString),
			)

			if (O.isNone(maybeName)) {
				return { state, commands: [] }
			}

			state.toastMessage = undefined

			const maybeExpirationDate = pipe(
				O.fromNullable(state.expirationDate),
				O.flatMap(Int.fromNumber),
			)

			const id = Symbol()
			state.spinnerId = id
			state.isAdding = true

			return {
				state,
				commands: [
					queueLoading(id),
					addProduct({
						name: maybeName.value,
						maybeExpirationDate,
					}),
				],
			}
		}),
		M.tag('AddProductFailed', () => {
			state.isAdding = false
			state.spinnerId = undefined
			state.isLoading = false

			return { state, commands: [] }
		}),
		M.tag('AddProductSucceeded', () => {
			state.isAdding = false
			state.hasInteractedWithName = false
			state.expirationDate = undefined
			state.name = ''
			const id = Symbol()
			state.toastMessage = {
				message: 'Product added',
				id,
			}
			state.spinnerId = undefined
			state.isLoading = false

			return {
				state,
				commands: [queueRemoveToast(id)],
			}
		}),
		M.tag('RemoveToast', ({ id }) => {
			if (id !== state.toastMessage?.id) {
				return { state, commands: [] }
			}

			state.toastMessage = undefined

			return { state, commands: [] }
		}),
		M.tag(
			'SetExpirationDate',
			({ expirationDate }) => {
				if (expirationDate.length <= 0) {
					state.expirationDate = undefined
					return { state, commands: [] }
				}
				state.expirationDate = endOfDay(
					Date.parse(expirationDate),
				).valueOf()

				return { state, commands: [] }
			},
		),
		M.tag('SetName', ({ name }) => {
			state.hasInteractedWithName = true
			state.name = name

			return { state, commands: [] }
		}),
		M.tag('SetNameInteracted', () => {
			state.hasInteractedWithName = true
			return { state, commands: [] }
		}),
		M.tag('ShowSpinner', ({ id }) => {
			if (id !== state.spinnerId) {
				return { state, commands: [] }
			}
			state.isLoading = true

			return {
				state,
				commands: [],
			}
		}),
		M.exhaustive,
	)(message)
