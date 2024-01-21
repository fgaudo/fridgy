import type { Component } from 'solid-js'

export const Title: Component<{
	children: string
}> = props => {
	return (
		<div class="MD-title-large font-normal">
			{props.children}
		</div>
	)
}
