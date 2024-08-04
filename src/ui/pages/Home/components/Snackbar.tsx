import type { Component } from 'solid-js'
import { Portal } from 'solid-js/web'

import { SnackBar } from '@/ui/widgets/SnackBar'

import { useUiStateContext } from '../context'

export const Snackbar: Component = () => {
	const {
		store: [state],
		uiStore: [uiState],
	} = useUiStateContext()!

	return (
		<Portal>
			<div
				class="fixed z-50 transition-all"
				classList={{
					'bottom-[128px] left-[16px] right-[16px]':
						!uiState.isSelectModeEnabled,
					'bottom-[16px] left-[16px] right-[16px]':
						uiState.isSelectModeEnabled,
				}}>
				<SnackBar message={state.toastMessage} />
			</div>
		</Portal>
	)
}
