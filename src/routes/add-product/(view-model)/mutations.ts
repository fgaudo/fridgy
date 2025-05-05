import type { State } from './state.svelte.ts'

export const mutations = (state: State) => ({
	addingStarted() {
		state.isAdding = true
		state.toastMessage = undefined
	},

	addingSucceeded() {
		state.isAdding = false
		state.hasInteractedWithName = false
		state.expirationDate = undefined
		state.name = ''
		state.toastMessage = 'Product added'
	},

	addingFailed() {
		state.isAdding = false
	},

	addingCancelled() {
		state.isAdding = false
	},

	cancelToast() {
		state.toastMessage = undefined
	},

	setNameInteracted() {
		state.hasInteractedWithName = true
	},
	setName(name: string) {
		state.hasInteractedWithName = true
		state.name = name
	},

	setExpirationDate(value: string) {
		if (value.length <= 0) {
			state.expirationDate = undefined
			return
		}
		state.expirationDate = Date.parse(value)
	},
})
