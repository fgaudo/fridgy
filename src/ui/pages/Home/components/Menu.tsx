import { A } from '@solidjs/router'
import type { NavigationDrawer } from 'mdui'
import {
	type Component,
	onCleanup,
	onMount,
} from 'solid-js'

import { ROUTES } from '@/ui/router'

import { useUiStateContext } from '../context'

export const Menu: Component = () => {
	const {
		uiStore: [uiState, setUiState],
	} = useUiStateContext()!

	let drawer: NavigationDrawer

	onMount(() => {
		onCleanup(() => {
			drawer.open = false
		})
	})

	return (
		<mdui-navigation-drawer
			ref={drawer!}
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
	)
}
