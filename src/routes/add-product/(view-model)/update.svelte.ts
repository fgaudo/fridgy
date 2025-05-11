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
	queueRemoveToast,
} from './commands.ts'
import type { State } from './state.svelte.ts'

export type Message = Da.TaggedEnum<{
	AddProduct: object
	AddProductSucceeded: object
	AddProductFailed: object
	RemoveToast: object
	SetExpirationDate: { expirationDate: string }
	SetName: { name: string }
	SetNameInteracted: object
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
				O.flatMap(NETS.makeWithTrimming),
			)

			if (O.isNone(maybeName)) {
				return { state, commands: [] }
			}

			state.isAdding = true
			state.toastMessage = undefined

			const maybeExpirationDate = pipe(
				O.fromNullable(state.expirationDate),
				O.flatMap(Int.make),
			)

			return {
				state,
				commands: [
					addProduct({
						name: maybeName.value,
						maybeExpirationDate,
					}),
				],
			}
		}),
		M.tag('AddProductFailed', () => {
			state.isAdding = false

			return { state, commands: [] }
		}),
		M.tag('AddProductSucceeded', () => {
			state.isAdding = false
			state.hasInteractedWithName = false
			state.expirationDate = undefined
			state.name = ''
			state.toastMessage = 'Product added'

			return {
				state,
				commands: [queueRemoveToast],
			}
		}),
		M.tag('RemoveToast', () => {
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
				state.expirationDate = Date.parse(
					expirationDate,
				)
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
		M.exhaustive,
	)(message)
