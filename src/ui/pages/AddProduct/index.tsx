import { endOfDay } from 'date-fns'
import {
	type Component,
	createSignal,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import { Int, O } from '@/core/imports'

import { onResume } from '@/ui/core/capacitor'
import { Snackbar } from '@/ui/widgets/SnackBar'

import { InvisibleWall } from './components/InvisibleWall'
import { TopBar } from './components/TopBar'
import { AddProductContext } from './context'
import { type State } from './store'
import { Message } from './store/actions'
import { createStore as createUiStore } from './ui-store'

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

				<div class="absolute left-0 top-0 flex h-screen w-full justify-center">
					<div class="flex w-full max-w-lg flex-col place-content-center gap-[28px] pl-[16px] pr-[16px]">
						<div class="flex flex-col rounded-xl align-middle text-onSurface">
							<label
								for="name"
								class="relative left-[10px] top-[12px] inline-block flex-grow-0 self-start bg-surface p-[4px] text-[12px] text-primary">
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
								class="w-full rounded-[4px] border-0 bg-surface p-4 ring-1 ring-outline transition-all focus:border-0 focus:ring-2 focus:ring-primary"
								min={currentDate()}
							/>
						</div>

						<div class="flex flex-col rounded-xl align-middle text-onSurface">
							<label
								for="expdate"
								class="relative left-[10px] top-[12px] inline-block flex-grow-0 self-start bg-surface p-[4px] text-[12px] text-primary">
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
												Int.toNumber(
													state.formFields
														.expirationDate.value,
												),
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
								class="w-full rounded-[4px] border-0 bg-surface p-4 ring-1 ring-outline transition-all focus:border-0 focus:ring-2 focus:ring-primary"
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
				<div class="fixed bottom-0 right-1/2 flex w-full translate-x-1/2 justify-center">
					<Snackbar message={state.message} />
				</div>
			</Portal>
		</AddProductContext.Provider>
	)
}

export default AddProduct
