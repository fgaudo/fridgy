import {
	type Component,
	createEffect,
} from 'solid-js'
import * as SS from 'solid-js/store'

import { type Navigator } from '@/ui/router'

import { Fab } from './components/Fab'
import { List } from './components/List'
import { Menu } from './components/Menu'
import { Snackbar } from './components/Snackbar'
import { TopBar } from './components/TopBar'
import { type Store } from './store'

const Home: (
	createContext: () => {
		store: Store
		navigate: Navigator
	},
) => Component = createContext => () => {
	const {
		store: [state, dispatch],
		navigate,
	} = createContext()

	const [uiState, setUistate] = SS.createStore({
		get isSelectModeEnabled() {
			return state.selectedProducts.size > 0
		},
		isOpeningAddProduct: false,
		isMenuOpen: false,
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

	return (
		<>
			<List
				logItemRender={message => {
					dispatch({
						type: 'log',
						severity: 'debug',
						message,
					})
				}}
				isItemSelected={id =>
					state.selectedProducts.has(id)
				}
				isSelectModeEnabled={
					uiState.isSelectModeEnabled
				}
				onItemClick={id => {
					if (!uiState.isSelectModeEnabled) {
						return
					}

					dispatch({
						type: 'toggleItem',
						id,
					})
				}}
				onItemContextMenu={id => {
					if (uiState.isSelectModeEnabled) {
						return
					}

					dispatch({
						type: 'toggleItem',
						id,
					})
				}}
				products={state.products}
				totalItems={state.total}
			/>

			{/* *********** */}
			{/* Out of flow */}
			{/* *********** */}

			<TopBar
				isSelectModeEnabled={
					uiState.isSelectModeEnabled
				}
				itemsSelected={
					state.selectedProducts.size
				}
				onCloseSelectMode={() => {
					dispatch({
						type: 'clearSelectedProducts',
					})
				}}
				onDeleteClick={() => {
					dispatch({
						type: 'deleteProducts',
					})
				}}
				onMenuClick={() => {
					setUistate(
						'isMenuOpen',
						isMenuOpen => !isMenuOpen,
					)
				}}
			/>

			<Menu
				isMenuOpen={uiState.isMenuOpen}
				onToggleMenu={() => {
					setUistate(
						'isMenuOpen',
						isMenuOpen => !isMenuOpen,
					)
				}}
			/>

			<Fab
				isLoading={state.isLoading}
				isSelectModeEnabled={
					uiState.isSelectModeEnabled
				}
				onOpenAddProduct={() => {
					setUistate('isOpeningAddProduct', true)
				}}
				atLeastOneProduct={
					state.products.length > 0
				}
			/>

			<Snackbar
				isSelectModeEnabled={
					uiState.isSelectModeEnabled
				}>
				{state.toastMessage}
			</Snackbar>
		</>
	)
}

export default Home
