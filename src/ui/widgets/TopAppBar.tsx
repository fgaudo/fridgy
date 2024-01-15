import { Component, JSXElement } from 'solid-js'

export const TopAppBar: Component<{
	children: JSXElement
}> = props => {
	return (
		<div
			class="fixed left-0 right-0 top-0 z-50 box-content flex h-[56px] items-center justify-between gap-x-[24px] px-[16px]"
			style={{
				'background-color':
					'var(--md-sys-color-surface)',
			}}>
			{props.children}
			<md-elevation />
		</div>
	)
}
