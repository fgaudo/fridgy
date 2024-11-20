import {
	type Component,
	For,
	createEffect,
	createMemo,
	on,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import {
	Eff,
	H,
	NNInt,
	O,
} from '@/core/imports.ts'

import { useUiStateContext } from '../context.tsx'
import { Message } from '../store/actions.ts'
import { Item } from './Item.tsx'

export const List: Component = () => {
	const {
		store: [state, dispatch],
	} = useUiStateContext()!

	const totalItems =
		createMemo<NNInt.NonNegativeInteger>(prev => {
			return state.total > 0
				? state.total
				: (prev ?? NNInt.unsafe_fromNumber(0))
		})

	return (
		<>
			<Portal>
				<div
					class="fixed bottom-0 left-0 right-0 top-0 flex items-center justify-center transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							!state.isLoading &&
							O.isNone(state.runningRefreshing),
					}}>
					<mdui-circular-progress></mdui-circular-progress>
				</div>
			</Portal>
			<div
				class="transition-all duration-fade"
				classList={{
					'opacity-0 pointer-events-none':
						state.isLoading,
				}}>
				<p
					class="fixed top-[64px] z-[999] w-full bg-background px-[14px] pb-[8px] pt-[10px] text-xs transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							state.total <= 0 ||
							state.isLoading ||
							state.receivedError,
					}}>
					{totalItems()} items
				</p>
				<mdui-list
					class="relative mt-[34px]"
					classList={{
						'opacity-0 pointer-events-none':
							state.receivedError,
					}}
					style={{
						height:
							state.total > 0 &&
							!state.receivedError
								? `${((state.total - 1) * 60 + 185).toString(10)}px`
								: 'auto',
					}}>
					<For each={state.products}>
						{(model, i) => {
							createEffect(
								on(i, i => {
									H.runForkWithLogs(
										H.logDebug(
											`Rendered item on position ${i.toString(10)}`,
										).pipe(
											Eff.annotateLogs({ model }),
										),
									)
								}),
							)
							return (
								<Item
									model={model}
									index={i}
								/>
							)
						}}
					</For>
				</mdui-list>
				<div
					class="absolute bottom-0 left-0 right-0 top-0 flex h-full w-full items-center justify-center text-center text-lg"
					classList={{
						'opacity-0 pointer-events-none':
							!state.receivedError,
					}}>
					<p>
						Could not load the list! :(
						<br />
						<span
							class="text-primary underline"
							onClick={() => {
								dispatch(Message.RefreshList())
							}}>
							Try again
						</span>
					</p>
				</div>
			</div>
		</>
	)
}
