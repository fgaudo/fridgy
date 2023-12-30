import { reader as R, readonlySet as RoS, taskEither as TE } from 'fp-ts'
import { observable as O, readerObservable as RO } from 'fp-ts-rxjs'
import { fromIO } from 'fp-ts-rxjs/lib/Observable'
import { flow, pipe } from 'fp-ts/function'
import { isLeft } from 'fp-ts/lib/Either'
import { none, some } from 'fp-ts/lib/Option'
import { trivial } from 'fp-ts/lib/Ord'
import { Observable, ignoreElements, merge, startWith } from 'rxjs'

import { Controller } from '@/core/controller'

import { Eq, Food } from '@/domain/food'

import { DeleteFoodsByIds } from '@/app/commands/delete-foods-by-ids'
import { Foods, toFoodEntity } from '@/app/commands/foods'
import { Log, LogType } from '@/app/commands/log'

import { addFailure } from '../commands/errors'

interface Deps {
	readonly deleteFoodsByIds: DeleteFoodsByIds
	readonly foods: Foods
	readonly log: Log
}

export type OverviewModel = Readonly<
	| {
			type: 'ready'
			foods: Food[]
	  }
	| { type: 'loading' }
>

export type Command = Readonly<{ type: 'delete'; ids: ReadonlySet<string> }>

export type OverviewController = Controller<Command, OverviewModel>

export const overview: R.Reader<Deps, OverviewController> = pipe(
	[
		pipe(
			R.asks((deps: Deps) => deps.foods),
			RO.chainFirst(foods => info(`Received ${foods.size} food entries`)),
			RO.map(RoS.map(Eq)(toFoodEntity)),
			RO.map(RoS.toReadonlyArray(trivial)),
			RO.map(foods => ({ foods, type: 'ready' }) as OverviewModel),
			R.map(startWith({ type: 'loading' } as OverviewModel))
		),
		(command$: Observable<Command>) =>
			pipe(
				R.of(command$),
				RO.apFirst(info(`Received delete command`)),
				RO.map(del => del.ids),
				RO.chain(ids =>
					flow(
						TE.of,
						TE.chain(deps => deps.deleteFoodsByIds(ids)),
						O.fromTask
					)
				),
				RO.apFirst(info(`Delete command executed`)),
				RO.filterMap(either => (isLeft(either) ? some(either.left) : none)),
				RO.chainFirst(err => error(`Delete command failed: ${err.message}`)),
				RO.chain(err =>
					pipe(
						() => {
							addFailure({ name: err.name, message: err.message })
						},
						fromIO,
						ignoreElements
					)
				)
			)
	] as const,

	streams => deps =>
		new Controller(
			command => merge(streams[0](deps), streams[1](command)(deps)),
			{ type: 'loading' } as const
		)
)

const info = (message: string) => (deps: Deps) =>
	pipe(deps.log(LogType.info, message), O.fromIO)

const error = (message: string) => (deps: Deps) =>
	pipe(deps.log(LogType.error, message), O.fromIO)
