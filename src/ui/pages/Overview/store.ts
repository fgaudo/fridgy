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

import type { LogSeverity } from '@/app/contract/write/log'
import type { ProductModel } from '@/app/use-cases/product-list'

import {
	AppContext,
	useAppContext,
} from '@/ui/context'
import { useWindowScroll } from '@/ui/core/helpers'
import { useDispatcher } from '@/ui/core/solid-js'

const pipe = F.pipe

interface OverviewStore {
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

export const useOverviewStore: () => [
	OverviewStore,
	(command: Command) => void,
] = () => {
	const context = useAppContext(AppContext)

	const model = from(
		context.app.productList.stream,
	)

	const [store, setStore] =
		createStore<OverviewStore>({
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

	const dispatch = useDispatcher<Command>(cmd$ =>
		pipe(
			cmd$,
			Rx.mergeMap(cmd => {
				switch (cmd.type) {
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
								Rx.of(
									RoNeS.fromSet(
										store.selectedProducts,
									),
								),
								Rx.asyncScheduler,
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
								Rx.of(undefined),
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
