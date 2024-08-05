import type { Component } from 'solid-js'

import type { ProductModel } from '@/app/use-cases/product-list'

import { useUiStateContext } from '../context'

export const ExpirationBar: Component<{
	id: ProductModel['id']
}> = props => {
	const {
		store: [state],
		uiStore: [uiState, setUiState],
	} = useUiStateContext()!

	return (
		<div class="mt-[5px] h-[5px] w-full bg-red-400"></div>
	)
}
