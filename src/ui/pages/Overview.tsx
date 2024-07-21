import { useNavigate } from '@solidjs/router'
import {
	function as F,
	predicate as P,
} from 'fp-ts'
import * as Rx from 'rxjs'
import {
	type Component,
	For,
	Match,
	Show,
	Switch,
	createEffect,
	createRenderEffect,
	from,
	useContext,
} from 'solid-js'
import { createStore } from 'solid-js/store'

import type { ProductModel } from '@/app/use-cases/product-list'

import { AppContext } from '@/ui/context'
import { useWindowScroll } from '@/ui/core/helpers'
import { useDispatcher } from '@/ui/core/solid-js'
import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

interface Command {
	type: 'openAddProduct' | 'toggleSelectMode'
}

const flow = F.flow
const pipe = F.pipe

interface OverviewStore {
	isReady: boolean
	products: ProductModel[]
	selectMode: boolean
	isOpeningAddProduct: boolean
	isScrolling: boolean
	scrollY: number
}

const createOverviewStore: () => [
	OverviewStore,
	(command: Command) => void,
] = () => {
	const overview =
		useContext(AppContext)!.productList

	const model = from(overview.stream)

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

	const dispatch = useDispatcher<Command>(
		flow(
			Rx.observeOn(Rx.asyncScheduler),
			Rx.exhaustMap(cmd =>
				Rx.merge(
					pipe(
						Rx.of(cmd),
						Rx.filter(
							cmd =>
								cmd.type === 'toggleSelectMode' &&
								!store.isOpeningAddProduct,
						),
						Rx.tap(() => {
							console.debug(
								`Dispatched '${cmd.type}' command`,
							)
						}),
						Rx.tap(() => {
							setStore(
								'selectMode',
								prev => !prev,
							)
						}),
						Rx.ignoreElements(),
					),
					pipe(
						Rx.of(cmd),
						Rx.filter(
							cmd =>
								cmd.type === 'openAddProduct',
						),
						Rx.map(
							() => store.isOpeningAddProduct,
						),
						Rx.filter(P.not(F.identity)),
						Rx.tap(() => {
							console.debug(
								`Dispatched '${cmd.type}' command`,
							)
						}),
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
					),
				),
			),
		),
	)
	return [store, dispatch]
}

const Overview: Component = () => {
	const [store, dispatch] = createOverviewStore()

	return (
		<div class="pb-[128px] pt-[56px]">
			<SmallTopAppBar>
				<div class="font-titleLarge text-titleLarge leading-titleLarge">
					Overview
				</div>
				<md-icon-button class="ml-auto mr-[-8px]">
					<md-icon>more_vert</md-icon>
				</md-icon-button>
			</SmallTopAppBar>
			<Switch
				fallback={
					<md-circular-progress
						prop:indeterminate={true}
						class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
					/>
				}>
				<Match when={store.isReady}>
					<md-list>
						<For each={store.products}>
							{(productModel, i) => {
								createRenderEffect(() => {
									console.debug(
										`Received change for element ${i().toString(10)} \n${JSON.stringify(productModel, null, 2)}`,
									)
								})
								return (
									<>
										<Show when={i() !== 0}>
											<md-divider />
										</Show>
										<md-list-item
											prop:type="button"
											onContextMenu={e => {
												e.preventDefault()
												dispatch({
													type: 'toggleSelectMode',
												})
											}}>
											<md-icon slot="start">
												ac_unit
											</md-icon>

											<div slot="headline">
												{productModel.name}
											</div>
										</md-list-item>
									</>
								)
							}}
						</For>
						<Show
							when={store.products.length > 0}>
							<md-divider />
						</Show>
					</md-list>
				</Match>
			</Switch>

			<div
				class="fixed transition-all duration-[0.25s]"
				classList={{
					'bg-transparent bottom-[16px] right-[16px] h-[96px] w-[96px]':
						!store.isOpeningAddProduct,
					'opacity-50': store.isScrolling,
					'opacity-100': !store.isScrolling,
					'bg-surface h-screen w-screen right-0 bottom-0':
						store.isOpeningAddProduct,
				}}>
				<md-fab
					classList={{
						'opacity-0':
							store.isOpeningAddProduct,
					}}
					onClick={() => {
						dispatch({
							type: 'openAddProduct',
						})
					}}
					prop:variant="primary"
					prop:size="large">
					<md-icon slot="icon">add</md-icon>
				</md-fab>
			</div>
		</div>
	)
}

export default Overview
