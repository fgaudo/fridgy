import * as S from 'solid-js'

import type { Store } from './store'
import type { UiStore } from './ui-store'

export const HomeContext = S.createContext<{
	store: Store
	uiStore: UiStore
}>()

export function useUiStateContext() {
	return S.useContext(HomeContext)
}
