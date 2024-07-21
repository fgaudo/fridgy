import { useNavigate } from '@solidjs/router'
import {
	function as F,
	predicate as P,
	readonlySet as RoS,
} from 'fp-ts'
import { fromReadonlyArray } from 'fp-ts/lib/ReadonlySet'
import * as Rx from 'rxjs'
import {
	batch,
	createEffect,
	from,
	useContext,
} from 'solid-js'
import {
	createStore,
	produce,
} from 'solid-js/store'

import { Base64 } from '@/core/base64'

import type { LogType } from '@/app/contract/write/log'
import type { ProductModel } from '@/app/use-cases/product-list'

import { AppContext } from '@/ui/context'
import { useWindowScroll } from '@/ui/core/helpers'
import { useDispatcher } from '@/ui/core/solid-js'

const pipe = F.pipe
const flow = F.flow

export interface OverviewStore {
	isMenuOpen: boolean
	isReady: boolean
	products: ProductModel[]
	selectMode: boolean
	selectedProducts: ReadonlySet<
		ProductModel['id']
	>
	isOpeningAddProduct: boolean
	isScrolling: boolean
	scrollY: number
}

export type Command =
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
			severity: LogType
			message: string
	  }

export const useOverviewStore: () => [
	OverviewStore,
	(command: Command) => void,
] = () => {
	const context = useContext(AppContext)!

	const model = from(context.productList.stream)

	const [store, setStore] =
		createStore<OverviewStore>({
			isMenuOpen: false,
			isReady: false,
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
				'isReady',
				m === undefined || m.type === 'loading'
					? false
					: true,
			)
			setStore(
				'products',
				m !== undefined && m.type === 'ready'
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

	const dispatch = useDispatcher<Command>(cmd =>
		Rx.merge(
			pipe(
				cmd,
				Rx.observeOn(Rx.asyncScheduler),
				Rx.filter(cmd => cmd.type === 'log'),
				Rx.tap(cmd => {
					context.log({
						type: cmd.severity,
						message: cmd.message,
					})()
				}),
				Rx.ignoreElements(),
			),
			pipe(
				cmd,
				Rx.observeOn(Rx.asyncScheduler),
				Rx.filter(
					cmd => cmd.type === 'toggleMenu',
				),
				Rx.tap(cmd => {
					setStore(
						'isMenuOpen',
						!store.isMenuOpen,
					)
				}),
				Rx.ignoreElements(),
			),
			pipe(
				cmd,
				Rx.observeOn(Rx.asyncScheduler),
				Rx.filter(
					cmd => cmd.type === 'toggleItem',
				),
				Rx.tap(cmd => {
					batch(() => {
						if (!store.selectMode) {
							setStore('selectMode', true)
						}
						setStore(
							'selectedProducts',
							RoS.toggle(Base64.Eq)(cmd.id),
						)
						if (
							store.selectedProducts.size === 0
						) {
							setStore('selectMode', false)
						}
					})
				}),
				Rx.ignoreElements(),
			),
			pipe(
				cmd,
				Rx.observeOn(Rx.asyncScheduler),
				Rx.filter(
					cmd =>
						cmd.type === 'disableSelectMode' &&
						!store.isOpeningAddProduct,
				),
				Rx.tap(cmd => {
					context.log({
						type: 'debug',
						message: `Dispatched '${cmd.type}' command`,
					})()
				}),
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
			),
			pipe(
				cmd,
				Rx.observeOn(Rx.asyncScheduler),
				Rx.filter(
					cmd => cmd.type === 'openAddProduct',
				),
				Rx.tap(cmd => {
					context.log({
						message: `Dispatched '${cmd.type}' command`,
						type: 'debug',
					})()
				}),
				Rx.map(() => store.isOpeningAddProduct),
				Rx.filter(P.not(F.identity)),

				Rx.tap(() => {
					setStore('isOpeningAddProduct', true)
				}),
				Rx.delay(250),
				Rx.tap(() => {
					navigate('/add-product')
				}),
				Rx.ignoreElements(),
			),
		),
	)

	return [store, dispatch]
}
