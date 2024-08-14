import {
	type Component,
	createMemo,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import { HS } from '@/core/imports'

import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

import { useUiStateContext } from '../context'
import { Message } from '../store/actions'

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
		<Portal>
			<SmallTopAppBar>
				<div class="relative h-full w-full">
					<div
						class="absolute flex h-full w-full items-center gap-[24px] px-[16px] transition-all duration-fade"
						classList={{
							'opacity-0 pointer-events-none':
								uiState.isSelectModeEnabled,
						}}>
						<md-icon-button
							class="ml-[-8px] shrink-0"
							onClick={() => {
								setUiState(
									'isMenuOpen',
									isMenuOpen => !isMenuOpen,
								)
							}}>
							<md-icon>menu</md-icon>
						</md-icon-button>
						<div class="font-titleLarge text-titleLarge leading-titleLarge">
							Home
						</div>
					</div>
					<div
						class="absolute flex h-full w-full items-center gap-[24px] px-[16px] transition-all duration-fade"
						classList={{
							'opacity-0 pointer-events-none':
								!uiState.isSelectModeEnabled,
						}}>
						<md-icon-button
							class="ml-[-8px] shrink-0"
							onClick={() => {
								disableSelectMode()
							}}>
							<md-icon>close</md-icon>
						</md-icon-button>

						{size()}

						<md-icon-button
							class="ml-auto mr-[-8px] shrink-0"
							onClick={() => {
								dispatch(
									Message.DeleteProductsAndRefresh(),
								)
							}}>
							<md-icon>delete</md-icon>
						</md-icon-button>
					</div>
				</div>
			</SmallTopAppBar>
		</Portal>
	)
}
