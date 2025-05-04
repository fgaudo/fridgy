import { asValue } from '$lib/core/utils.ts'

import type { ProductsPage } from '$lib/business/app/use-cases/get-sorted-products.ts'

import type {
	StateContext,
	UncorruptProductViewModel,
} from './state.svelte.ts'

export function toggleMenu() {
	return (context: StateContext) => {
		context.state.isMenuOpen =
			!context.state.isMenuOpen
	}
}

export function fetchListCancelled() {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	return (context: StateContext) => {}
}

export function fetchListSucceeded(
	page: ProductsPage,
) {
	return (context: StateContext) => {
		context.state.productsState.pageEntries =
			page.entries

		context.state.productsState.total = page.total
		context.state.isLoading = false
	}
}

export function fetchListFailed() {
	return (context: StateContext) => {
		context.state.receivedError = true
		context.state.isLoading = false
	}
}

export function fetchListStarted() {
	return (context: StateContext) => {
		context.state.isLoading = true
	}
}

export function disableSelectMode() {
	return (context: StateContext) => {
		context.state.productsState.selected.clear()
	}
}

export function refreshTime(timestamp: number) {
	return (context: StateContext) => {
		context.state.currentTimestamp = timestamp
	}
}

export function toggleItem(
	product: UncorruptProductViewModel,
) {
	return (context: StateContext) => {
		const id = asValue(product.maybeId)

		if (
			context.state.productsState.selected.has(id)
		) {
			product.isSelected = false
			context.state.productsState.selected.delete(
				id,
			)
			return
		}

		context.state.productsState.selected.add(id)
		product.isSelected = true
	}
}

export function enableRefreshTimeListeners() {
	return (context: StateContext) => {
		context.state.refreshTimeListenersRegistered =
			true
	}
}

export function disableRefreshTimeListeners() {
	return (context: StateContext) => {
		context.state.refreshTimeListenersRegistered =
			false
	}
}

export function deleteSelectedAndRefreshStarted() {
	return (context: StateContext) => {
		context.state.isLoading = true
	}
}

export function deleteSelectedFailed() {
	return (context: StateContext) => {
		context.state.isLoading = false
	}
}

export function deleteSelectedAndRefreshSucceeded(
	result: ProductsPage,
) {
	return (context: StateContext) => {
		context.state.productsState.pageEntries =
			result.entries
		context.state.productsState.total =
			result.total
		context.state.isLoading = false
		context.state.productsState.selected.clear()
	}
}

export function deleteSelectedSuccededAndRefreshFailed() {
	return (context: StateContext) => {
		context.state.productsState.selected.clear()
		context.state.isLoading = false
		context.state.receivedError = true
	}
}
