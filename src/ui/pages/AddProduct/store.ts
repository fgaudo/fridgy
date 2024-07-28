import {
	function as F,
	option as OPT,
} from 'fp-ts'
import * as Rx from 'rxjs'
import {
	batch,
	createRenderEffect,
	onCleanup,
} from 'solid-js'
import { createStore } from 'solid-js/store'

import type { LogSeverity } from '@/app/interfaces/write/log'

import {
	AppContext,
	useAppContext,
} from '@/ui/context'
import { TOAST_DELAY_MS } from '@/ui/core/constants'
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

export const useStore: () => [
	Store,
	(command: Command) => void,
] = () => {
	const context = useAppContext(AppContext)

	const [store, setStore] = createStore<Store>({
		formFields: defaultFields(),
		isOk: false,
		currentDate: { status: 'loading' },
		toastMessage: '',
	})

	const validateFields = () => {
		setStore(
			'isOk',
			store.formFields.name.length > 0,
		)
	}

	const resetFields = () => {
		setStore(state => ({
			...state,
			formFields: defaultFields(),
		}))

		validateFields()
	}

	createRenderEffect(() => {
		setStore('currentDate', {
			status: 'ready',
			date: new Date()
				.toISOString()
				.split('T')[0],
		})
	})

	onCleanup(() => {
		context.showLoading(false)
	})

	const dispatch = createDispatcher<
		Command | InternalCommand
	>(cmd$ =>
		pipe(
			cmd$,
			Rx.mergeMap(cmd => {
				switch (cmd.type) {
					case '_showToast':
						return pipe(
							Rx.scheduled(
								Rx.of(cmd.message),
								Rx.asyncScheduler,
							),
							Rx.tap(message => {
								setStore('toastMessage', message)
							}),
							Rx.delay(TOAST_DELAY_MS),
							Rx.tap(() => {
								setStore('toastMessage', '')
							}),
							Rx.ignoreElements(),
						)
					case 'log':
						return pipe(
							Rx.of(undefined),
							Rx.tap(() => {
								context.app.log(cmd)()
							}),
							Rx.ignoreElements(),
						)
					case 'addProduct':
						return pipe(
							Rx.of(undefined),

							Rx.tap(() => {
								context.showLoading(true)
							}),
							Rx.mergeMap(() =>
								Rx.defer(
									context.app.addProduct({
										name: store.formFields.name,
										expDate: pipe(
											store.formFields.expDate,
											OPT.map(expDate => ({
												isBestBefore:
													store.formFields
														.isBestBefore,
												timestamp: expDate,
											})),
										),
									}),
								),
							),
							Rx.tap(result => {
								batch(() => {
									context.showLoading(false)

									if (OPT.isNone(result)) {
										setStore(
											'toastMessage',
											'Product added succesfully',
										)

										resetFields()
									}
								})
							}),
							Rx.delay(TOAST_DELAY_MS),
							Rx.tap(() => {
								setStore('toastMessage', '')
							}),
							Rx.ignoreElements(),
						)
					case 'updateField':
						return pipe(
							Rx.of(cmd.field),
							Rx.tap(field => {
								batch(() => {
									setStore(
										'formFields',
										fields => ({
											...fields,
											[field.name]: field.value,
										}),
									)

									validateFields()
								})
							}),
							Rx.ignoreElements(),
						)
				}
			}),
		),
	)

	return [
		store,
		dispatch as (command: Command) => void,
	]
}
