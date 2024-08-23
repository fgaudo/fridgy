import 'solid-js/store'

import {
	Da,
	HS,
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
import {
	addProductFinishedMutation,
	resetFields,
	resetMessageMutation,
	showErrorMessageMutation,
	showSuccessMessageMutation,
	validateFieldsMutation,
} from './mutations'
import { addProductTask } from './task'

export const reducer: (
	app: App,
) => Reducer<State, Message | InternalMessage> =
	app => (snapshot, message) =>
		pipe(
			M.value(message),
			M.when({ _tag: 'AddProduct' }, () => {
				const commands = Array.from(
					(function* () {
						const name = NETS.fromString(
							snapshot.formFields.name,
						)
						if (O.isSome(name)) {
							yield addProductTask(
								app.addProduct,
								{
									...snapshot.formFields,
									name: name.value,
								},
							)
						}
					})(),
				)

				return Da.tuple(
					HS.make(resetMessageMutation),
					commands,
				)
			}),
			M.when(
				{ _tag: 'AddProductStarted' },
				({ fiber }) =>
					Da.tuple(
						HS.make((state: State) => {
							state.runningAddProduct =
								O.some(fiber)
						}),
						[],
					),
			),
			M.when(
				{ _tag: 'AddProductFailed' },
				({ message }) =>
					Da.tuple(
						HS.make(
							addProductFinishedMutation,
							showErrorMessageMutation(message),
						),
						[],
					),
			),
			M.when(
				{ _tag: 'AddProductSucceeded' },
				() =>
					Da.tuple(
						HS.make(
							addProductFinishedMutation,
							resetFields,
							showSuccessMessageMutation(
								NETS.unsafe_fromString(
									'Product added succesfully',
								),
							),
						),
						[],
					),
			),
			M.when(
				{
					_tag: 'UpdateName',
				},
				field =>
					Da.tuple(
						HS.make(
							(state: State) => {
								state.formFields.name =
									field.value
							},
							validateFieldsMutation({
								...snapshot.formFields,
								name: field.value,
							}),
						),
						[],
					),
			),
			M.when(
				{
					_tag: 'UpdateExpirationDate',
				},
				field =>
					Da.tuple(
						HS.make(
							(state: State) => {
								state.formFields.expirationDate =
									field.value
							},
							validateFieldsMutation({
								...snapshot.formFields,
								expirationDate: field.value,
							}),
						),
						[],
					),
			),

			M.exhaustive,
		)
