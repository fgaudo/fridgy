import { type Component } from 'solid-js'

import { Fab } from './components/Fab.tsx'
import { InvisibleWall } from './components/InvisibleWall.tsx'
import { List } from './components/List.tsx'
import { Menu } from './components/Menu.tsx'
import { Snackbar } from './components/Snackbar.tsx'
import { TopBar } from './components/TopBar.tsx'
import { HomeContext } from './context.tsx'
import type { Store } from './store/index.ts'
import { createStore as createUiStore } from './ui-store/index.ts'

const Home: (
	createStore: () => Store,
) => Component = createStore => () => {
	const store = createStore()
	const uiStore = createUiStore(store)
	const [uiState] = uiStore
	return (
		<HomeContext.Provider
			value={{ uiStore, store }}>
			<div
				class="bg-background min-h-screen duration-75"
				classList={{
					'opacity-0': uiState.isLeavingPage,
				}}>
				<TopBar />

				<Menu />

				<List />

				<InvisibleWall />

				<Fab />

				<Snackbar />
			</div>
		</HomeContext.Provider>
	)
}

export default Home
