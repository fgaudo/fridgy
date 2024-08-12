import {
	Haptics,
	ImpactStyle,
} from '@capacitor/haptics'
import { createEffect, on } from 'solid-js'
import * as SS from 'solid-js/store'

import { onResume } from '@/ui/core/capacitor'
import { useFridgyNavigate } from '@/ui/router'

import type { Store } from './store'

export interface UiState {
	readonly isSelectModeEnabled: boolean
	isOpeningAddProduct: boolean
	isMenuOpen: boolean
	currentTimestamp: number
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
		currentTimestamp: Date.now(),
	})

	const navigate = useFridgyNavigate()

	createEffect(
		on(
			[
				() => uiState.isSelectModeEnabled,
				() => state.selectedProducts.size,
			],
			([isSelectModeEnabled], previous) => {
				if (!previous) {
					return
				}
				const prevSelect = previous[0]

				if (!prevSelect && isSelectModeEnabled) {
					void Haptics.impact({
						style: ImpactStyle.Light,
					})
				}
			},
		),
	)

	onResume(() => {
		setUiState('currentTimestamp', Date.now())
	})

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
