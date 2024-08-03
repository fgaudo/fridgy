import { type Component } from 'solid-js'
import { Portal } from 'solid-js/web'

import imgUrl from '@/ui/assets/arrow.svg'
import * as H from '@/ui/core/helpers'

export const Fab: Component<{
	atLeastOneProduct: boolean
	isLoading: boolean
	isSelectModeEnabled: boolean
	onOpenAddProduct: () => void
}> = props => {
	const scroll = H.useWindowScroll()

	return (
		<Portal>
			<div
				classList={{
					'opacity-0 pointer-events-none':
						props.atLeastOneProduct ||
						props.isLoading,
				}}
				class="fixed bottom-[150px] left-0 right-0 flex flex-col items-end font-titleLarge">
				<div class="w-full p-[20px] text-center">
					Your fridge looks a bit empty. <br />
					Here’s the button to add some food.
				</div>
				<div
					style={{
						'background-image': `url("${imgUrl}")`,
					}}
					class={`relative right-[70px] top-[30px] h-[160px] w-[160px] bg-contain bg-no-repeat`}
				/>
			</div>
			<div
				class="fixed bottom-[16px] right-[16px] h-[96px] w-[96px] bg-transparent transition-all duration-300"
				classList={{
					'opacity-0 pointer-events-none':
						props.isSelectModeEnabled,

					'opacity-50':
						scroll().isScrolling &&
						!props.isSelectModeEnabled,
				}}>
				<md-fab
					onClick={() => {
						props.onOpenAddProduct()
					}}
					prop:variant="primary"
					prop:size="large">
					<md-icon slot="icon">add</md-icon>
				</md-fab>
			</div>
		</Portal>
	)
}
