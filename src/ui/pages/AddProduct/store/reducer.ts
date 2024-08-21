import {
	Da,
	M,
	NETS,
	O,
	pipe,
} from '@/core/imports'

import type { App } from '@/app'

import type { Reducer } from '@/ui/core/solid-js'

import type { State } from '.'
import {
	InternalMessage,
	type Message,
} from './actions'
import { addProductTask } from './task'

export const defaultFields = () => ({
	name: O.none(),
	expirationDate: O.none(),
})

export const validateFields = (
	formFields: State['formFields'],
) => ({ isOk: O.isSome(formFields.name) })

export const resetFields = () => {
	const fields = defaultFields()
	return {
		formFields: fields,
		...validateFields(fields),
	}
}

export const reducer: (
	app: App,
) => Reducer<State, Message | InternalMessage> =
	app => (snapshot, message) =>
		pipe(
			M.value(message),
			M.when({ _tag: 'AddProduct' }, () => {
				const name = snapshot.formFields.name

				return Da.tuple(
					(state: State) => state,
					[
						{
							type: 'message',
							message:
								InternalMessage.ResetMessage(),
						} as const,
						...(O.isSome(name)
							? [
									addProductTask(app.addProduct, {
										...snapshot.formFields,
										name: name.value,
									}),
								]
							: []),
					],
				)
			}),
			M.when(
				{ _tag: 'AddProductStarted' },
				({ fiber }) =>
					Da.tuple(
						(state: State) => ({
							...state,
							runningAddProduct: O.some(fiber),
						}),
						[],
					),
			),
			M.when(
				{ _tag: 'AddProductFailed' },
				({ message }) =>
					Da.tuple(
						(state: State) => ({
							...state,
							runningAddProduct: O.none(),
						}),
						[
							{
								type: 'message',
								message:
									InternalMessage.ShowErrorMessage(
										{
											message,
										},
									),
							} as const,
						],
					),
			),
			M.when(
				{ _tag: 'AddProductSucceeded' },
				() =>
					Da.tuple(
						(state: State) => ({
							...state,
							runningAddProduct: O.none(),
							...resetFields(),
						}),
						[
							{
								type: 'message',
								message:
									InternalMessage.ShowSuccessMessage(
										{
											message:
												NETS.unsafe_fromString(
													'Product added succesfully',
												),
										},
									),
							} as const,
						],
					),
			),
			M.when(
				{ _tag: 'UpdateField' },
				({ name, value }) =>
					Da.tuple((state: State) => {
						const formFields = {
							...state.formFields,
							[name]: value,
						} satisfies State['formFields']
						return {
							...state,
							formFields,
							...validateFields(formFields),
						}
					}, []),
			),
			M.when(
				{ _tag: 'ShowSuccessMessage' },
				({ message }) =>
					Da.tuple(
						(state: State) =>
							({
								...state,
								message: O.some({
									type: 'success',
									text: message,
								} as const),
							}) as const,
						[],
					),
			),
			M.when(
				{ _tag: 'ShowErrorMessage' },
				({ message }) =>
					Da.tuple(
						(state: State) =>
							({
								...state,
								message: O.some({
									type: 'error',
									text: message,
								} as const),
							}) as const,
						[],
					),
			),
			M.when({ _tag: 'ResetMessage' }, () =>
				Da.tuple(
					(state: State) =>
						({
							...state,
							message: O.none(),
						}) as const,
					[],
				),
			),

			M.exhaustive,
		)
