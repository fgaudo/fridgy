import {
	Haptics,
	ImpactStyle,
} from '@capacitor/haptics'
import { createEffect, on } from 'solid-js'
import * as SS from 'solid-js/store'

import { Eff, HS } from '@/core/imports.js'

import { onResume } from '@/ui/core/capacitor.js'
import { useFiber } from '@/ui/core/solid.js'
import { useFridgyNavigate } from '@/ui/router.jsx'

import { Message } from './store/actions.js'
import type { Store } from './store/index.js'

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
			return HS.size(state.selectedProducts) > 0
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
				() => HS.size(state.selectedProducts),
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

	useFiber(
		Eff.gen(function* () {
			for (;;) {
				yield* Eff.sleep(20000)
				setUiState('currentTimestamp', Date.now())
			}
		}),
	)

	createEffect(() => {
		if (uiState.isOpeningAddProduct) {
			navigate('addProduct')
		}
	})

	const disableSelectMode = () => {
		dispatch(Message.ClearSelectedProducts())
	}

	return [
		uiState,
		setUiState,
		{ disableSelectMode },
	]
}
