import type { Component } from 'solid-js'
import { Portal } from 'solid-js/web'

import { O } from '@/core/imports.js'

import { useUiStateContext } from '../context.js'

export const InvisibleWall: Component = () => {
	const {
		store: [state],
	} = useUiStateContext()!

	return (
		<Portal>
			<div
				class="fixed bottom-0 left-0 right-0 top-0 z-[9999] flex items-center justify-center"
				style={{
					'backdrop-filter': 'blur(2px)',
				}}
				classList={{
					'opacity-0 pointer-events-none':
						O.isNone(state.runningDeleting),
				}}>
				<mdui-circular-progress></mdui-circular-progress>
			</div>
		</Portal>
	)
}
