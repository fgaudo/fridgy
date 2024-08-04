import { createEffect } from 'solid-js'
import * as SS from 'solid-js/store'

import { useFridgyNavigate } from '@/ui/router'

import type { Store } from './store'

export interface UiState {
	readonly isSelectModeEnabled: boolean
	isOpeningAddProduct: boolean
	isMenuOpen: boolean
}

export type UiStore = [
	SS.Store<UiState>,
	SS.SetStoreFunction<UiState>,
	{ disableSelectMode: () => void },
]

export const createStore: (
	store: Store,
) => UiStore = ([state, dispatch]) => {
	const [uiState, setUiState] = SS.createStore({
		get isSelectModeEnabled() {
			return state.selectedProducts.size > 0
		},
		isOpeningAddProduct: false,
		isMenuOpen: false,
	})

	const navigate = useFridgyNavigate()

	createEffect(() => {
		if (uiState.isMenuOpen)
			document.body.style.overflow = 'hidden'
		else document.body.style.overflow = 'auto'
	})

	createEffect(() => {
		if (uiState.isOpeningAddProduct) {
			navigate('addProduct')
		}
	})

	const disableSelectMode = () => {
		dispatch({ type: 'clearSelectedProducts' })
	}

	return [
		uiState,
		setUiState,
		{ disableSelectMode },
	]
}
