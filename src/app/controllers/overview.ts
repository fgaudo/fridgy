import { reader as R, taskEither as TE } from 'fp-ts'
import { observable as O, readerObservable as RO } from 'fp-ts-rxjs'
import { flow, pipe } from 'fp-ts/function'
import { none, some } from 'fp-ts/lib/Option'
import { Observable, merge, startWith } from 'rxjs'

import { Controller } from '@/core/controller'

import { Food } from '@/domain/food'

import { DeleteFoodsByIds } from '@/app/commands/delete-foods-by-ids'
import { Foods, toFoodEntity } from '@/app/commands/foods'
import { Log, LogType } from '@/app/commands/log'

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
	| { type: 'error'; message: string }
>

export type Command = Readonly<{ type: 'delete'; ids: ReadonlySet<string> }>

export type OverviewController = Controller<Command, OverviewModel>

export const overview: R.Reader<Deps, OverviewController> = pipe(
	[
		pipe(
			R.asks((deps: Deps) => deps.foods),
			RO.chainFirst(foods => info(`Received ${foods.length} food entries`)),
			RO.map(toFoodEntity),
			RO.map(foods => ({ foods }) as OverviewModel),
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
				RO.filterMap(either =>
					either._tag === 'Left' ? some(either.left) : none
				),
				RO.chainFirst(err => error(`Delete command failed: ${err.message}`)),
				RO.map(error => ({ message: error.message }) as OverviewModel)
			)
	] as const,

	streams => deps =>
		new Controller(command =>
			merge(streams[0](deps), streams[1](command)(deps))
		)
)

const info = (message: string) => (deps: Deps) =>
	pipe(deps.log(LogType.info, message), O.fromIO)

const error = (message: string) => (deps: Deps) =>
	pipe(deps.log(LogType.error, message), O.fromIO)
