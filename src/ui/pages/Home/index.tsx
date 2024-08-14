import { type Component } from 'solid-js'

import { Fab } from './components/Fab'
import { InvisibleWall } from './components/InvisibleWall'
import { List } from './components/List'
import { Menu } from './components/Menu'
import { Snackbar } from './components/Snackbar'
import { TopBar } from './components/TopBar'
import { HomeContext } from './context'
import type { Store } from './store'
import { createStore as createUiStore } from './ui-store'

const Home: (
	createStore: () => Store,
) => Component = createStore => () => {
	const store = createStore()
	const uiStore = createUiStore(store)

	return (
		<HomeContext.Provider
			value={{ uiStore, store }}>
			<TopBar />

			<Menu />

			<List />

			<InvisibleWall />

			<Fab />

			<Snackbar />
		</HomeContext.Provider>
	)
}

export default Home
