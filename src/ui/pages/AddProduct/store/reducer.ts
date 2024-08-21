import { Da, M, O, pipe } from '@/core/imports'

import type { App } from '@/app'

import type { Reducer } from '@/ui/core/solid-js'

import type { State } from '.'
import {
	InternalMessage,
	type Message,
} from './actions'
import {
	addProductTask,
	removeToast,
} from './task'

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
					O.isSome(name)
						? [
								addProductTask(app.addProduct, {
									...snapshot.formFields,
									name: name.value,
								}),
							]
						: [],
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
									InternalMessage.ShowToast({
										message,
									}),
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
									InternalMessage.ShowToast({
										message:
											'Product added succesfully',
									}),
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
				{ _tag: 'ShowToast' },
				({ message }) =>
					Da.tuple(
						(state: State) => ({
							...state,
							toastMessage: message,
							runningRemoveToast: O.none(),
						}),
						[
							removeToast(
								snapshot.runningRemoveToast,
							),
						],
					),
			),
			M.when({ _tag: 'RemoveToast' }, () =>
				Da.tuple(
					(state: State) => ({
						...state,
						toastMessage: '',
						runningRemoveToast: O.none(),
					}),
					[],
				),
			),
			M.when(
				{ _tag: 'RemoveToastStarted' },
				({ fiber }) =>
					Da.tuple(
						(state: State) => ({
							...state,
							runningRemoveToast: O.some(fiber),
						}),
						[],
					),
			),
			M.exhaustive,
		)
