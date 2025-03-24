import type { Component } from 'solid-js'

import { SafePortal } from '@/ui/widgets/SafePortal.tsx'
import { Snackbar as SnackbarWidget } from '@/ui/widgets/SnackBar.tsx'

import { useUiStateContext } from '../context.tsx'

export const Snackbar: Component = () => {
	const {
		store: [state],
		uiStore: [uiState],
	} = useUiStateContext()!

	return (
		<SafePortal>
			<SnackbarWidget
				class="fixed right-1/2 bottom-0 flex w-full translate-x-1/2 justify-center transition-all"
				classList={{
					'bottom-[128px]':
						!uiState.isSelectModeEnabled,
					'bottom-[16px]':
						uiState.isSelectModeEnabled,
				}}
				message={state.message}
			/>
		</SafePortal>
	)
}
