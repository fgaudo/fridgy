import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import {
	function as F,
	reader as R,
	taskOption as TO,
} from 'fp-ts'
import * as Rx from 'rxjs'

import type { Base64 } from '@/core/base64'
import type { ViewModel } from '@/core/view-model'

import type { AddProduct as AddProductCommand } from '@/app/contract/write/add-product'

const pipe = F.pipe
const flow = F.flow

interface ProductData {
	id: Base64
	name: string
	expDate: {
		timestamp: number
		isBestBefore: boolean
	}
}

export type Command =
	| {
			type: 'add'
			product: ProductData
	  }
	| {
			type: 'fieldsChange'
			fields: ProductData
	  }

interface FieldsModel {
	name:
		| { status: 'ok' }
		| { status: 'init' }
		| {
				status: 'error'
				message: 'Cannot be empty'
		  }
	expDate:
		| { status: 'init' }
		| { status: 'ok' }
		| {
				status: 'error'
				message: 'Invalid date'
		  }
}

export const mandatoryFields = { name: true }

export const canBeSent = (fields: FieldsModel) =>
	fields.name.status === 'ok' &&
	fields.expDate.status !== 'error'

export type Model =
	| {
			type: 'ready'
			model: FieldsModel
	  }
	| { type: 'adding' }

interface Deps {
	addProduct: AddProductCommand
}

const validateInput = (
	fields: ProductData,
	timestamp: number,
): FieldsModel => ({
	expDate:
		timestamp > fields.expDate.timestamp
			? {
					status: 'error',
					message: 'Invalid date',
				}
			: { status: 'ok' },
	name:
		fields.name === ''
			? {
					status: 'error',
					message: 'Cannot be empty',
				}
			: { status: 'ok' },
})

const initFields: FieldsModel = {
	name: { status: 'init' },
	expDate: { status: 'init' },
}

export const viewModel: ViewModel<
	Deps,
	Command,
	Model
> = cmd$ =>
	pipe(
		R.of(cmd$),
		RO.exhaustMap(cmd => {
			switch (cmd.type) {
				case 'fieldsChange':
					return pipe(
						Rx.defer(() =>
							Rx.of(new Date().getDate()),
						),
						Rx.map(timestamp =>
							validateInput(
								cmd.fields,
								timestamp,
							),
						),
						Rx.map(
							fields =>
								({
									type: 'ready',
									model: fields,
								}) satisfies Model,
						),
						R.of,
					)
				case 'add':
					return pipe(
						R.asks((deps: Deps) =>
							deps.addProduct(cmd.product),
						),
						R.map(
							TO.match(
								() =>
									({
										type: 'ready',
										model: {
											name: {
												status: 'ok',
											},
											expDate: {
												status: 'ok',
											},
										},
									}) satisfies Model,
								() =>
									({
										type: 'ready',
										model: initFields,
									}) satisfies Model,
							),
						),
						R.map(Rx.defer),
						R.map(
							Rx.startWith({
								type: 'adding',
							} satisfies Model),
						),
					)
			}
		}),
		R.local(
			(deps: Deps) =>
				({
					addProduct: flow(
						deps.addProduct,
						Rx.first(),
					),
				}) satisfies Deps,
		),
	)
