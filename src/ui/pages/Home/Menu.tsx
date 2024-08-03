import type { Component } from 'solid-js'
import { Portal } from 'solid-js/web'

export const Menu: Component<{
	isMenuOpen: boolean
	onToggleMenu: () => void
}> = props => {
	return (
		<Portal>
			<div
				class="fixed bottom-0 left-0 right-0 top-0 z-50 h-full w-full overflow-auto transition-all"
				classList={{
					'bg-[#00000076]': props.isMenuOpen,
					'pointer-events-none':
						!props.isMenuOpen,
				}}
				onClick={() => {
					props.onToggleMenu()
				}}>
				<div
					onClick={e => {
						e.stopPropagation()
					}}
					classList={{
						'w-9/12': props.isMenuOpen,
						'w-0': !props.isMenuOpen,
					}}
					class="z-49 relative bottom-0 left-0 top-0 box-border h-full flex-1 overflow-hidden bg-surface transition-all">
					<div class="pl-2 pr-2 pt-8">
						<p class="pb-4 pl-4 font-titleLarge text-titleLarge leading-titleLarge">
							Fridgy
						</p>
						<md-list>
							<md-list-item prop:type="button">
								<md-icon slot="start">
									info
								</md-icon>
								<div slot="headline">About</div>
							</md-list-item>
						</md-list>
					</div>
				</div>
			</div>
		</Portal>
	)
}
