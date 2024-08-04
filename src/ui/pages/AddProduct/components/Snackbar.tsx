import type { Component } from 'solid-js'
import { Portal } from 'solid-js/web'

import { SnackBar } from '@/ui/widgets/SnackBar'

import { useUiStateContext } from '../context'

export const Snackbar: Component = () => {
	const {
		store: [state],
	} = useUiStateContext()!

	return (
		<Portal>
			<div class="fixed bottom-[16px] left-[16px] right-[16px] z-50">
				<SnackBar message={state.toastMessage} />
			</div>
		</Portal>
	)
}
