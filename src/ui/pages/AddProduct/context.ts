import * as S from 'solid-js'

import type { Store } from './store/index.ts'
import type { UiStore } from './ui-store.ts'

export const AddProductContext = S.createContext<{
	store: Store
	uiStore: UiStore
}>()

export function useUiStateContext() {
	return S.useContext(AddProductContext)
}
