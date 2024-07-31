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
	either as E,
	function as F,
	predicate as P,
	readonlySet as RoS,
	string as S,
	task as T,
	taskEither as TE,
} from 'fp-ts'
import * as Rx from 'rxjs'
import * as Solid from 'solid-js'
import * as SolidStore from 'solid-js/store'

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
	isOpeningAddProduct: boolean
	isScrolling: boolean
	scrollY: number
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

type InternalCommand =
	| { type: '_refreshList' }
	| { type: '_showToast'; message: string }

type OverviewDispatchValue = DispatcherValue<
	Command | InternalCommand,
	Store
>

export const useOverviewStore: () => [
	Store,
	(command: Command) => void,
] = () => {
	const context = useAppContext(AppContext)

	const [store, setStore] =
		SolidStore.createStore<Store>({
			total: 0,
			offset: 0,
			sortBy: 'expirationDate',
			toastMessage: '',
			products: [],
			isLoading: true,
			isMenuOpen: false,
			selectMode: false,
			selectedProducts: new Set([]),
			isOpeningAddProduct: false,
			isScrolling: false,
			scrollY: window.scrollY,
		})

	const scroll = H.useWindowScroll()

	Solid.createEffect(() => {
		setStore(
			SolidStore.produce(state => {
				state.scrollY = scroll().scrollY
				state.isScrolling = scroll().isScrolling
			}),
		)
	})

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
							hide: () => ({
								...store,
								toastMessage: '',
							}),
							show: message => ({
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
							handleOpenAddProduct(
								store,
								navigate,
							),
						),
						Match.when(
							{ type: '_refreshList' },
							handleRefreshList(store, context),
						),
						Match.when(
							{ type: 'sortList' },
							handleSortList(store),
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
							handleToggleMenu(store),
						),
						Match.when(
							{ type: 'disableSelectMode' },
							handleDisableSelectMode(store),
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

	return [
		store,
		dispatch as (cmd: Command) => void,
	]
}

function handleRefreshList(
	store: Store,
	context: FridgyContext,
) {
	return (
		cmd: InternalCommand & {
			type: '_refreshList'
		},
	) =>
		pipe(
			Rx.scheduled(Rx.of(cmd), Rx.asyncScheduler),
			Rx.mergeMap(() =>
				pipe(
					context.app.productList({
						offset: store.offset,
						sortBy: store.sortBy,
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
					result =>
						({
							state: {
								...store,
								products:
									result.models as ProductModel[],
								total: result.total,
								isLoading: false,
							},
						}) as const,
				),
			),
			Rx.startWith({
				state: {
					...store,
					isLoading: true,
				},
			}),
		)
}

function handleSortList(store: Store) {
	return (cmd: Command & { type: 'sortList' }) =>
		pipe(
			Rx.of(cmd),
			Rx.map(
				() =>
					({
						state: {
							...store,
							sortBy: cmd.by,
						},
					}) satisfies OverviewDispatchValue,
			),
		)
}

function handleLog(context: FridgyContext) {
	return (cmd: Command & { type: 'log' }) =>
		pipe(
			context.app.log(cmd),
			T.fromIO,
			Rx.defer,
			Rx.ignoreElements(),
		)
}

function handleToggleMenu(store: Store) {
	return (_: Command & { type: 'toggleMenu' }) =>
		pipe(
			Rx.scheduled(
				Rx.of(undefined),
				Rx.asyncScheduler,
			),
			Rx.map(() => ({
				state: {
					...store,
					isMenuOpen: !store.isMenuOpen,
				},
			})),
		)
}

function handleDisableSelectMode(store: Store) {
	return (
		_: Command & { type: 'disableSelectMode' },
	) =>
		pipe(
			Rx.scheduled(
				Rx.of(undefined),
				Rx.asyncScheduler,
			),
			Rx.map(
				() =>
					({
						state: {
							...store,
							selectMode: false,
							selectedProducts: new Set(),
						},
					}) satisfies OverviewDispatchValue,
			),
		)
}

function handleToggleItem(store: Store) {
	return (
		cmd: Command & { type: 'toggleItem' },
	) =>
		pipe(
			Rx.scheduled(
				!store.selectMode
					? Rx.from(
							Haptics.impact({
								style: ImpactStyle.Medium,
							}),
						)
					: Rx.of(undefined),
				Rx.asyncScheduler,
			),
			Rx.map(() => ({
				state: {
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
				},
			})),
		)
}

function handleOpenAddProduct(
	store: Store,
	navigate: Navigator,
) {
	return (
		_: Command & { type: 'openAddProduct' },
	) =>
		pipe(
			Rx.scheduled(
				Rx.of(store.isOpeningAddProduct),
				Rx.asyncScheduler,
			),
			Rx.filter(P.not(F.identity)),
			Rx.delay(250),
			Rx.mergeMap(() =>
				pipe(
					() => {
						navigate('/add-product')
					},
					T.fromIO,
					Rx.defer,
				),
			),
			Rx.ignoreElements(),
			Rx.startWith({
				state: {
					...store,
					isOpeningAddProduct: true,
				},
			}),
		)
}

function handleDeleteProducts(
	store: Store,
	context: FridgyContext,
) {
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
				RoNeS.fromSet(store.selectedProducts),
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
							state: {
								...store,
								selectedProducts: new Set(),
								selectMode: false,
							},
							cmds: [
								{
									type: '_refreshList',
								},
								{
									type: '_showToast',
									message: `${store.selectedProducts.size.toString(10)} Products deleted`,
								},
							],
						}) as const,
				),
			),
		)
}
