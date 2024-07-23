import type {
	MdCheckbox,
	MdOutlinedTextField,
} from '@material/web/all'
import {
	function as F,
	option as OPT,
} from 'fp-ts'
import * as Rx from 'rxjs'
import {
	batch,
	createRenderEffect,
	onMount,
	useContext,
} from 'solid-js'
import {
	createStore,
	produce,
} from 'solid-js/store'

import type { ProductDTO } from '@/app/contract/read/types/product'
import type { LogSeverity } from '@/app/contract/write/log'

import { AppContext } from '@/ui/context'
import { useDispatcher } from '@/ui/core/solid-js'

const pipe = F.pipe

interface Store {
	formFields: {
		name: string
		expDate: OPT.Option<number>
		isBestBefore: boolean
	}
	isOk: boolean
	isAdding: boolean
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

export const useStore: () => [
	Store,
	(command: Command) => void,
] = () => {
	const app = useContext(AppContext)!

	const [store, setStore] = createStore<Store>({
		formFields: {
			name: '',
			expDate: OPT.none,
			isBestBefore: false,
		},
		isOk: false,
		isAdding: false,
		currentDate: { status: 'loading' },
	})

	createRenderEffect(() => {
		setStore('currentDate', {
			status: 'ready',
			date: new Date()
				.toISOString()
				.split('T')[0],
		})
	})

	const dispatch = useDispatcher<Command>(cmd$ =>
		Rx.merge(
			pipe(
				cmd$,
				Rx.filter(cmd => cmd.type === 'log'),
				Rx.tap(cmd => {
					app.log(cmd)()
				}),
				Rx.ignoreElements(),
			),
			pipe(
				cmd$,
				Rx.filter(
					cmd => cmd.type === 'addProduct',
				),
				Rx.tap(() => {
					setStore('isAdding', true)
				}),
				Rx.mergeMap(() =>
					Rx.defer(
						app.addProduct({
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
						setStore('isAdding', false)

						if (OPT.isNone(result)) {
							setStore(
								'formFields',
								produce(fields => {
									fields.expDate = OPT.none
									fields.isBestBefore = false
									fields.name = ''
								}),
							)
						}
					})
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

						setStore(
							'isOk',
							store.formFields.name.length > 0,
						)
					})
				}),
				Rx.ignoreElements(),
			),
		),
	)

	return [store, dispatch]
}
