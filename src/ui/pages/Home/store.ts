import {
	Haptics,
	ImpactStyle,
} from '@capacitor/haptics'
import * as Match from '@effect/match'
import {
	type Navigator,
	useNavigate,
} from '@solidjs/router'
import {
	array as A,
	either as E,
	function as F,
	readonlyArray as RoA,
	readonlySet as RoS,
	string as S,
	task as T,
	taskEither as TE,
} from 'fp-ts'
import * as Rx from 'rxjs'
import * as Solid from 'solid-js'
import * as SS from 'solid-js/store'

import * as RoNeS from '@/core/readonly-non-empty-set'

import type { Options } from '@/app/interfaces/read/products'
import type { LogSeverity } from '@/app/interfaces/write/log'
import type {
	ProductModel,
	Sortings,
} from '@/app/use-cases/product-list'

import {
	AppContext,
	type FridgyContext,
	useAppContext,
} from '@/ui/context'
import { onResume } from '@/ui/core/capacitor'
import * as H from '@/ui/core/helpers'
import {
	type DispatcherValue,
	createDispatcher,
} from '@/ui/core/solid-js'

const pipe = F.pipe

interface Store {
	total: number
	offset: number
	sortBy: Sortings
	toastMessage: string
	isMenuOpen: boolean
	selectMode: boolean
	products: ProductModel[]
	isLoading: boolean
	selectedProducts: ReadonlySet<
		ProductModel['id']
	>
}

type Command =
	| { type: 'deleteProducts' }
	| {
			type: 'toggleMenu'
	  }
	| {
			type: 'openAddProduct'
	  }
	| {
			type: 'disableSelectMode'
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
	(s: Store) => Store
>

type InternalCommand =
	| { type: '_refreshList' }
	| { type: '_showToast'; message: string }

export const useOverviewStore: () => [
	Store,
	(command: Command) => void,
] = () => {
	const context = useAppContext(AppContext)

	const [store, setStore] = SS.createStore<Store>(
		{
			total: 0,
			offset: 0,
			sortBy: 'expirationDate',
			toastMessage: '',
			products: [],
			isLoading: true,
			isMenuOpen: false,
			selectMode: false,
			selectedProducts: new Set([]),
		},
	)

	const navigate = useNavigate()

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
							hide: () => (store: Store) => ({
								...store,
								toastMessage: '',
							}),
							show:
								message => (store: Store) => ({
									...store,
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
							{ type: 'openAddProduct' },
							handleOpenAddProduct(navigate),
						),
						Match.when(
							{ type: '_refreshList' },
							handleRefreshList(store, context),
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
								store,
								context,
							),
						),
						Match.when(
							{ type: 'toggleMenu' },
							handleToggleMenu(),
						),
						Match.when(
							{ type: 'disableSelectMode' },
							handleDisableSelectMode(),
						),
						Match.when(
							{ type: 'toggleItem' },
							handleToggleItem(store),
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

	function handleRefreshList(
		store: Store,
		context: FridgyContext,
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
				Rx.scheduled(
					Rx.of(cmd),
					Rx.asyncScheduler,
				),
				Rx.mergeMap(() =>
					pipe(
						context.app.productList({
							offset: SS.unwrap(store).offset,
							sortBy: SS.unwrap(store).sortBy,
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
						result => {
							setStore(
								'products',
								SS.reconcile(
									result.models as ProductModel[],
									{ key: 'id' },
								),
							)

							return {
								mutation: (s: Store) => ({
									...s,
									total: result.total,
									isLoading: false,
								}),
							}
						},
					),
				),
				Rx.startWith({
					mutation: (store: Store) => ({
						...store,
						isLoading: true,
					}),
				} satisfies OverviewDispatcherValue),
			)
	}

	return [
		store,
		dispatch as (cmd: Command) => void,
	]
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
				mutation: (store: Store) => ({
					...store,
					sortBy: cmd.by,
				}),
			})),
		)
}

function handleLog(context: FridgyContext): (
	cmd: Command & {
		type: 'log'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (cmd: Command & { type: 'log' }) =>
		pipe(
			context.app.log(cmd),
			T.fromIO,
			Rx.defer,
			Rx.ignoreElements(),
		)
}

function handleToggleMenu(): (
	cmd: Command & {
		type: 'toggleMenu'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (_: Command & { type: 'toggleMenu' }) =>
		pipe(
			Rx.scheduled(
				Rx.of(undefined),
				Rx.asyncScheduler,
			),
			Rx.map(() => ({
				mutation: (store: Store) => ({
					...store,
					isMenuOpen: !store.isMenuOpen,
				}),
			})),
		)
}

function handleDisableSelectMode(): (
	cmd: Command & {
		type: 'disableSelectMode'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (
		_: Command & { type: 'disableSelectMode' },
	) =>
		pipe(
			Rx.scheduled(
				Rx.of(undefined),
				Rx.asyncScheduler,
			),
			Rx.map(() => ({
				mutation: (store: Store) => ({
					...store,
					selectMode: false,
					selectedProducts: new Set(),
				}),
			})),
		)
}

function handleToggleItem(store: Store): (
	cmd: Command & {
		type: 'toggleItem'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (
		cmd: Command & { type: 'toggleItem' },
	) =>
		pipe(
			Rx.scheduled(
				!SS.unwrap(store).selectMode
					? Rx.from(
							Haptics.impact({
								style: ImpactStyle.Medium,
							}),
						)
					: Rx.of(undefined),
				Rx.asyncScheduler,
			),
			Rx.map(() => ({
				mutation: (store: Store) => ({
					...store,
					selectedProducts: RoS.toggle(S.Eq)(
						cmd.id,
					)(store.selectedProducts),

					selectMode:
						RoS.elem(S.Eq)(cmd.id)(
							store.selectedProducts,
						) && store.selectedProducts.size <= 1
							? false
							: true,
				}),
			})),
		)
}

function handleOpenAddProduct(
	navigate: Navigator,
): (
	cmd: Command & {
		type: 'openAddProduct'
	},
) => Rx.Observable<OverviewDispatcherValue> {
	return (
		_: Command & { type: 'openAddProduct' },
	) =>
		pipe(
			() => {
				navigate('/add-product')
			},
			T.fromIO,
			Rx.defer,
			Rx.ignoreElements(),
		)
}

function handleDeleteProducts(
	store: Store,
	context: FridgyContext,
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
					SS.unwrap(store).selectedProducts,
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
						F.flow(T.of, T.delay(300)),
					),
					TE.chain(
						context.app.deleteProductsByIds,
					),
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
							mutation: (store: Store) => ({
								...store,
								selectedProducts: new Set(),
								selectMode: false,
							}),
							cmds: [
								{
									type: '_refreshList',
								},
								{
									type: '_showToast',
									message: `${SS.unwrap(store).selectedProducts.size.toString(10)} Products deleted`,
								},
							],
						}) as const,
				),
			),
		)
}
