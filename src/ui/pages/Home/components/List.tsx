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
		<>
			<Portal>
				<div
					class="fixed bottom-0 left-0 right-0 top-0 flex items-center justify-center"
					classList={{
						'opacity-0 pointer-events-none':
							!state.isLoading,
					}}>
					<md-circular-progress
						prop:indeterminate={true}
					/>
				</div>
			</Portal>
			<div
				class="pb-[128px] pt-[100px] transition-all duration-fade"
				classList={{
					'opacity-0 pointer-events-none':
						state.total <= 0 && state.isLoading,
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
									Eff.logDebug(
										`Rendered item on position ${i().toString(10)}`,
									).pipe(
										Eff.annotateLogs({ model }),
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
		</>
	)
}
