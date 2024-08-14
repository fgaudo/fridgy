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
	name: '',
	expirationDate: O.none(),
})

export const validateFields = (
	formFields: State['formFields'],
) => ({ isOk: formFields.name.length > 0 })

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
	app => (state, message) =>
		pipe(
			M.value(message),
			M.when({ _tag: 'RefreshDate' }, () =>
				Da.tuple(state, [
					{
						type: 'message',
						message:
							InternalMessage.RefreshDateSucceeded(
								{
									date: new Date()
										.toISOString()
										.split('T')[0],
								},
							),
					},
				] as const),
			),
			M.when(
				{ _tag: 'RefreshDateSucceeded' },
				({ date }) =>
					Da.tuple(
						{
							...state,
							currentDate: O.some(date),
						} as const,
						[] as const,
					),
			),
			M.when({ _tag: 'AddProduct' }, () =>
				Da.tuple(state, [
					addProductTask(
						app.addProduct,
						state.formFields,
					),
				]),
			),
			M.when({ _tag: 'AddProductFailed' }, () =>
				Da.tuple(state, []),
			),
			M.when(
				{ _tag: 'AddProductSucceeded' },
				() =>
					Da.tuple(
						{ ...state, ...resetFields() },
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
				({ name, value }) => {
					const formFields = {
						...state.formFields,
						[name]: value,
					} satisfies State['formFields']

					return Da.tuple(
						{
							...state,
							formFields,
							...validateFields(formFields),
						},
						[],
					)
				},
			),
			M.when(
				{ _tag: 'ShowToast' },
				({ message }) =>
					Da.tuple(
						{
							...state,
							toastMessage: message,
							runningRemoveToast: O.none(),
						},
						[
							removeToast(
								state.runningRemoveToast,
							),
						],
					),
			),
			M.when({ _tag: 'RemoveToast' }, () =>
				Da.tuple(
					{
						...state,
						toastMessage: '',
						runningRemoveToast: O.none(),
					},
					[],
				),
			),
			M.when(
				{ _tag: 'RemoveToastStarted' },
				({ id }) =>
					Da.tuple(
						{
							...state,
							runningRemoveToast: O.some(id),
						},
						[],
					),
			),
			M.exhaustive,
		)
