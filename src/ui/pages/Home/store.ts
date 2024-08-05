import * as Match from '@effect/match'
import {
	either as E,
	function as F,
	readonlySet as RoS,
	string as S,
	task as T,
	taskEither as TE,
} from 'fp-ts'
import * as Rx from 'rxjs'
import { onMount } from 'solid-js'
import * as SS from 'solid-js/store'

import * as RoNeS from '@/core/readonly-non-empty-set'

import type { App } from '@/app'
import type { LogSeverity } from '@/app/interfaces/write/log'
import type { ProductModel } from '@/app/use-cases/product-list'

import { onResume } from '@/ui/core/capacitor'
import { DEFAULT_FADE_MS } from '@/ui/core/constants'
import * as H from '@/ui/core/helpers'
import {
	type DispatcherValue,
	createDispatcher,
} from '@/ui/core/solid-js'

const pipe = F.pipe

export interface State {
	total: number
	toastMessage: string
	products: ProductModel[]
	isLoading: boolean
	selectedProducts: ReadonlySet<
		ProductModel['id']
	>
}

export type Command =
	| { type: 'refreshList' }
	| { type: 'deleteProducts' }
	| {
			type: 'clearSelectedProducts'
	  }
	| { type: 'toggleItem'; id: string }
	| {
			type: 'log'
			severity: LogSeverity
			message: string
	  }

type OverviewDispatcherValue = DispatcherValue<
	Command | InternalCommand,
	(s: State) => State
>

interface InternalCommand {
	type: '_showToast'
	message: string
}

export type Store = [
	State,
	(command: Command) => void,
]

export const createStore: (
	context: App,
) => Store = context => {
	const [state, setState] = SS.createStore<State>(
		{
			total: 0,
			toastMessage: '',
			products: [],
			isLoading: true,
			selectedProducts: new Set([]),
		},
	)

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
							hide: () => (state: State) => ({
								...state,
								toastMessage: '',
							}),
							show:
								message => (state: State) => ({
									...state,
									toastMessage: message,
								}),
						}),
					),
				),
			),
			pipe(
				cmd$,
				Rx.filter(
					cmd => cmd.type !== '_showToast',
				),
				Rx.mergeMap(cmd =>
					pipe(
						Match.value(cmd),
						Match.when(
							{ type: 'clearSelectedProducts' },
							clearSelectedProducts(),
						),
						Match.when(
							{ type: 'refreshList' },
							handleRefreshList(state, context),
						),
						Match.when(
							{ type: 'log' },
							handleLog(context),
						),
						Match.when(
							{ type: 'deleteProducts' },
							handleDeleteProducts(
								state,
								context,
							),
						),
						Match.when(
							{ type: 'toggleItem' },
							handleToggleItem(),
						),
						Match.exhaustive,
					),
				),
			),
		),
	)

	onMount(() => {
		onResume(() => {
			dispatch({ type: 'refreshList' })
		})

		dispatch({ type: 'refreshList' })
	})

	return [
		state,
		dispatch as (cmd: Command) => void,
	]
}

function handleRefreshList(
	state: State,
	app: App,
): (
	cmd: Command & {
		type: 'refreshList'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (
		cmd: Command & {
			type: 'refreshList'
		},
	) =>
		pipe(
			Rx.scheduled(Rx.of(cmd), Rx.asyncScheduler),
			Rx.mergeMap(() =>
				pipe(app.productList, Rx.defer),
			),

			Rx.map(
				E.matchW(
					error =>
						({
							cmds: [
								{
									type: '_showToast',
									message: error,
								},
							],
						}) as const,
					result => ({
						mutation: (s: State) => ({
							...s,
							products: SS.reconcile(
								Array.from(result.models),
								{ key: 'id' },
							)(s.products),
							total: result.total,
							isLoading: false,
						}),
					}),
				),
			),
			Rx.startWith({
				mutation: (state: State) => ({
					...state,
					isLoading: true,
				}),
			}),
		)
}

function clearSelectedProducts(): (
	cmd: Command & {
		type: 'clearSelectedProducts'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (
		cmd: Command & {
			type: 'clearSelectedProducts'
		},
	) =>
		pipe(
			Rx.of(cmd),
			Rx.map(() => ({
				mutation: (state: State) => ({
					...state,
					selectedProducts: new Set(),
				}),
			})),
		)
}

function handleLog(app: App): (
	cmd: Command & {
		type: 'log'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (cmd: Command & { type: 'log' }) =>
		pipe(
			app.log(cmd),
			T.fromIO,
			Rx.defer,
			Rx.ignoreElements(),
		)
}

function handleToggleItem(): (
	cmd: Command & {
		type: 'toggleItem'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (
		cmd: Command & { type: 'toggleItem' },
	) =>
		pipe(
			Rx.scheduled(
				Rx.of(undefined),
				Rx.asyncScheduler,
			),
			Rx.map(() => ({
				mutation: (state: State) => ({
					...state,
					selectedProducts: RoS.toggle(S.Eq)(
						cmd.id,
					)(state.selectedProducts),

					selectMode:
						RoS.elem(S.Eq)(cmd.id)(
							state.selectedProducts,
						) && state.selectedProducts.size <= 1
							? false
							: true,
				}),
			})),
		)
}

function handleDeleteProducts(
	state: State,
	app: App,
): (
	cmd: Command & {
		type: 'deleteProducts'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (
		_: Command & { type: 'deleteProducts' },
	) =>
		pipe(
			Rx.scheduled(
				Rx.of(
					RoNeS.fromSet(
						SS.unwrap(state).selectedProducts,
					),
				),
				Rx.asyncScheduler,
			),
			Rx.map(
				E.fromOption(
					() => new Error('No item selected'),
				),
			),
			Rx.mergeMap(
				F.flow(
					TE.fromEither,
					TE.chainFirstTaskK(
						F.flow(
							T.of,
							T.delay(DEFAULT_FADE_MS),
						),
					),
					TE.chain(app.deleteProductsByIds),
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
										'There was a problem deleting the products',
								},
							],
						}) as const,
					() =>
						({
							mutation: (state: State) => ({
								...state,
								selectedProducts: new Set(),
								selectMode: false,
							}),
							cmds: [
								{
									type: 'refreshList',
								},
								{
									type: '_showToast',
									message: `${SS.unwrap(state).selectedProducts.size.toString(10)} Products deleted`,
								},
							],
						}) as const,
				),
			),
		)
}
