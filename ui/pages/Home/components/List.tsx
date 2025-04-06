import { SafePortal } from '$lib/ui/widgets/SafePortal.tsx';
import { Spinner } from '$lib/ui/widgets/Spinner.tsx';
import { destructure } from '@solid-primitives/destructure';
import { Key } from '@solid-primitives/keyed';
import {
	type Component,
	For,
	createMemo,
	on,
} from 'solid-js';

import { Eff } from '$lib/core/imports.ts';

import { useUiStateContext } from '../context.tsx';
import { Message } from '../store/messages.ts';
import { Item } from './Item.tsx';

export const List: Component = () => {
	const {
		store: [_state, dispatch],
	} = useUiStateContext()!;

	const state = destructure(_state, {
		lazy: true,
		memo: true,
	});

	const totalItems = createMemo<number>(prev => {
		return state.total() > 0
			? state.total()
			: (prev ?? 0);
	});

	return (
		<>
			<SafePortal>
				<div
					class="fixed top-0 right-0 bottom-0 left-0 flex items-center justify-center transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							!state.isLoading() &&
							!state.isRunningRefresh(),
					}}
				>
					<Spinner />
				</div>
			</SafePortal>
			<div
				class="duration-fade transition-all"
				classList={{
					'opacity-0 pointer-events-none':
						state.isLoading(),
				}}
			>
				<p
					class="fixed top-[64px] z-999 w-full px-[14px] pt-[10px] pb-[8px] text-xs transition-all"
					classList={{
						'opacity-0 pointer-events-none':
							state.total() <= 0 ||
							state.isLoading() ||
							state.receivedError(),
					}}
				>
					{totalItems()} items
				</p>
				<div
					class="relative mt-[34px] flex w-full items-center"
					classList={{
						'opacity-0 pointer-events-none':
							state.receivedError(),
					}}
					style={{
						height:
							state.total() > 0 &&
							!state.receivedError()
								? `${((state.total() - 1) * 65 + 185).toString(10)}px`
								: 'auto',
					}}
				>
					<Key each={state.products()} by={'id'}>
						{(model, i) => {
							on(i, i => {
								Eff.runSync(
									Eff.logDebug(
										`Rerendered #${i.toString()}`,
									),
								);
							});
							return (
								<Item
									model={destructure(model, {
										lazy: true,
										memo: true,
									})}
									index={i}
								/>
							);
						}}
					</Key>
				</div>
				<div
					class="absolute top-0 right-0 bottom-0 left-0 flex h-full w-full items-center justify-center text-center text-lg"
					classList={{
						'opacity-0 pointer-events-none':
							!state.receivedError,
					}}
				>
					<p>
						Could not load the list! :(
						<br />
						<span
							class="text-primary underline"
							onClick={() => {
								dispatch(Message.RefreshList());
							}}
						>
							Try again
						</span>
					</p>
				</div>
			</div>
		</>
	);
};
