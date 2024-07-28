import {
	Haptics,
	ImpactStyle,
} from '@capacitor/haptics'
import { useNavigate } from '@solidjs/router'
import {
	either as E,
	function as F,
	option as OPT,
	predicate as P,
	readonlySet as RoS,
	string as S,
	taskOption as TO,
} from 'fp-ts'
import * as Rx from 'rxjs'
import {
	batch,
	createEffect,
	onMount,
} from 'solid-js'
import {
	createStore,
	produce,
} from 'solid-js/store'

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
import { onResume } from '@/ui/core/capacitor'
import { TOAST_DELAY_MS } from '@/ui/core/constants'
import { useWindowScroll } from '@/ui/core/helpers'
import { createDispatcher } from '@/ui/core/solid-js'

const pipe = F.pipe

interface OverviewStore {
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
			by: 'date' | 'a-z'
	  }

type InternalCommand =
	| { type: '_refreshList' }
	| { type: '_showToast'; message: string }
	| {
			type: '_log'
			severity: LogSeverity
			message: string
	  }

export const useOverviewStore: () => [
	OverviewStore,
	(command: Command) => void,
] = () => {
	const context = useAppContext(AppContext)

	const [store, setStore] =
		createStore<OverviewStore>({
			offset: 0,
			sortBy: 'date',
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

	const scroll = useWindowScroll()

	createEffect(() => {
		setStore(
			produce(state => {
				state.scrollY = scroll().scrollY
				state.isScrolling = scroll().isScrolling
			}),
		)
	})

	const navigate = useNavigate()

	const dispatch = createDispatcher<
		Command | InternalCommand
	>(
		F.flow(
			Rx.mergeMap(cmd => {
				switch (cmd.type) {
					case '_refreshList':
						return pipe(
							Rx.scheduled(
								Rx.of(cmd),
								Rx.asyncScheduler,
							),
							Rx.tap(() => {
								setStore('isLoading', true)
							}),
							Rx.mergeMap(() =>
								pipe(
									context.app.productList({
										offset: store.offset,
										sortBy: store.sortBy,
									}),
									Rx.defer,
								),
							),
							Rx.tap(result => {
								if (E.isLeft(result)) {
									dispatch({
										type: '_showToast',
										message: result.left,
									})
									return
								}

								setStore(
									produce(state => {
										state.products = result.right
											.models as ProductModel[]
										state.isLoading = false
									}),
								)
							}),
							Rx.ignoreElements(),
						)
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

					case 'sortList':
						return pipe(
							Rx.of(cmd),
							Rx.tap(() => {
								setStore('sortBy', cmd.by)
							}),
							Rx.ignoreElements(),
						)
					case '_log':
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
								F.flow(
									TO.fromOption,
									TO.tapTask(() =>
										TO.fromIO(() => {
											context.showLoading(true)
										}),
									),
									TO.chain(products =>
										context.app.deleteProductsByIds(
											products,
										),
									),
									Rx.defer,
								),
							),
							Rx.tap(result => {
								context.showLoading(false)
								if (OPT.isNone(result)) {
									dispatch({
										type: '_refreshList',
									})
									dispatch({
										type: '_showToast',
										message:
											'Products deleted succesfully',
									})
									setStore(state => ({
										...state,
										selectedProducts: new Set(),
										selectMode: false,
									}))
								}
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
								setStore(state => ({
									...state,
									selectMode: false,
									selectedProducts: new Set(),
								}))
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
									setStore(
										'selectedProducts',
										RoS.toggle(S.Eq)(cmd.id),
									)
									setStore(state => ({
										...state,
										selectMode:
											state.selectedProducts
												.size > 0,
									}))
								})
							}),
							Rx.ignoreElements(),
						)
				}
			}),
		),
	)

	onMount(() => {
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
