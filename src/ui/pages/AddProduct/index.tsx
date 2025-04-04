import { onResume } from '$lib/ui/core/capacitor.ts';
import { useFridgyNavigate } from '$lib/ui/router.tsx';
import { SafePortal } from '$lib/ui/widgets/SafePortal.tsx';
import { Snackbar } from '$lib/ui/widgets/SnackBar.tsx';
import { endOfDay } from 'date-fns';
import {
	type Component,
	createSignal,
} from 'solid-js';

import { Int, O } from '$lib/core/imports.ts';

import { InvisibleWall } from './components/InvisibleWall.tsx';
import { AddProductContext } from './context.ts';
import { Message } from './store/actions.ts';
import type { State } from './store/index.ts';
import { createStore as createUiStore } from './ui-store.ts';

const AddProduct: (
	createStore: () => [
		State,
		(message: Message) => void,
	],
) => Component = createStore => () => {
	const [state, dispatch] = createStore();
	const [uiState, setUiState] = createUiStore();
	const navigate = useFridgyNavigate();

	const updateExpDate = (number: number) => {
		dispatch(
			Message.UpdateExpirationDate({
				value: Int.fromNumber(
					endOfDay(number).getTime(),
				),
			}),
		);
	};

	const getCurrentDate = () =>
		new Date().toISOString().split('T')[0];

	const [currentDate, setCurrentDate] =
		createSignal<string>(getCurrentDate());

	onResume(() => {
		setCurrentDate(getCurrentDate());
	});

	return (
		<AddProductContext.Provider
			value={{
				store: [state, dispatch],
				uiStore: [uiState, setUiState],
			}}
		>
			<InvisibleWall />
			<div
				class="bg-background flex h-screen flex-col justify-between"
				style={{
					animation: 'opacityIn 0.5s ease-in-out',
				}}
			>
				<div class="bg-secondary shadow-secondary/50 flex h-16 w-full items-center shadow-md">
					<button
						class="material-symbols flex h-14 w-14 items-center justify-center text-2xl"
						onClick={() => {
							navigate(-1);
						}}
					>
						arrow_back
					</button>
					<div class="font-stylish pl-2 text-2xl">
						Add a product
					</div>
				</div>
				<figure class="font-stylish mx-auto max-w-screen-md p-8 opacity-50">
					<div class="mb-3 flex items-center justify-center">
						<svg
							class="mx-aut h-6 w-6"
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							fill="currentColor"
							viewBox="0 0 18 14"
						>
							<path d="M6 0H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4v1a3 3 0 0 1-3 3H2a1 1 0 0 0 0 2h1a5.006 5.006 0 0 0 5-5V2a2 2 0 0 0-2-2Zm10 0h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4v1a3 3 0 0 1-3 3h-1a1 1 0 0 0 0 2h1a5.006 5.006 0 0 0 5-5V2a2 2 0 0 0-2-2Z"></path>
						</svg>
						<p class="ml-5">
							Italian Saying of the Day <br />{' '}
							(Roman dialect)
						</p>
					</div>
					<blockquote>
						<div class="flex items-center justify-center">
							<p class="text-md mb-2 italic select-text">
								Chi c'ha er pepe, lo mette alle
								rape; <br /> chi nun ce l'ha, le
								magna sciape.{' '}
							</p>
						</div>
						<p class="text-right text-sm"></p>
					</blockquote>
				</figure>

				<div class="flex w-full justify-center pb-32">
					<div class="flex w-full max-w-lg flex-col place-content-center gap-[28px] pr-[16px] pl-[16px]">
						<div class="text-on-background flex flex-col rounded-xl align-middle">
							<label
								for="name"
								class="bg-background text-primary relative top-[12px] left-[10px] inline-block grow-0 self-start p-[4px] text-[12px]"
							>
								Product name
							</label>
							<input
								type="text"
								placeholder="For example: Milk"
								value={state.formFields.name}
								onInput={e => {
									dispatch(
										Message.UpdateName({
											value:
												e.currentTarget.value,
										}),
									);
								}}
								id="name"
								class="bg-background ring-outline focus:ring-primary shadow-primary/70 ring-secondary w-full rounded-[4px] border-0 p-4 shadow-md ring-1 transition-all focus:border-0"
								min={currentDate()}
							/>
						</div>

						<div class="text-on-background flex flex-col rounded-xl align-middle">
							<label
								for="expdate"
								class="bg-background text-primary relative top-[12px] left-[10px] inline-block grow-0 self-start p-[4px] text-[12px]"
							>
								Expiration date
							</label>
							<input
								type="date"
								value={
									O.isSome(
										state.formFields
											.expirationDate,
									)
										? new Date(
												state.formFields.expirationDate.value,
											)
												.toISOString()
												.substring(0, 10)
										: ''
								}
								onInput={e => {
									updateExpDate(
										e.currentTarget.valueAsNumber,
									);
								}}
								id="expdate"
								class="bg-background ring-outline focus:ring-primary shadow-primary/70 ring-secondary w-full rounded-[4px] border-0 p-4 shadow-md ring-1 transition-all focus:border-0"
								min={currentDate()}
							/>
						</div>
						<div class="flex w-full justify-end pt-4">
							<button
								disabled={
									!state.isOk ||
									O.isSome(
										state.runningAddProduct,
									)
								}
								class="bg-primary text-background shadow-primary/70 h-12 w-48 rounded-2xl shadow-md disabled:opacity-30"
								onClick={() => {
									dispatch(Message.AddProduct());
								}}
							>
								Add product
							</button>
						</div>
					</div>
				</div>
			</div>
			<SafePortal>
				<Snackbar
					class="fixed right-1/2 bottom-0 flex w-full translate-x-1/2 justify-center"
					message={state.message}
				/>
			</SafePortal>
		</AddProductContext.Provider>
	);
};

export default AddProduct;
