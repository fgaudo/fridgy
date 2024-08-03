import {
	type Component,
	createEffect,
} from 'solid-js'

import { Fab } from './Fab'
import { List } from './List'
import { Menu } from './Menu'
import { Snackbar } from './Snackbar'
import { TopBar } from './TopBar'
import { useOverviewStore } from './store'

const Home: Component = () => {
	const [store, dispatch] = useOverviewStore()

	createEffect(() => {
		if (store.isMenuOpen)
			document.body.style.overflow = 'hidden'
		else document.body.style.overflow = 'auto'
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
				isSelectModeEnabled={store.selectMode}
				onItemClick={id => {
					if (!store.selectMode) {
						return
					}
					dispatch({
						type: 'toggleItem',
						id,
					})
				}}
				onItemContextMenu={id => {
					if (store.selectMode) {
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
				isSelectModeEnabled={store.selectMode}
				itemsSelected={
					store.selectedProducts.size
				}
				onCloseSelectMode={() => {
					dispatch({
						type: 'disableSelectMode',
					})
				}}
				onDeleteClick={() => {
					dispatch({
						type: 'deleteProducts',
					})
				}}
				onMenuClick={() => {
					dispatch({ type: 'toggleMenu' })
				}}
			/>

			<Menu
				isMenuOpen={store.isMenuOpen}
				onToggleMenu={() => {
					dispatch({ type: 'toggleMenu' })
				}}
			/>

			<Fab
				isLoading={store.isLoading}
				isSelectModeEnabled={store.selectMode}
				onOpenAddProduct={() => {
					dispatch({ type: 'openAddProduct' })
				}}
				atLeastOneProduct={
					store.products.length > 0
				}
			/>

			<Snackbar
				isSelectModeEnabled={store.selectMode}>
				{store.toastMessage}
			</Snackbar>
		</>
	)
}

export default Home
