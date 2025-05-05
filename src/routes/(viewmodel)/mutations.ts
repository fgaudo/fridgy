import type { ProductsPage } from '$lib/business/app/use-cases/get-sorted-products.ts'

import type { State } from './state.svelte.ts'

export const mutations = (state: State) => ({
	toggleMenu() {
		state.isMenuOpen = !state.isMenuOpen
	},

	fetchListCancelled() {},

	fetchListSucceeded(page: ProductsPage) {
		state.productsState.pageEntries = page.entries

		state.productsState.total = page.total
		state.isLoading = false
	},

	fetchListFailed() {
		state.receivedError = true
		state.isLoading = false
	},

	fetchListStarted() {
		state.isLoading = true
	},

	disableSelectMode() {
		state.productsState.selected.clear()
	},
	refreshTime(timestamp: number) {
		state.currentTimestamp = timestamp
	},

	toggleItem(product: UncorruptProductViewModel) {
		const id = asValue(product.maybeId)

		if (state.productsState.selected.has(id)) {
			product.isSelected = false
			state.productsState.selected.delete(id)
			return
		}

		state.productsState.selected.add(id)
		product.isSelected = true
	},

	enableRefreshTimeListeners() {
		state.refreshTimeListenersRegistered = true
	},
	disableRefreshTimeListeners() {
		state.refreshTimeListenersRegistered = false
	},

	deleteSelectedAndRefreshStarted() {
		state.isLoading = true
	},

	deleteSelectedFailed() {
		state.isLoading = false
	},

	deleteSelectedAndRefreshSucceeded(
		result: ProductsPage,
	) {
		state.productsState.pageEntries =
			result.entries
		state.productsState.total = result.total
		state.isLoading = false
		state.productsState.selected.clear()
	},
	deleteSelectedSuccededAndRefreshFailed() {
		state.productsState.selected.clear()
		state.isLoading = false
		state.receivedError = true
	},
})
