import type { Component } from 'solid-js'

export const LeadingIcon: Component<{
	children: string
}> = props => {
	return (
		<md-icon-button>
			<md-icon>{props.children}</md-icon>
		</md-icon-button>
	)
}
