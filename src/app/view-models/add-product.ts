import * as OE from '@fgaudo/fp-ts-rxjs/ObservableEither.js'
import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import * as ROE from '@fgaudo/fp-ts-rxjs/ReaderObservableEither.js'
import {
	either as E,
	function as F,
	io as IO,
	option as O,
	reader as R,
	readerTask as RT,
	task as T,
	taskOption as TO,
} from 'fp-ts'
import * as Rx from 'rxjs'

import type { ViewModel } from '@/core/view-model'

import type {
	AddProduct as AddProductCommand,
	ProductInputDTO,
} from '@/app/contract/write/add-product'

const pipe = F.pipe
const flow = F.flow

interface ProductData<ID> {
	id: ID
	name: string
	expDate: {
		timestamp: number
		isBestBefore: boolean
	}
}

export type Command<ID> =
	| {
			type: 'add'
			product: ProductData<ID>
	  }
	| {
			type: 'fieldsChange'
			fields: ProductData<ID>
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

interface Deps<ID> {
	addProduct: AddProductCommand<ID>
}

const validateInput = <ID>(
	fields: ProductData<ID>,
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

export const createViewModel: <ID>() => ViewModel<
	Deps<ID>,
	Command<ID>,
	Model
> =
	<ID>() =>
	(cmd$: Rx.Observable<Command<ID>>) =>
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
							R.asks((deps: Deps<ID>) =>
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
				(deps: Deps<ID>) =>
					({
						addProduct: flow(
							deps.addProduct,
							Rx.first(),
						),
					}) satisfies Deps<ID>,
			),
		)
