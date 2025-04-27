import { O } from '$lib/core/imports.ts'

import type { StateContext } from './state.svelte.ts'

export const actions = {
	addingStarted:
		() => (context: StateContext) => {
			{
				context.state.isAdding = true
				context.state.toastMessage = undefined
			}
		},

	addingSucceeded:
		() => (context: StateContext) => {
			context.state.isAdding = false
			context.state.name = undefined
			context.state.expirationDate = undefined

			context.state.toastMessage = 'Product added'
		},

	addingFailed: () => (context: StateContext) => {
		context.state.isAdding = false
	},

	addingCancelled:
		() => (context: StateContext) => {
			context.state.isAdding = false
		},

	cancelToast: () => (context: StateContext) => {
		context.state.toastMessage = undefined
	},

	initNameIfNotSet:
		() => (context: StateContext) => {
			if (O.isNone(context.derived.maybeName)) {
				context.state.name = ''
			}
		},

	setName:
		(name: string) => (context: StateContext) => {
			context.state.name = name
		},

	setExpirationDate:
		(value: string) =>
		(context: StateContext) => {
			if (value.length <= 0) {
				context.state.expirationDate = undefined
				return
			}
			context.state.expirationDate =
				Date.parse(value)
		},
}
