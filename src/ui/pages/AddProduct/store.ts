import * as Match from '@effect/match'
import {
	either as E,
	function as F,
	option as OPT,
	task as T,
} from 'fp-ts'
import * as Rx from 'rxjs'
import * as Solid from 'solid-js'
import * as SS from 'solid-js/store'

import type { LogSeverity } from '@/app/interfaces/write/log'

import {
	AppContext,
	type FridgyContext,
	useAppContext,
} from '@/ui/context'
import * as H from '@/ui/core/helpers'
import { createDispatcher } from '@/ui/core/solid-js'

const pipe = F.pipe

interface Store {
	formFields: {
		name: string
		expDate: OPT.Option<number>
		isBestBefore: boolean
	}
	isOk: boolean
	toastMessage: string
	currentDate:
		| { status: 'loading' }
		| { status: 'ready'; date: string }
}

type Command =
	| { type: 'addProduct' }
	| {
			type: 'updateField'
			field:
				| {
						name: 'name'
						value: Store['formFields']['name']
				  }
				| {
						name: 'expDate'
						value: Store['formFields']['expDate']
				  }
				| {
						name: 'isBestBefore'
						value: Store['formFields']['isBestBefore']
				  }
	  }
	| {
			type: 'log'
			severity: LogSeverity
			message: string
	  }

interface InternalCommand {
	type: '_showToast'
	message: string
}

const defaultFields = () => ({
	name: '',
	expDate: OPT.none,
	isBestBefore: false,
})

const validateFields = (
	formFields: Store['formFields'],
) => ({ isOk: formFields.name.length > 0 })

const resetFields = () => {
	const fields = defaultFields()
	return {
		formFields: fields,
		...validateFields(fields),
	}
}

export const useStore: () => [
	Store,
	(command: Command) => void,
] = () => {
	const context = useAppContext(AppContext)

	const [store, setStore] = SS.createStore<Store>(
		{
			formFields: defaultFields(),
			currentDate: { status: 'loading' },
			toastMessage: '',
			...validateFields(defaultFields()),
		},
	)

	Solid.createRenderEffect(() => {
		setStore('currentDate', {
			status: 'ready',
			date: new Date()
				.toISOString()
				.split('T')[0],
		})
	})

	const dispatch = createDispatcher<
		Command | InternalCommand,
		Store
	>(setStore, cmd$ =>
		Rx.merge(
			pipe(
				cmd$,
				Rx.filter(
					cmd => cmd.type === '_showToast',
				),
				Rx.switchMap(cmd =>
					pipe(
						cmd.message,
						H.handleShowToast({
							hide: () => (s: Store) => ({
								...s,
								toastMessage: '',
							}),
							show: message => (s: Store) => ({
								...s,
								toastMessage: message,
							}),
						}),
					),
				),
			),
			pipe(
				cmd$,
				Rx.filter(
					cmd => cmd.type === 'addProduct',
				),
				Rx.exhaustMap(
					handleAddProduct(store, context),
				),
			),
			pipe(
				cmd$,
				Rx.filter(
					cmd =>
						cmd.type === 'log' ||
						cmd.type === 'updateField',
				),
				Rx.mergeMap(
					handleLogAndUpdateField(store, context),
				),
			),
		),
	)

	return [
		store,
		dispatch as (command: Command) => void,
	]
}

function handleLogAndUpdateField(
	store: Store,
	context: FridgyContext,
) {
	return F.flow(
		Match.value<
			Command &
				(
					| { type: 'updateField' }
					| { type: 'log' }
				)
		>,
		Match.when(
			{ type: 'updateField' },
			({ field }) =>
				pipe(
					Rx.scheduled(
						Rx.of(field),
						Rx.asyncScheduler,
					),
					Rx.map(field => {
						const newFields = {
							...SS.unwrap(store).formFields,
							[field.name]: field.value,
						}

						return {
							mutation: (s: Store) => ({
								...s,
								formFields: newFields,
								...validateFields(newFields),
							}),
						}
					}),
				),
		),
		Match.when({ type: 'log' }, cmd =>
			pipe(
				context.app.log(cmd),
				T.fromIO,
				Rx.defer,
				Rx.ignoreElements(),
			),
		),
		Match.exhaustive,
	)
}

function handleAddProduct(
	store: Store,
	context: FridgyContext,
) {
	return (_: Command & { type: 'addProduct' }) =>
		pipe(
			Rx.scheduled(
				Rx.of(undefined),
				Rx.asyncScheduler,
			),
			Rx.delay(300),
			Rx.mergeMap(() =>
				pipe(
					context.app.addProduct({
						name: store.formFields.name,
						expiration: pipe(
							store.formFields.expDate,
							OPT.map(expDate => ({
								isBestBefore:
									store.formFields.isBestBefore,
								date: expDate,
							})),
						),
					}),
					Rx.defer,
				),
			),
			Rx.map(
				E.matchW(
					() =>
						({
							cmds: [
								{
									type: '_showToast',
									message:
										'There was a problem adding the product',
								},
							],
						}) as const,
					() => ({
						mutation: (s: Store) => ({
							...s,
							...resetFields(),
						}),
						cmds: [
							{
								type: '_showToast',
								message: `"${SS.unwrap(store).formFields.name}" added`,
							},
						],
					}),
				),
			),
		)
}
