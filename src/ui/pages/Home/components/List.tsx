import {
	type Component,
	For,
	createMemo,
	createRenderEffect,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import { Eff, O } from '@/core/imports'

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
					class="pointer-events-none fixed bottom-0 left-0 right-0 top-0 z-[999] flex items-center justify-center transition-all"
					classList={{
						'opacity-0': !state.isLoading,
					}}>
					<md-circular-progress
						prop:indeterminate={true}
					/>
				</div>
			</Portal>
			<Portal>
				<div
					class="fixed bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-background transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							!state.isLoading &&
							O.isNone(state.runningRefreshing),
						'opacity-[0.6]':
							state.isLoading ||
							O.isSome(state.runningRefreshing),
					}}
				/>
			</Portal>
			<div
				class="pb-[128px] pt-[100px] transition-all duration-fade"
				classList={{
					'opacity-0 pointer-events-none':
						state.total <= 0 || state.isLoading,
				}}>
				<Portal>
					<p
						class="fixed top-[64px] w-full bg-background px-[14px] pb-[8px] pt-[10px] text-xs transition-all"
						classList={{
							'opacity-0 pointer-events-none':
								state.total <= 0 ||
								state.isLoading ||
								O.isSome(state.runningRefreshing),
						}}>
						{totalItems()} items
					</p>
					<md-circular-progress
						prop:indeterminate={true}
						class="fixed top-[64px] mx-[14px] mt-[10px] h-[32px] w-[32px] bg-background pb-[8px] transition-all"
						classList={{
							'opacity-0 pointer-events-none':
								O.isNone(
									state.runningRefreshing,
								) || state.isLoading,
						}}
					/>
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
