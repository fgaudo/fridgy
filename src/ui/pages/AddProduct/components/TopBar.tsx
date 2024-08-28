import type { Component } from 'solid-js'

import { useFridgyNavigate } from '@/ui/router.js'

export const TopBar: Component = () => {
	const navigate = useFridgyNavigate()

	return (
		<mdui-top-app-bar prop:scrollBehavior="elevate">
			<mdui-button-icon
				prop:icon="arrow_back"
				class="pl-[4px]"
				onClick={() => {
					navigate(-1)
				}}></mdui-button-icon>
			<mdui-top-app-bar-title class="font-titleLarge">
				Add a new product
			</mdui-top-app-bar-title>
		</mdui-top-app-bar>
	)
}
