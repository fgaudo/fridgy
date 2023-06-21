import * as O from 'fp-ts-rxjs/lib/Observable'
import * as E from 'fp-ts/lib/Either'
import * as Opt from 'fp-ts/lib/Option'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import { AddFood } from '../command/add-food'

export type FoodAddDeps = Readonly<{ addFood: AddFood }>

type FieldErrors = Readonly<{
	name: string
	expDate: string
	isBestBefore: string
	type: string
}>

export type FoodAddCmd = Readonly<
	{ _tag: 'Validate'; data: Partial<D.FoodData> } | { _tag: 'Add' }
>
export type FoodAddViewModel = Readonly<
	{ _tag: 'Loading' } | { _tag: 'Ready'; errors: Opt.Option<FieldErrors> }
>

type FoodAdd = (
	deps: FoodAddDeps
) => (cmds: Rx.Observable<FoodAddCmd>) => Rx.Observable<FoodAddViewModel>

export const addFood: FoodAdd = ({ addFood }) =>
	flow(
		Rx.switchMap(cmd => (cmd._tag === 'Validate' ? pipe(cmd.data) : O.of(1)))
	)

const validateType: (
	data: Partial<D.FoodData>
) => E.Either<FieldErrors, D.FoodData> = data => {}
