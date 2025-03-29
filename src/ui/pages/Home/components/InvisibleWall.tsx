import type { Component } from 'solid-js'

import { O } from '@/core/imports.ts'

import { SafePortal } from '@/ui/widgets/SafePortal.tsx'
import { Spinner } from '@/ui/widgets/Spinner.tsx'

import { useUiStateContext } from '../context.tsx'

export const InvisibleWall: Component = () => {
	const {
		store: [state],
	} = useUiStateContext()!

	return (
		<SafePortal>
			<div
				class="fixed top-0 right-0 bottom-0 left-0 z-9999 flex items-center justify-center"
				style={{
					'backdrop-filter': 'blur(2px)',
				}}
				classList={{
					'opacity-0 pointer-events-none':
						O.isNone(state.isRunningDelete),
				}}>
				<Spinner />
			</div>
		</SafePortal>
	)
}
