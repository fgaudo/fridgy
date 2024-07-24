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
import {
	createStore,
	produce,
} from 'solid-js/store'

import type { LogSeverity } from '@/app/contract/write/log'

import {
	AppContext,
	useAppContext,
} from '@/ui/context'
import { useDispatcher } from '@/ui/core/solid-js'

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
	| {
			type: 'log'
			severity: LogSeverity
			message: string
	  }
	| { type: 'addProduct' }
	| {
			type: 'updateField'
			field:
				| { name: 'name'; value: string }
				| {
						name: 'expDate'
						value: OPT.Option<number>
				  }
				| { name: 'isBestBefore'; value: boolean }
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
		setStore(
			produce(state => {
				state.formFields = defaultFields()
			}),
		)

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

	const dispatch = useDispatcher<Command>(cmd$ =>
		Rx.merge(
			pipe(
				cmd$,
				Rx.filter(cmd => cmd.type === 'log'),
				Rx.tap(cmd => {
					context.app.log(cmd)()
				}),
				Rx.ignoreElements(),
			),
			pipe(
				cmd$,
				Rx.filter(
					cmd => cmd.type === 'addProduct',
				),
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
										store.formFields.isBestBefore,
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
				Rx.delay(2500),
				Rx.tap(() => {
					setStore('toastMessage', '')
				}),
				Rx.ignoreElements(),
			),
			pipe(
				cmd$,
				Rx.filter(
					cmd => cmd.type === 'updateField',
				),
				Rx.map(cmd => cmd.field),
				Rx.tap(field => {
					batch(() => {
						switch (field.name) {
							case 'name':
								setStore(
									'formFields',
									produce(fields => {
										fields.name = field.value
									}),
								)
								break
							case 'expDate':
								setStore(
									'formFields',
									produce(fields => {
										fields.expDate = field.value
									}),
								)
								break
							case 'isBestBefore':
								setStore(
									'formFields',
									produce(fields => {
										fields.isBestBefore =
											field.value
									}),
								)
						}

						validateFields()
					})
				}),
				Rx.ignoreElements(),
			),
		),
	)

	return [store, dispatch]
}
