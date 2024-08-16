import type { Component } from 'solid-js'

import { useUiStateContext } from '../context'

export const Snackbar: Component = () => {
	const {
		store: [state],
		uiStore: [uiState],
	} = useUiStateContext()!

	return (
		<mdui-snackbar
			prop:open={state.toastMessage.length > 0}
			classList={{
				'bottom-[128px] left-[16px] right-[16px]':
					!uiState.isSelectModeEnabled,
				'bottom-[16px] left-[16px] right-[16px]':
					uiState.isSelectModeEnabled,
			}}>
			{state.toastMessage}
		</mdui-snackbar>
	)
}
