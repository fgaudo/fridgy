import {
	type Component,
	For,
	createMemo,
	createRenderEffect,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import { Eff } from '@/core/imports'

import { useUiStateContext } from '../context'
import { Item } from './Item'

export const List: Component = () => {
	const {
		store: [state],
	} = useUiStateContext()!

	const totalItems = createMemo<number>(prev => {
		return state.total > 0
			? state.total
			: (prev ?? 0)
	})

	return (
		<div
			class="pb-[128px] pt-[100px] transition-all duration-fade"
			classList={{
				'opacity-0 pointer-events-none':
					state.total <= 0,
			}}>
			<Portal>
				<p
					class="fixed top-[64px] w-full bg-background px-[14px] pb-[8px] pt-[10px] text-xs transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							state.total <= 0,
					}}>
					{totalItems()} items
				</p>
			</Portal>
			<md-list
				class="relative"
				style={{
					height:
						state.total > 0
							? `${((state.total - 1) * 72 + 80).toString(10)}px`
							: 'auto',
				}}>
				<For each={state.products}>
					{(model, i) => {
						createRenderEffect(() => {
							Eff.runFork(
								Eff.log(
									`Rendered item on position ${i().toString(10)}`,
								),
							)
						})
						return (
							<Item
								model={model}
								index={i}
							/>
						)
					}}
				</For>
			</md-list>
		</div>
	)
}
