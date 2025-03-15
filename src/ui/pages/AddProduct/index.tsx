import { endOfDay } from 'date-fns'
import {
	type Component,
	createSignal,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import { Int, O } from '@/core/imports.ts'

import { onResume } from '@/ui/core/capacitor.ts'
import { Snackbar } from '@/ui/widgets/SnackBar.tsx'

import { InvisibleWall } from './components/InvisibleWall.tsx'
import { TopBar } from './components/TopBar.tsx'
import { AddProductContext } from './context.ts'
import { Message } from './store/actions.ts'
import type { State } from './store/index.ts'
import { createStore as createUiStore } from './ui-store.ts'

const AddProduct: (
	createStore: () => [
		State,
		(message: Message) => void,
	],
) => Component = createStore => () => {
	const [state, dispatch] = createStore()
	const [uiState, setUiState] = createUiStore()

	const updateExpDate = (number: number) => {
		dispatch(
			Message.UpdateExpirationDate({
				value: Int.fromNumber(
					endOfDay(number).getTime(),
				),
			}),
		)
	}

	const getCurrentDate = () =>
		new Date().toISOString().split('T')[0]

	const [currentDate, setCurrentDate] =
		createSignal<string>(getCurrentDate())

	onResume(() => {
		setCurrentDate(getCurrentDate())
	})

	return (
		<AddProductContext.Provider
			value={{
				store: [state, dispatch],
				uiStore: [uiState, setUiState],
			}}>
			<InvisibleWall />
			<div
				style={{
					animation: 'opacityIn 0.5s ease-in-out',
				}}>
				<TopBar />

				<div class="absolute top-0 left-0 flex h-screen w-full justify-center">
					<div class="flex w-full max-w-lg flex-col place-content-center gap-[28px] pr-[16px] pl-[16px]">
						<div class="text-on-surface flex flex-col rounded-xl align-middle">
							<label
								for="name"
								class="bg-surface text-primary relative top-[12px] left-[10px] inline-block grow-0 self-start p-[4px] text-[12px]">
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
									)
								}}
								id="name"
								class="bg-surface ring-outline focus:ring-primary w-full rounded-[4px] border-0 p-4 ring-1 transition-all focus:border-0 focus:ring-2"
								min={currentDate()}
							/>
						</div>

						<div class="text-on-surface flex flex-col rounded-xl align-middle">
							<label
								for="expdate"
								class="bg-surface text-primary relative top-[12px] left-[10px] inline-block grow-0 self-start p-[4px] text-[12px]">
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
									)
								}}
								id="expdate"
								class="bg-surface ring-outline focus:ring-primary w-full rounded-[4px] border-0 p-4 ring-1 transition-all focus:border-0 focus:ring-2"
								min={currentDate()}
							/>
						</div>
						<mdui-button
							prop:variant="filled"
							prop:disabled={
								!state.isOk ||
								O.isSome(state.runningAddProduct)
							}
							class="mt-[20px]"
							onClick={() => {
								dispatch(Message.AddProduct())
							}}>
							Add product
						</mdui-button>
					</div>
				</div>
			</div>
			<Portal>
				<Snackbar
					class="fixed right-1/2 bottom-0 flex w-full translate-x-1/2 justify-center"
					message={state.message}
				/>
			</Portal>
		</AddProductContext.Provider>
	)
}

export default AddProduct
