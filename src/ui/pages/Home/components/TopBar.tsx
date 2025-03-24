import {
	type Component,
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
		<div class="bg-secondary flex h-16 w-full items-center shadow-md shadow-black/30">
			<div class="justify-center0 relative flex h-14 w-14 items-center">
				<button
					class="material-icons duration-fade absolute top-0 right-0 bottom-0 left-0 text-2xl transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							uiState.isSelectModeEnabled,
					}}
					onClick={() => {
						setUiState(
							'isMenuOpen',
							isMenuOpen => !isMenuOpen,
						)
					}}>
					menu
				</button>

				<button
					class="material-icons duration-fade absolute top-0 right-0 bottom-0 left-0 transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							!uiState.isSelectModeEnabled,
					}}
					onClick={() => {
						disableSelectMode()
					}}>
					close
				</button>
			</div>

			<div class="font-title-large pl-2 text-2xl">
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

			<span
				class="transition-all"
				classList={{
					'opacity-0 pointer-events-none':
						!uiState.isSelectModeEnabled,
				}}
				onClick={() => {
					dispatch(
						Message.DeleteProductsAndRefresh(),
					)
				}}>
				face
			</span>
		</div>
	)
}
