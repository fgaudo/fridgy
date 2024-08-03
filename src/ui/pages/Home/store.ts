import {
	Haptics,
	ImpactStyle,
} from '@capacitor/haptics'
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
import * as Solid from 'solid-js'
import * as SS from 'solid-js/store'

import * as RoNeS from '@/core/readonly-non-empty-set'

import type { App } from '@/app'
import type { Options } from '@/app/interfaces/read/products'
import type { LogSeverity } from '@/app/interfaces/write/log'
import type {
	ProductModel,
	Sortings,
} from '@/app/use-cases/product-list'

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
	offset: number
	sortBy: Sortings
	toastMessage: string
	products: ProductModel[]
	isLoading: boolean
	selectedProducts: ReadonlySet<
		ProductModel['id']
	>
}

export type Command =
	| { type: 'deleteProducts' }
	| {
			type: 'clearSelectedProducts'
	  }
	| { type: 'toggleItem'; id: string }
	| {
			type: 'sortList'
			by: Options['sortBy']
	  }
	| {
			type: 'log'
			severity: LogSeverity
			message: string
	  }

type OverviewDispatcherValue = DispatcherValue<
	Command | InternalCommand,
	(s: State) => State
>

type InternalCommand =
	| { type: '_refreshList' }
	| { type: '_showToast'; message: string }

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
			offset: 0,
			sortBy: 'expirationDate',
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
							{ type: '_refreshList' },
							handleRefreshList(state, context),
						),
						Match.when(
							{ type: 'sortList' },
							handleSortList(),
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

	Solid.onMount(() => {
		onResume(() => {
			dispatch({ type: '_refreshList' })
		})

		dispatch({ type: '_refreshList' })
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
	cmd: InternalCommand & {
		type: '_refreshList'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (
		cmd: InternalCommand & {
			type: '_refreshList'
		},
	) =>
		pipe(
			Rx.scheduled(Rx.of(cmd), Rx.asyncScheduler),
			Rx.mergeMap(() =>
				pipe(
					app.productList({
						offset: SS.unwrap(state).offset,
						sortBy: SS.unwrap(state).sortBy,
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

function handleSortList(): (
	cmd: Command & {
		type: 'sortList'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (cmd: Command & { type: 'sortList' }) =>
		pipe(
			Rx.of(cmd),
			Rx.map(() => ({
				mutation: (state: State) => ({
					...state,
					sortBy: cmd.by,
				}),
			})),
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
				Rx.from(
					Haptics.impact({
						style: ImpactStyle.Light,
					}),
				),
				Rx.asyncScheduler,
			),
			Rx.map(() =>
				RoNeS.fromSet(
					SS.unwrap(state).selectedProducts,
				),
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
									type: '_refreshList',
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
