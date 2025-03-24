import type { FlowComponent, JSX } from 'solid-js'
import { Portal } from 'solid-js/web'

export const SafePortal: FlowComponent = (props: {
	children: JSX.Element
}) => {
	return (
		<Portal>
			<div class="fridgy-safe-area pointer-events-none">
				<div class="pointer-events-auto">
					{props.children}
				</div>
			</div>
		</Portal>
	)
}
