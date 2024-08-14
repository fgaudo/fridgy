import {
	Haptics,
	ImpactStyle,
} from '@capacitor/haptics'
import { createEffect, on } from 'solid-js'
import * as SS from 'solid-js/store'

import { HS, O } from '@/core/imports'

import { onResume } from '@/ui/core/capacitor'
import { useFridgyNavigate } from '@/ui/router'

import type { Store } from './store'
import { Message } from './store/actions'

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

	createEffect(
		on(
			() => state.runningRefreshing,
			runningRefreshing => {
				if (O.isNone(runningRefreshing))
					setUiState(
						'currentTimestamp',
						Date.now(),
					)
			},
		),
	)

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
		dispatch(Message.ClearSelectedProducts())
	}

	return [
		uiState,
		setUiState,
		{ disableSelectMode },
	]
}
