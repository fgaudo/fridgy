import type { StateContext } from './state.svelte.ts'

export function addingStarted() {
	return (context: StateContext) => {
		{
			context.state.isAdding = true
			context.state.toastMessage = undefined
		}
	}
}

export function addingSucceeded() {
	return (context: StateContext) => {
		context.state.isAdding = false
		context.state.hasInteractedWithName = false
		context.state.expirationDate = undefined
		context.state.name = ''
		context.state.toastMessage = 'Product added'
	}
}

export function addingFailed() {
	return (context: StateContext) => {
		context.state.isAdding = false
	}
}

export function addingCancelled() {
	return (context: StateContext) => {
		context.state.isAdding = false
	}
}

export function cancelToast() {
	return (context: StateContext) => {
		context.state.toastMessage = undefined
	}
}

export function setNameInteracted() {
	return (context: StateContext) => {
		context.state.hasInteractedWithName = true
	}
}

export function setName(name: string) {
	return (context: StateContext) => {
		context.state.hasInteractedWithName = true
		context.state.name = name
	}
}

export function setExpirationDate(value: string) {
	return (context: StateContext) => {
		if (value.length <= 0) {
			context.state.expirationDate = undefined
			return
		}
		context.state.expirationDate =
			Date.parse(value)
	}
}
