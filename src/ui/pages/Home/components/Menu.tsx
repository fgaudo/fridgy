import { A } from '@solidjs/router'
import type { NavigationDrawer } from 'mdui'
import {
	type Component,
	onCleanup,
	onMount,
} from 'solid-js'

import { ROUTES } from '@/ui/router.jsx'

import { useUiStateContext } from '../context.jsx'

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
			<div class="flex h-full flex-col">
				<p class="text-titleLarge leading-titleLarge pb-4 pl-4 pt-8 font-titleLarge">
					Fridgy
				</p>

				<mdui-list>
					<A href={ROUTES.about}>
						<mdui-list-item prop:icon="info">
							About
						</mdui-list-item>
					</A>
				</mdui-list>
				<a
					class="mt-auto inline-block w-fit self-center p-4 text-center text-primary underline"
					href="https://github.com/fgaudo/fridgy/wiki/Fridgy-%E2%80%90-Privacy-policy">
					Privacy policy
				</a>
			</div>
		</mdui-navigation-drawer>
	)
}
