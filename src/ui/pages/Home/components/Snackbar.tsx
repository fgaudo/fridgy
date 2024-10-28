import type { Component } from 'solid-js'
import { Portal } from 'solid-js/web'

import { Snackbar as SnackbarWidget } from '@/ui/widgets/SnackBar.tsx'

import { useUiStateContext } from '../context.tsx'

export const Snackbar: Component = () => {
	const {
		store: [state],
		uiStore: [uiState],
	} = useUiStateContext()!

	return (
		<Portal>
			<SnackbarWidget
				class="fixed bottom-0 right-1/2 flex w-full translate-x-1/2 justify-center transition-all"
				classList={{
					'bottom-[128px]':
						!uiState.isSelectModeEnabled,
					'bottom-[16px]':
						uiState.isSelectModeEnabled,
				}}
				message={state.message}
			/>
		</Portal>
	)
}
