import type { Component } from 'solid-js'
import { Portal } from 'solid-js/web'

import { SnackBar } from '@/ui/widgets/SnackBar'

export const Snackbar: Component<{
	isSelectModeEnabled: boolean
	children: string
}> = props => {
	return (
		<Portal>
			<div
				class="fixed z-50 transition-all"
				classList={{
					'bottom-[128px] left-[16px] right-[16px]':
						!props.isSelectModeEnabled,
					'bottom-[16px] left-[16px] right-[16px]':
						props.isSelectModeEnabled,
				}}>
				<SnackBar message={props.children} />
			</div>
		</Portal>
	)
}
