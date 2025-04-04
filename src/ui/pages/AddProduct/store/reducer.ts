import type { Reducer } from '$lib/ui/core/solid.ts';
import 'solid-js/store';
import { produce } from 'solid-js/store';

import {
	Da,
	HS,
	M,
	NETS,
	O,
	pipe,
} from '$lib/core/imports.ts';

import type { App } from '$lib/app/index.ts';

import {
	InternalMessage,
	type Message,
} from './actions.ts';
import type { State } from './index.ts';
import * as Ta from './tasks.ts';

export const reducer: (
	app: App,
) => Reducer<State, Message | InternalMessage> =
	app => message =>
		pipe(
			M.value(message),
			M.when({ _tag: 'AddProduct' }, () =>
				Da.tuple(
					produce((state: State) => {
						state.message = O.none();
					}),

					HS.make(Ta.addProduct(app)),
				),
			),
			M.when(
				{ _tag: 'AddProductStarted' },
				({ fiber }) =>
					Da.tuple(
						produce((state: State) => {
							state.runningAddProduct =
								O.some(fiber);
						}),
						HS.empty(),
					),
			),
			M.when(
				{ _tag: 'AddProductFailed' },
				({ message }) =>
					Da.tuple(
						produce((state: State) => {
							state.runningAddProduct = O.none();
							state.message = O.some({
								type: 'error',
								text: message,
							} as const);
						}),
						HS.empty(),
					),
			),
			M.when(
				{ _tag: 'AddProductSucceeded' },
				() =>
					Da.tuple(
						produce((state: State) => {
							state.runningAddProduct = O.none();
							state.message = O.some({
								type: 'success',
								text: NETS.unsafe_fromString(
									'Product added succesfully',
								),
							} as const);
							state.formFields = {
								name: '',
								expirationDate: O.none(),
							};

							state.isOk = NETS.fromString(
								state.formFields.name,
							).pipe(O.isSome);
						}),
						HS.empty(),
					),
			),
			M.when(
				{
					_tag: 'UpdateName',
				},
				field =>
					Da.tuple(
						produce((state: State) => {
							state.formFields.name = field.value;

							state.isOk = NETS.fromString(
								state.formFields.name,
							).pipe(O.isSome);
						}),
						HS.empty(),
					),
			),
			M.when(
				{
					_tag: 'UpdateExpirationDate',
				},
				field =>
					Da.tuple(
						produce((state: State) => {
							state.formFields.expirationDate =
								field.value;

							state.isOk = NETS.fromString(
								state.formFields.name,
							).pipe(O.isSome);
						}),
						HS.empty(),
					),
			),

			M.exhaustive,
		);
