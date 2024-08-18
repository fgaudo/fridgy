import { endOfDay } from 'date-fns'
import {
	type Component,
	createSignal,
} from 'solid-js'

import { O } from '@/core/imports'
import { isInteger } from '@/core/utils'

import { onResume } from '@/ui/core/capacitor'

import { InvisibleWall } from './components/InvisibleWall'
import { Snackbar } from './components/Snackbar'
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
			Message.UpdateField({
				name: 'expirationDate',
				value: !isInteger(number)
					? O.none()
					: O.some(endOfDay(number).getTime()),
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
						<mdui-text-field
							prop:variant="outlined"
							prop:value={state.formFields.name}
							prop:type="text"
							prop:label="Product name*"
							onInput={e => {
								dispatch(
									Message.UpdateField({
										name: 'name',
										value: e.currentTarget.value,
									}),
								)
							}}></mdui-text-field>
						<div class="flex flex-col rounded-xl align-middle text-onSurface">
							<label
								for="expdate"
								class="relative left-[10px] top-[12px] inline-block flex-grow-0 self-start bg-surface p-[4px] text-[12px] text-primary">
								Expiration date
							</label>
							<div class="flex items-center gap-3">
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
											e.currentTarget
												.valueAsNumber,
										)
									}}
									id="expdate"
									class="flex-1 rounded-[4px] border-[1px] border-[rgb(82,68,61)] bg-surface p-4 focus:outline focus:outline-2 focus:outline-primary"
									min={currentDate()}
								/>
							</div>
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
			<Snackbar />
		</AddProductContext.Provider>
	)
}

export default AddProduct
