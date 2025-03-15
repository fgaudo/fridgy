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
		<mdui-top-app-bar
			prop:scrollBehavior="elevate"
			class="items-center">
			<div class="relative w-[40px]">
				<mdui-button-icon
					class="absolute top-[-20px] transition-all"
					prop:icon="menu"
					classList={{
						'opacity-0 pointer-events-none':
							uiState.isSelectModeEnabled,
					}}
					onClick={() => {
						setUiState(
							'isMenuOpen',
							isMenuOpen => !isMenuOpen,
						)
					}}></mdui-button-icon>

				<mdui-button-icon
					class="absolute top-[-20px] transition-all"
					prop:icon="close"
					classList={{
						'opacity-0 pointer-events-none':
							!uiState.isSelectModeEnabled,
					}}
					onClick={() => {
						disableSelectMode()
					}}></mdui-button-icon>
			</div>

			<mdui-top-app-bar-title>
				<div class="font-title-large pl-1">
					Home
				</div>
			</mdui-top-app-bar-title>

			<div class="grow"></div>
			<div
				class="flex h-full items-center text-lg transition-all"
				classList={{
					'opacity-0 pointer-events-none':
						!uiState.isSelectModeEnabled,
				}}>
				{size()}
			</div>

			<mdui-button-icon
				class="transition-all"
				classList={{
					'opacity-0 pointer-events-none':
						!uiState.isSelectModeEnabled,
				}}
				prop:icon="delete"
				onClick={() => {
					dispatch(
						Message.DeleteProductsAndRefresh(),
					)
				}}></mdui-button-icon>
		</mdui-top-app-bar>
	)
}
