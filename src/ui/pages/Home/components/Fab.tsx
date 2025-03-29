import { type Component } from 'solid-js'

import imgUrl from '@/ui/assets/arrow.svg'
import { SafePortal } from '@/ui/widgets/SafePortal.tsx'

import { useUiStateContext } from '../context.tsx'

export const Fab: Component = () => {
	const {
		store: [state],
		uiStore: [uiState, setUiState],
	} = useUiStateContext()!

	return (
		<>
			<SafePortal>
				<div
					classList={{
						'opacity-0 pointer-events-none':
							state.total > 0 ||
							state.isLoading ||
							state.receivedError,
					}}
					class="font-stylish fixed right-0 bottom-[150px] left-0 flex flex-col items-end transition-all duration-[fade]">
					<div class="w-full p-[20px] text-center">
						Uh-oh, your fridge is looking a little
						empty! <br />
						Let’s fill it up!
					</div>
					<div
						style={{
							filter:
								'invert(16%) sepia(2%) saturate(24%) hue-rotate(336deg) brightness(97%) contrast(93%)',
							'background-image': `url("${imgUrl}")`,
						}}
						class={`relative top-[30px] right-[70px] h-[160px] w-[160px] bg-contain bg-no-repeat`}></div>
				</div>
				<div
					class="bg-primary text-background duration-fade shadow-primary/70 fixed right-[16px] bottom-[20px] flex h-[96px] w-[96px] items-center justify-center rounded-4xl shadow-md transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							uiState.isSelectModeEnabled,
					}}
					onClick={() => {
						setUiState(
							'isOpeningAddProduct',
							true,
						)
					}}>
					<span class="material-symbols text-4xl">
						add
					</span>
				</div>
			</SafePortal>
		</>
	)
}
