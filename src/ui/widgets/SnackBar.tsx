import type { Component } from 'solid-js'

export const SnackBar: Component<{
	message: string
}> = props => {
	return (
		<div
			class="flex items-center rounded-md bg-inverse-surface px-[16px] text-inverse-onSurface transition-all"
			classList={{
				'h-[50px]': props.message.length > 0,
				'h-0': props.message.length === 0,
			}}>
			{props.message}
		</div>
	)
}
