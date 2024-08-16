import { A } from '@solidjs/router'
import { type Component } from 'solid-js'
import { Portal } from 'solid-js/web'

import { ROUTES } from '@/ui/router'

import { useUiStateContext } from '../context'

export const Menu: Component = () => {
	const {
		uiStore: [uiState, setUiState],
	} = useUiStateContext()!

	return (
		<Portal>
			<mdui-navigation-drawer
				close-on-overlay-click
				prop:open={uiState.isMenuOpen}
				onClick={() => {
					setUiState(
						'isMenuOpen',
						isMenuOpen => !isMenuOpen,
					)
				}}>
				<div class="pl-2 pr-2 pt-8">
					<p class="text-titleLarge leading-titleLarge pb-4 pl-4 font-titleLarge">
						Fridgy
					</p>
					<mdui-list>
						<A href={ROUTES.about}>
							<mdui-list-item prop:icon="info">
								About
							</mdui-list-item>
						</A>
					</mdui-list>
				</div>
			</mdui-navigation-drawer>
		</Portal>
	)
}
