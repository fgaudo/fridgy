import { endOfDay } from 'date-fns'
import { option as OPT } from 'fp-ts'
import {
	type Component,
	Match,
	Switch,
} from 'solid-js'

import { Snackbar } from './components/Snackbar'
import { TopBar } from './components/TopBar'
import { AddProductContext } from './context'
import { type Command, type State } from './store'
import { createStore as createUiStore } from './ui-store'

const AddProduct: (
	createStore: () => [
		State,
		(command: Command) => void,
	],
) => Component = createStore => () => {
	const [state, dispatch] = createStore()
	const [uiState, setUiState] = createUiStore()

	return (
		<AddProductContext.Provider
			value={{
				store: [state, dispatch],
				uiStore: [uiState, setUiState],
			}}>
			<div
				style={{
					animation: 'opacityIn 0.5s ease-in-out',
				}}>
				<TopBar />
				<Switch
					fallback={
						<md-circular-progress
							prop:indeterminate={true}
							class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
						/>
					}>
					<Match
						when={
							state.currentDate.status ===
								'ready' && state.currentDate.date
						}>
						{date => (
							<div class="mt-[-50px] flex h-screen flex-col place-content-center gap-[28px] pb-[16px] pl-[16px] pr-[16px] pt-[70px]">
								<md-outlined-text-field
									prop:value={
										state.formFields.name
									}
									prop:type="text"
									prop:label="Product name*"
									onInput={e => {
										dispatch({
											type: 'updateField',
											field: {
												name: 'name',
												value:
													e.currentTarget.value,
											},
										})
									}}
								/>
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
														.expDate,
												)
													? new Date(
															state.formFields.expDate.value,
														)
															.toISOString()
															.substring(0, 10)
													: ''
											}
											onInput={e => {
												dispatch({
													type: 'updateField',
													field: {
														name: 'expDate',
														value: Number.isNaN(
															e.currentTarget
																.valueAsNumber,
														)
															? O.none
															: O.some(
																	endOfDay(
																		e
																			.currentTarget
																			.valueAsNumber,
																	).getTime(),
																),
													},
												})
											}}
											id="expdate"
											class="flex-1 rounded-[4px] border-[1px] border-[rgb(82,68,61)] bg-surface p-4 focus:outline focus:outline-2 focus:outline-primary"
											min={date()}
										/>
										<md-filled-icon-button class="hidden h-[56px] w-[56px]">
											<md-icon>
												document_scanner
											</md-icon>
										</md-filled-icon-button>
									</div>
								</div>

								<md-filled-button
									prop:disabled={!state.isOk}
									class="mt-[20px]"
									onClick={() => {
										dispatch({
											type: 'addProduct',
										})
									}}>
									Add product
								</md-filled-button>
							</div>
						)}
					</Match>
				</Switch>
			</div>
			<Snackbar />
		</AddProductContext.Provider>
	)
}

export default AddProduct
