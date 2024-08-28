import { type Component } from 'solid-js'

import { Fab } from './components/Fab.jsx'
import { InvisibleWall } from './components/InvisibleWall.jsx'
import { List } from './components/List.jsx'
import { Menu } from './components/Menu.jsx'
import { Snackbar } from './components/Snackbar.jsx'
import { TopBar } from './components/TopBar.jsx'
import { HomeContext } from './context.jsx'
import type { Store } from './store/index.js'
import { createStore as createUiStore } from './ui-store.js'

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
