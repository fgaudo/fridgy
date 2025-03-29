import {
	type Component,
	Show,
	createMemo,
} from 'solid-js'

import { HS } from '@/core/imports.ts'

import { useUiStateContext } from '../context.tsx'
import { Message } from '../store/actions.ts'

export const TopBar: Component = () => {
	const {
		store: [state, dispatch],
		uiStore: [
			uiState,
			setUiState,
			{ disableSelectMode },
		],
	} = useUiStateContext()!

	const size = createMemo<number>(prev => {
		return uiState.isSelectModeEnabled
			? HS.size(state.selectedProducts)
			: (prev ?? 0)
	})
	return (
		<div class="bg-secondary shadow-secondary/50 flex h-16 w-full items-center shadow-md">
			<div class="relative flex h-14 w-14 items-center justify-center">
				<Show
					when={!uiState.isSelectModeEnabled}
					fallback={
						<button
							class="material-symbols duration-fade absolute top-0 right-0 bottom-0 left-0 text-2xl transition-all"
							onClick={() => {
								disableSelectMode()
							}}>
							close
						</button>
					}>
					<button
						class="material-symbols duration-fade absolute top-0 right-0 bottom-0 left-0 text-2xl transition-all"
						onClick={() => {
							setUiState(
								'isMenuOpen',
								isMenuOpen => !isMenuOpen,
							)
						}}>
						menu
					</button>
				</Show>
			</div>

			<div class="font-stylish pl-2 text-2xl font-bold">
				Fridgy
			</div>
			<div class="grow"></div>
			<div
				class="flex h-full items-center text-lg transition-all"
				classList={{
					'opacity-0 pointer-events-none':
						!uiState.isSelectModeEnabled,
				}}>
				{size()}
			</div>

			<button
				class="material-symbols text-2xl transition-all"
				classList={{
					'opacity-0 pointer-events-none':
						!uiState.isSelectModeEnabled,
				}}
				onClick={() => {
					dispatch(
						Message.DeleteProductsAndRefresh(),
					)
				}}>
				delete
			</button>
		</div>
	)
}
