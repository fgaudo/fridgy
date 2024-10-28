import { type Component } from 'solid-js'

import imgUrl from '@/ui/assets/arrow.svg'

import { useUiStateContext } from '../context.tsx'

export const Fab: Component = () => {
	const {
		store: [state],
		uiStore: [uiState, setUiState],
	} = useUiStateContext()!

	return (
		<>
			<div
				classList={{
					'opacity-0 pointer-events-none':
						state.total > 0 ||
						state.isLoading ||
						state.receivedError,
				}}
				class="fixed bottom-[150px] left-0 right-0 flex flex-col items-end font-titleLarge transition-all duration-[fade]">
				<div class="w-full p-[20px] text-center">
					Your fridge looks a bit empty. <br />
					Here’s the button to add some food.
				</div>
				<div
					style={{
						filter:
							'invert(16%) sepia(2%) saturate(24%) hue-rotate(336deg) brightness(97%) contrast(93%)',
						'background-image': `url("${imgUrl}")`,
					}}
					class={`relative right-[70px] top-[30px] h-[160px] w-[160px] bg-contain bg-no-repeat`}></div>
			</div>
			<div
				class="fixed bottom-[16px] right-[16px] h-[96px] w-[96px] bg-transparent transition-all duration-fade"
				classList={{
					'opacity-0 pointer-events-none':
						uiState.isSelectModeEnabled,
				}}>
				<mdui-fab
					prop:icon="add"
					onClick={() => {
						setUiState(
							'isOpeningAddProduct',
							true,
						)
					}}
					prop:variant="primary"
					prop:size="large"></mdui-fab>
			</div>
		</>
	)
}
