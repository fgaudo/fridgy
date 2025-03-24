import {
	type Component,
	For,
	createEffect,
	createMemo,
	on,
} from 'solid-js'

import {
	Eff,
	H,
	NNInt,
	O,
} from '@/core/imports.ts'

import { SafePortal } from '@/ui/widgets/SafePortal.tsx'

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
			<SafePortal>
				<div
					class="fixed top-0 right-0 bottom-0 left-0 flex items-center justify-center transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							!state.isLoading &&
							O.isNone(state.runningRefreshing),
					}}>
					<div role="status">
						<svg
							aria-hidden="true"
							class="fill-accent text-background h-8 w-8 animate-spin"
							viewBox="0 0 100 101"
							fill="none"
							xmlns="http://www.w3.org/2000/svg">
							<path
								d="M93.9676 39.0409C96.393 38.4038
								97.8624 35.9116 97.0079
								33.5539C95.2932 28.8227 92.871
								24.3692 89.8167 20.348C85.8452
								15.1192 80.8826 10.7238 75.2124
								7.41289C69.5422 4.10194 63.2754
								1.94025 56.7698 1.05124C51.7666
								0.367541 46.6976 0.446843 41.7345
								1.27873C39.2613 1.69328 37.813
								4.19778 38.4501 6.62326C39.0873
								9.04874 41.5694 10.4717 44.0505
								10.1071C47.8511 9.54855 51.7191
								9.52689 55.5402 10.0491C60.8642
								10.7766 65.9928 12.5457 70.6331
								15.2552C75.2735 17.9648 79.3347
								21.5619 82.5849 25.841C84.9175
								28.9121 86.7997 32.2913 88.1811
								35.8758C89.083 38.2158 91.5421
								39.6781 93.9676 39.0409Z"
								fill="currentFill"></path>
						</svg>
						<span class="sr-only">
							Loading...
						</span>
					</div>
				</div>
			</SafePortal>
			<div
				class="duration-fade transition-all"
				classList={{
					'opacity-0 pointer-events-none':
						state.isLoading,
				}}>
				<p
					class="fixed top-[64px] z-999 w-full px-[14px] pt-[10px] pb-[8px] text-xs transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							state.total <= 0 ||
							state.isLoading ||
							state.receivedError,
					}}>
					{totalItems()} items
				</p>
				<div
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
				</div>
				<div
					class="absolute top-0 right-0 bottom-0 left-0 flex h-full w-full items-center justify-center text-center text-lg"
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
