import * as S from 'solid-js'

import type { Store } from './store/index.js'
import type { UiStore } from './ui-store.js'

export const HomeContext = S.createContext<{
	store: Store
	uiStore: UiStore
}>()

export function useUiStateContext() {
	return S.useContext(HomeContext)
}
