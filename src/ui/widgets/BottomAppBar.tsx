import { Component, JSXElement } from 'solid-js'

export const BottomAppBar: Component<{
	children: JSXElement
}> = props => {
	return (
		<div
			class="fixed bottom-0 left-0 right-0 z-50 box-content flex h-[56px] items-center py-[12px] pl-[4px] pr-[16px]"
			style={{
				'--md-elevation-level': '2',
				'background-color':
					'var(--md-sys-color-surface-container)',
			}}>
			{props.children}
			<md-elevation />
		</div>
	)
}
