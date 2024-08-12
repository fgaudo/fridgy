import type { context } from 'effect/Layer'
import { onMount } from 'solid-js'
import * as SS from 'solid-js/store'

import {
	C,
	E,
	Eff,
	GB,
	HS,
	M,
	S,
	Str,
	flow,
	pipe,
} from '@/core/imports'

import type { App } from '@/app'
import type { ProductModel } from '@/app/use-cases/get-sorted-products'

import { onResume } from '@/ui/core/capacitor'
import { DEFAULT_FADE_MS } from '@/ui/core/constants'
import * as H from '@/ui/core/helpers'
import { useQueue } from '@/ui/core/solid-js'

export interface State {
	total: number
	toastMessage: string
	products: ProductModel[]
	isLoading: boolean
	selectedProducts: HS.HashSet<string>
}

export class ContextService extends C.Tag(
	'ContextService',
)<ContextService, App>() {}

export type Command =
	| { type: 'refreshList' }
	| { type: 'deleteProducts' }
	| {
			type: 'clearSelectedProducts'
	  }
	| { type: 'toggleItem'; id: string }

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
			selectedProducts: HS.empty(),
		},
	)

	const dispatch = useQueue<
		State,
		Command | InternalCommand
	>(
		setState,
		flow(
			Str.groupByKey(command => command.type),
			GB.evaluate((key, stream$) =>
				pipe(
					M.value(key),
					M.when('refreshList', type =>
						pipe(
							stream$,
							Str.map(
								cmd =>
									cmd as Extract<
										Command,
										{ type: typeof type }
									>,
							),
							handleRefreshList,
						),
					),
					M.when('clearSelectedProducts', type =>
						pipe(
							stream$,
							Str.map(
								cmd =>
									cmd as Extract<
										Command,
										{ type: typeof type }
									>,
							),
							handleClearSelectedProducts,
						),
					),

					M.when('toggleItem', type =>
						pipe(
							stream$,
							Str.map(
								cmd =>
									cmd as Extract<
										Command,
										{ type: typeof type }
									>,
							),
							handleToggleItem,
						),
					),
					M.when('_showToast', () =>
						stream$.pipe(
							Str.map(
								() =>
									({
										cmds: [
											{
												type: '_showToast',
												message: '',
											},
										],
									}) as const,
							),
						),
					),
					M.when('deleteProducts', () =>
						stream$.pipe(
							Str.map(
								() =>
									({
										cmds: [
											{
												type: '_showToast',
												message: '',
											},
										],
									}) as const,
							),
						),
					),
					M.exhaustive,
				),
			),
			Str.provideContext(
				C.make(ContextService, context),
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
	stream: Str.Stream<
		Extract<Command, { type: 'refreshList' }>,
		never,
		ContextService
	>,
) {
	return pipe(
		stream,
		Str.flatMap(
			() =>
				pipe(
					Str.contextWithEffect(
						(c: C.Context<ContextService>) =>
							c.pipe(C.get(ContextService))
								.productList,
					),
					Str.either,
					Str.map(
						E.match({
							onLeft: error =>
								({
									cmds: [
										{
											type: '_showToast',
											message: error,
										},
									],
								}) as const,
							onRight: result =>
								({
									mutation: (s: State) => ({
										...s,
										products: SS.reconcile(
											Array.from(result.models),
											{ key: 'id' },
										)(s.products),
										total: result.total,
										isLoading: false,
									}),
								}) as const,
						}),
					),
				),
			{
				concurrency: 1,
				switch: true,
			},
		),
	)
}

function handleClearSelectedProducts(
	stream$: Str.Stream<
		Extract<
			Command,
			{ type: 'clearSelectedProducts' }
		>,
		never,
		ContextService
	>,
) {
	return pipe(
		stream$,
		Str.map(
			() =>
				({
					mutation: (state: State) => ({
						...state,
						selectedProducts: HS.empty(),
					}),
				}) as const,
		),
	)
}

function handleToggleItem(
	stream$: Str.Stream<
		Extract<Command, { type: 'toggleItem' }>,
		never,
		ContextService
	>,
) {
	return pipe(
		stream$,
		Str.map(
			cmd =>
				({
					mutation: (state: State) => ({
						...state,
						selectedProducts: HS.toggle(cmd.id)(
							state.selectedProducts,
						),

						selectMode:
							HS.has(cmd.id)(
								state.selectedProducts,
							) &&
							HS.size(state.selectedProducts) <= 1
								? false
								: true,
					}),
				}) as const,
		),
	)
}

function handleDeleteProducts(
	stream$: Str.Stream<
		Extract<Command, { type: 'deleteProducts' }>,
		never,
		ContextService
	>,
) {
	return pipe(
		stream$,
		Str.bind('selected', () =>
			Str.contextWith(
				(context: C.Context<ContextService>) =>
					C.get(context, ContextService).state
						.selectedProducts,
			),
		),
		Str.flatMap(vars =>
			HS.size(vars.selected) <= 0
				? Str.fail('No products selected')
				: Str.succeed(vars),
		),
		Str.tap(({ selected }) =>
			pipe(
				Eff.sleep(DEFAULT_FADE_MS),
				Eff.andThen(
					Eff.contextWithEffect(
						(
							context: C.Context<ContextService>,
						) =>
							C.get(
								context,
								ContextService,
							).context.deleteProductsByIds(
								selected,
							),
					),
				),
				Eff.tapError(error =>
					Eff.logError(error).pipe(
						Eff.annotateLogs({ selected }),
					),
				),
				Eff.mapError(
					() =>
						'There was a problem deleting the products',
				),
			),
		),
		Str.either,
		Str.mapEffect(
			E.match({
				onLeft: () =>
					Eff.succeed({
						cmds: [
							{
								type: '_showToast',
								message:
									'There was a problem deleting the products',
							},
						],
					} as const),
				onRight: ({ selected }) =>
					pipe(
						Eff.succeed({
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
									message: `${HS.size(selected).toString(10)} Products deleted`,
								},
							],
						} as const),
					),
			}),
		),
	)
}
