import 'solid-js/store'

import {
	Da,
	HS,
	M,
	NETS,
	O,
	pipe,
} from '@/core/imports.js'

import type { App } from '@/app/index.js'

import type {
	Reducer,
	Task,
} from '@/ui/core/solid-js.js'

import {
	InternalMessage,
	type Message,
} from './actions.js'
import type { State } from './index.js'
import * as Mu from './mutations.js'
import * as Ta from './task.js'

export const reducer: (
	app: App,
) => Reducer<State, Message | InternalMessage> =
	app => (snapshot, message) =>
		pipe(
			M.value(message),
			M.when({ _tag: 'AddProduct' }, () => {
				let commands =
					HS.empty<
						Task<InternalMessage | Message>
					>()

				const name = NETS.fromString(
					snapshot.formFields.name,
				)

				if (O.isSome(name)) {
					commands = pipe(
						commands,
						HS.add(
							Ta.addProduct(app.addProduct, {
								...snapshot.formFields,
								name: name.value,
							}),
						),
					)
				}

				return Da.tuple(
					HS.make(Mu.resetMessage),
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
						HS.empty(),
					),
			),
			M.when(
				{ _tag: 'AddProductFailed' },
				({ message }) =>
					Da.tuple(
						HS.make(
							Mu.addProductFinished,
							Mu.showErrorMessage(message),
						),
						HS.empty(),
					),
			),
			M.when(
				{ _tag: 'AddProductSucceeded' },
				() =>
					Da.tuple(
						HS.make(
							Mu.addProductFinished,
							Mu.resetAndValidateFields,
							Mu.showSuccessMessage(
								NETS.unsafe_fromString(
									'Product added succesfully',
								),
							),
						),
						HS.empty(),
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
							Mu.validateFields({
								...snapshot.formFields,
								name: field.value,
							}),
						),
						HS.empty(),
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
							Mu.validateFields({
								...snapshot.formFields,
								expirationDate: field.value,
							}),
						),
						HS.empty(),
					),
			),

			M.exhaustive,
		)
