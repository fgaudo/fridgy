import {
	type Component,
	createEffect,
} from 'solid-js'
import * as SS from 'solid-js/store'

import { useFridgyNavigate } from '@/ui/router'

import { Fab } from './components/Fab'
import { List } from './components/List'
import { Menu } from './components/Menu'
import { Snackbar } from './components/Snackbar'
import { TopBar } from './components/TopBar'
import { type Command, type Store } from './store'

const Home: (
	createStore: () => [
		Store,
		(command: Command) => void,
	],
) => Component = createStore => () => {
	const [store, dispatch] = createStore()

	const [uiStore, setUistore] = SS.createStore({
		get isSelectModeEnabled() {
			return store.selectedProducts.size > 0
		},
		isOpeningAddProduct: false,
		isMenuOpen: false,
	})

	const navigate = useFridgyNavigate()

	createEffect(() => {
		if (uiStore.isMenuOpen)
			document.body.style.overflow = 'hidden'
		else document.body.style.overflow = 'auto'
	})

	createEffect(() => {
		if (uiStore.isOpeningAddProduct) {
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
					store.selectedProducts.has(id)
				}
				isSelectModeEnabled={
					uiStore.isSelectModeEnabled
				}
				onItemClick={id => {
					if (!uiStore.isSelectModeEnabled) {
						return
					}

					dispatch({
						type: 'toggleItem',
						id,
					})
				}}
				onItemContextMenu={id => {
					if (uiStore.isSelectModeEnabled) {
						return
					}

					dispatch({
						type: 'toggleItem',
						id,
					})
				}}
				products={store.products}
				totalItems={store.total}
			/>

			{/* *********** */}
			{/* Out of flow */}
			{/* *********** */}

			<TopBar
				isSelectModeEnabled={
					uiStore.isSelectModeEnabled
				}
				itemsSelected={
					store.selectedProducts.size
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
					setUistore(
						'isMenuOpen',
						isMenuOpen => !isMenuOpen,
					)
				}}
			/>

			<Menu
				isMenuOpen={uiStore.isMenuOpen}
				onToggleMenu={() => {
					setUistore(
						'isMenuOpen',
						isMenuOpen => !isMenuOpen,
					)
				}}
			/>

			<Fab
				isLoading={store.isLoading}
				isSelectModeEnabled={
					uiStore.isSelectModeEnabled
				}
				onOpenAddProduct={() => {
					setUistore('isOpeningAddProduct', true)
				}}
				atLeastOneProduct={
					store.products.length > 0
				}
			/>

			<Snackbar
				isSelectModeEnabled={
					uiStore.isSelectModeEnabled
				}>
				{store.toastMessage}
			</Snackbar>
		</>
	)
}

export default Home
