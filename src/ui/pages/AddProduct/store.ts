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

import type { App } from '@/app'
import type { LogSeverity } from '@/app/interfaces/write/log'

import { DEFAULT_FADE_MS } from '@/ui/core/constants'
import * as H from '@/ui/core/helpers'
import { createDispatcher } from '@/ui/core/solid-js'

const pipe = F.pipe

export interface State {
	formFields: {
		name: string
		expDate: OPT.Option<number>
	}
	isOk: boolean
	toastMessage: string
	currentDate:
		| { status: 'loading' }
		| { status: 'ready'; date: string }
}

export type Command =
	| { type: 'addProduct' }
	| {
			type: 'updateField'
			field:
				| {
						name: 'name'
						value: State['formFields']['name']
				  }
				| {
						name: 'expDate'
						value: State['formFields']['expDate']
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
})

const validateFields = (
	formFields: State['formFields'],
) => ({ isOk: formFields.name.length > 0 })

const resetFields = () => {
	const fields = defaultFields()
	return {
		formFields: fields,
		...validateFields(fields),
	}
}

export type Store = [
	State,
	(command: Command) => void,
]

export const createStore: (
	app: App,
) => Store = context => {
	const [state, setState] = SS.createStore<State>(
		{
			formFields: defaultFields(),
			currentDate: { status: 'loading' },
			toastMessage: '',
			...validateFields(defaultFields()),
		},
	)

	Solid.createRenderEffect(() => {
		setState('currentDate', {
			status: 'ready',
			date: new Date()
				.toISOString()
				.split('T')[0],
		})
	})

	const dispatch = createDispatcher<
		Command | InternalCommand,
		State
	>(setState, cmd$ =>
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
							hide: () => (s: State) => ({
								...s,
								toastMessage: '',
							}),
							show: message => (s: State) => ({
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
					handleAddProduct(state, context),
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
					handleLogAndUpdateField(state, context),
				),
			),
		),
	)

	return [
		state,
		dispatch as (command: Command) => void,
	]
}

function handleLogAndUpdateField(
	state: State,
	app: App,
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
							...SS.unwrap(state).formFields,
							[field.name]: field.value,
						}

						return {
							mutation: (s: State) => ({
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
				app.log(cmd),
				T.fromIO,
				Rx.defer,
				Rx.ignoreElements(),
			),
		),
		Match.exhaustive,
	)
}

function handleAddProduct(
	state: State,
	app: App,
) {
	return (_: Command & { type: 'addProduct' }) =>
		pipe(
			Rx.scheduled(
				Rx.of(undefined),
				Rx.asyncScheduler,
			),
			Rx.delay(DEFAULT_FADE_MS),
			Rx.mergeMap(() =>
				pipe(
					app.addProduct({
						name: state.formFields.name,
						expirationDate:
							state.formFields.expDate,
					}),
					Rx.defer,
				),
			),
			Rx.map(
				E.matchW(
					error =>
						({
							cmds: [
								{
									type: '_showToast',
									message: `Error: ${error}`,
								},
							],
						}) as const,
					() => ({
						mutation: (s: State) => ({
							...s,
							...resetFields(),
						}),
						cmds: [
							{
								type: '_showToast',
								message: `"${SS.unwrap(state).formFields.name}" added`,
							},
						],
					}),
				),
			),
		)
}
