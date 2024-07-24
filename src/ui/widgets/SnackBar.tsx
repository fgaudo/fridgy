import type { Component } from 'solid-js'

export const SnackBar: Component<{
	message: string
}> = props => {
	return (
		<div
			class="bg-inverse-surface text-inverse-onSurface flex items-center rounded-md px-[16px] transition-all"
			classList={{
				'h-[50px]': props.message.length > 0,
				'h-0': props.message.length === 0,
			}}
			style={{
				'--md-elevation-level':
					'var(--md-sys-elevation-level3)',
			}}>
			{props.message}
			<md-elevation />
		</div>
	)
}
