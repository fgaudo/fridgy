import { Component } from 'solid-js'

export const Title: Component<{
	children: string
}> = props => {
	return (
		<div
			class="font-normal"
			style={{
				'font-size': '22px',
				'line-height': '28px',
				color: 'var(--md-sys-color-on-surface)',
			}}>
			{props.children}
		</div>
	)
}
