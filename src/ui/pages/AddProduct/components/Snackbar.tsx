import type { Component } from 'solid-js'

import { useUiStateContext } from '../context'

export const Snackbar: Component = () => {
	const {
		store: [state],
	} = useUiStateContext()!

	return (
		<mdui-snackbar
			prop:open={state.toastMessage.length > 0}>
			{state.toastMessage}
		</mdui-snackbar>
	)
}
