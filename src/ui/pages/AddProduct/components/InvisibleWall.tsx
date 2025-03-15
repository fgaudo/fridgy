import type { Component } from 'solid-js'
import { Portal } from 'solid-js/web'

import { O } from '@/core/imports.ts'

import { useUiStateContext } from '../context.ts'

export const InvisibleWall: Component = () => {
	const {
		store: [state],
	} = useUiStateContext()!

	return (
		<Portal>
			<div
				class="fixed top-0 right-0 bottom-0 left-0 z-9999 flex items-center justify-center"
				style={{
					'backdrop-filter': 'blur(2px)',
				}}
				classList={{
					'opacity-0 pointer-events-none':
						O.isNone(state.runningAddProduct),
				}}>
				<mdui-circular-progress></mdui-circular-progress>
			</div>
		</Portal>
	)
}
