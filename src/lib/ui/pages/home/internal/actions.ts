import type { ProductsPage } from '$lib/business/app/use-cases/get-sorted-products.ts'

import type {
	ProductViewModel,
	StateContext,
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
		context.state.products = page.products
		context.state.total = page.total
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
		context.state.selected.clear()
	}
}

export function refreshTime(timestamp: number) {
	return (context: StateContext) => {
		context.state.currentTimestamp = timestamp
	}
}

export function toggleItem(
	product: ProductViewModel,
) {
	return (context: StateContext) => {
		if (context.state.selected.has(product.id)) {
			product.isSelected = false
			context.state.selected.delete(product.id)
			return
		}

		context.state.selected.add(product.id)
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
		context.state.products = result.products
		context.state.total = result.total
		context.state.isLoading = false
		context.state.selected.clear()
	}
}

export function deleteSelectedSuccededAndRefreshFailed() {
	return (context: StateContext) => {
		context.state.selected.clear()
		context.state.isLoading = false
		context.state.receivedError = true
	}
}
