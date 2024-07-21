import { useNavigate } from '@solidjs/router'
import {
	function as F,
	predicate as P,
} from 'fp-ts'
import * as Rx from 'rxjs'
import {
	createEffect,
	from,
	useContext,
} from 'solid-js'
import { createStore } from 'solid-js/store'

import type { LogType } from '@/app/contract/write/log'
import type { ProductModel } from '@/app/use-cases/product-list'

import { AppContext } from '@/ui/context'
import { useWindowScroll } from '@/ui/core/helpers'
import { useDispatcher } from '@/ui/core/solid-js'

const pipe = F.pipe
const flow = F.flow

export interface OverviewStore {
	isReady: boolean
	products: ProductModel[]
	selectMode: boolean
	isOpeningAddProduct: boolean
	isScrolling: boolean
	scrollY: number
}

export type Command =
	| {
			type: 'openAddProduct'
	  }
	| {
			type: 'toggleSelectMode'
	  }
	| {
			type: 'log'
			severity: LogType
			message: string
	  }

export const createOverviewStore: () => [
	OverviewStore,
	(command: Command) => void,
] = () => {
	const context = useContext(AppContext)!

	const model = from(context.productList.stream)

	const [store, setStore] =
		createStore<OverviewStore>({
			isReady: false,
			products: [],
			selectMode: false,
			isOpeningAddProduct: false,
			isScrolling: false,
			scrollY: window.scrollY,
		})

	const scroll = useWindowScroll()

	createEffect(() => {
		const m = model()
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
		setStore('isScrolling', scroll().isScrolling)
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
					cmd =>
						cmd.type === 'toggleSelectMode' &&
						!store.isOpeningAddProduct,
				),
				Rx.tap(cmd => {
					context.log({
						type: 'debug',
						message: `Dispatched '${cmd.type}' command`,
					})()
				}),
				Rx.tap(() => {
					setStore('selectMode', prev => !prev)
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
