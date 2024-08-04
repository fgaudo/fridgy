import { type Component } from 'solid-js'

import { Fab } from './components/Fab'
import { List } from './components/List'
import { Menu } from './components/Menu'
import { Snackbar } from './components/Snackbar'
import { TopBar } from './components/TopBar'
import { UiStateContext } from './context'
import { type Store } from './store'
import { createStore as createUiStore } from './ui-store'

const Home: (
	createStore: () => Store,
) => Component = createStore => () => {
	const store = createStore()
	const uiStore = createUiStore(store)

	return (
		<>
			<UiStateContext.Provider
				value={{ uiStore, store }}>
				<TopBar />

				<Menu />

				<List />

				<Fab />

				<Snackbar />
			</UiStateContext.Provider>
		</>
	)
}

export default Home
