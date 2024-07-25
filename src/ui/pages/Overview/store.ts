import {
	Haptics,
	ImpactStyle,
} from '@capacitor/haptics'
import { useNavigate } from '@solidjs/router'
import {
	function as F,
	option as OPT,
	predicate as P,
	readonlySet as RoS,
	taskOption as TO,
} from 'fp-ts'
import * as Rx from 'rxjs'
import {
	batch,
	createEffect,
	from,
} from 'solid-js'
import { createStore } from 'solid-js/store'

import { Base64 } from '@/core/base64'
import * as RoNeS from '@/core/readonly-non-empty-set'

import type { LogSeverity } from '@/app/interfaces/write/log'
import type {
	ProductModel,
	Sortings,
} from '@/app/use-cases/product-list'

import {
	AppContext,
	useAppContext,
} from '@/ui/context'
import { useWindowScroll } from '@/ui/core/helpers'
import { useDispatcher } from '@/ui/core/solid-js'

const pipe = F.pipe

interface OverviewStore {
	sorting: Sortings
	toastMessage: string
	isMenuOpen: boolean
	isLoading: boolean
	products: ProductModel[]
	selectMode: boolean
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
	| { type: 'toggleItem'; id: Base64 }
	| {
			type: 'log'
			severity: LogSeverity
			message: string
	  }
	| {
			type: 'sortList'
			by: 'date' | 'a-z'
	  }

export const useOverviewStore: () => [
	OverviewStore,
	(command: Command) => void,
] = () => {
	const context = useAppContext(AppContext)

	const [store, setStore] =
		createStore<OverviewStore>({
			sorting: 'date',
			toastMessage: '',
			isMenuOpen: false,
			isLoading: false,
			products: [],
			selectMode: false,
			selectedProducts: new Set([]),
			isOpeningAddProduct: false,
			isScrolling: false,
			scrollY: window.scrollY,
		})

	const controller = context.app.productList({
		sortBy: store.sorting,
	})

	const model = from(controller.stream)

	const scroll = useWindowScroll()

	createEffect(() => {
		const m = model()
		batch(() => {
			setStore(
				'isLoading',
				m === undefined || m.status === 'loading'
					? true
					: false,
			)
			setStore(
				'products',
				m !== undefined && m.status === 'ready'
					? m.products
					: [],
			)
			setStore('scrollY', scroll().scrollY)
			setStore(
				'isScrolling',
				scroll().isScrolling,
			)
		})
	})

	const navigate = useNavigate()

	createEffect(() => {
		controller.next({ sortBy: store.sorting })
	})

	const dispatch = useDispatcher<Command>(cmd$ =>
		pipe(
			cmd$,
			Rx.mergeMap(cmd => {
				switch (cmd.type) {
					case 'sortList':
						return pipe(
							Rx.of(cmd),
							Rx.tap(() => {
								setStore('sorting', cmd.by)
							}),
							Rx.ignoreElements(),
						)
					case 'log':
						return pipe(
							Rx.of(cmd),
							Rx.tap(cmd => {
								context.app.log(cmd)()
							}),
							Rx.ignoreElements(),
						)
					case 'deleteProducts':
						return pipe(
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
									store.selectedProducts,
								),
							),
							Rx.mergeMap(
								OPT.match(
									() => Rx.defer(TO.none),
									products =>
										Rx.defer(
											pipe(
												TO.fromIO(() => {
													context.showLoading(
														true,
													)
												}),
												TO.chain(() =>
													context.app.deleteProductsByIds(
														products,
													),
												),
											),
										),
								),
							),
							Rx.tap(opt => {
								batch(() => {
									context.showLoading(false)

									if (OPT.isNone(opt)) {
										batch(() => {
											setStore(
												'toastMessage',
												'Products deleted succesfully',
											)
											setStore(
												'selectedProducts',
												new Set(),
											)
											setStore(
												'selectMode',
												false,
											)
										})
									}
								})
							}),
							Rx.delay(2500),
							Rx.tap(() => {
								setStore('toastMessage', '')
							}),
							Rx.ignoreElements(),
						)
					case 'toggleMenu':
						return pipe(
							Rx.scheduled(
								Rx.of(undefined),
								Rx.asyncScheduler,
							),
							Rx.tap(() => {
								setStore(
									'isMenuOpen',
									!store.isMenuOpen,
								)
							}),
							Rx.ignoreElements(),
						)
					case 'openAddProduct':
						return pipe(
							Rx.scheduled(
								Rx.of(store.isOpeningAddProduct),
								Rx.asyncScheduler,
							),
							Rx.filter(P.not(F.identity)),
							Rx.tap(() => {
								setStore(
									'isOpeningAddProduct',
									true,
								)
							}),
							Rx.delay(250),
							Rx.tap(() => {
								navigate('/add-product')
							}),
							Rx.ignoreElements(),
						)
					case 'disableSelectMode':
						return pipe(
							Rx.scheduled(
								Rx.of(undefined),
								Rx.asyncScheduler,
							),
							Rx.tap(() => {
								batch(() => {
									setStore('selectMode', false)
									setStore(
										'selectedProducts',
										new Set(),
									)
								})
							}),
							Rx.ignoreElements(),
						)
					case 'toggleItem':
						return pipe(
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
							Rx.tap(() => {
								batch(() => {
									if (!store.selectMode) {
										setStore('selectMode', true)
									}
									setStore(
										'selectedProducts',
										RoS.toggle(Base64.Eq)(cmd.id),
									)
									if (
										store.selectedProducts
											.size === 0
									) {
										setStore('selectMode', false)
									}
								})
							}),
							Rx.ignoreElements(),
						)
				}
			}),
		),
	)

	return [store, dispatch]
}
