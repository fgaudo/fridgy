import { A } from '@solidjs/router'
import {
	type Component,
	onCleanup,
	onMount,
} from 'solid-js'

import { ROUTES } from '@/ui/router.tsx'

import { useUiStateContext } from '../context.tsx'

export const Menu: Component = () => {
	const {
		uiStore: [uiState, setUiState],
	} = useUiStateContext()!

	return (
		<div
			onClick={() => {
				setUiState(
					'isMenuOpen',
					isMenuOpen => !isMenuOpen,
				)
			}}>
			<div class="hidden h-full flex-col">
				<p class="text-title-large leading-title-large font-title-large pt-8 pb-4 pl-4">
					Fridgy
				</p>

				<A href={ROUTES.about}>
					<div>About</div>
				</A>
				<a
					class="text-primary mt-auto inline-block w-fit self-center p-4 text-center underline"
					href="https://github.com/fgaudo/fridgy/wiki/Fridgy-%E2%80%90-Privacy-policy">
					Privacy policy
				</a>
			</div>
		</div>
	)
}
