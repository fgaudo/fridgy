import * as E from 'fp-ts/Either'
import * as Eq from 'fp-ts/Eq'
import * as OPT from 'fp-ts/Option'
import * as RoS from 'fp-ts/ReadonlySet'
import { pipe } from 'fp-ts/function'

import * as RoNeS from '@/core/readonly-non-empty-set'

import {
	createFood,
	expDate,
	name,
} from '@/domain/food'

import type { AddFailure } from '@/app/commands/add-failure'
import type { EnqueueProcess } from '@/app/commands/enqueue-process'
import type { Log } from '@/app/commands/log'
import type { OnChangeProcesses } from '@/app/streams/on-change-processes'
import type { OnFoods } from '@/app/streams/on-foods'
import {
	type FoodDTO,
	foodDataEq,
} from '@/app/types/food'
import type { ProcessDTO } from '@/app/types/process'
import type { FoodModel } from '@/app/view-models/overview'

export interface UseCases<ID> {
	processes$: OnChangeProcesses<ID>
	enqueueProcess: EnqueueProcess<ID>
	foods$: OnFoods<ID>
	log: Log
	addFailure: AddFailure
}

export const toFoodEntitiesOrFilter = <ID>(
	set: ReadonlySet<FoodDTO<ID>>,
) =>
	pipe(
		set,
		RoS.filterMap(foodDataEq<ID>())(foodDTO =>
			pipe(
				createFood(foodDTO),
				E.map(food => ({
					id: foodDTO.id,
					name: name(food),
					expDate: expDate(food),
				})),
				OPT.getRight,
			),
		),
	)

export const toFoodModels = <ID>([
	foods,
	processes,
]: readonly [
	ReadonlySet<FoodDTO<ID>>,
	ReadonlySet<ProcessDTO<ID>>,
]) =>
	pipe(
		foods,
		RoS.map(
			Eq.fromEquals<FoodModel<ID>>(
				(a, b) => a.id === b.id,
			),
		)(food => ({
			...food,
			deleting: pipe(
				processes,
				RoS.filter(
					process => process.type === 'delete',
				),
				RoS.some(process =>
					pipe(
						process.ids,
						RoNeS.toReadonlySet,
						RoS.some(id => food.id === id),
					),
				),
			),
		})),
	)

export const logInfo =
	(message: string) =>
	<ID>({ log }: UseCases<ID>) =>
		log('info', message)
