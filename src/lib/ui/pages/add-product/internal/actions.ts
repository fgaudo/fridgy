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
			context.state.hasInteractedWithName = false
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

	setNameInteracted:
		() => (context: StateContext) => {
			context.state.hasInteractedWithName = true
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
