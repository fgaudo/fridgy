import * as O from 'fp-ts-rxjs/lib/Observable'
import * as E from 'fp-ts/lib/Either'
import * as Opt from 'fp-ts/lib/Option'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import { AddFood } from '../commands/add-food'

export type FoodAddDeps = Readonly<{
	addFood: AddFood
	logInfo: (s: string) => Completable
}>

type FieldErrors =
	| Readonly<{
			name: string
			expDate: Opt.Option<string>
			isBestBefore: Opt.Option<string>
			type: Opt.Option<string>
	  }>
	| Readonly<{
			expDate: string
			name: Opt.Option<string>
			isBestBefore: Opt.Option<string>
			type: Opt.Option<string>
	  }>
	| Readonly<{
			isBestBefore: string
			expDate: Opt.Option<string>
			name: Opt.Option<string>
			type: Opt.Option<string>
	  }>
	| Readonly<{
			type: string
			expDate: Opt.Option<string>
			isBestBefore: Opt.Option<string>
			name: Opt.Option<string>
	  }>

export type FoodAddCmd = Readonly<
	| {
			_tag: 'Validate'
			data: {
				name: Opt.Option<string>
				expDate: Opt.Option<number>
				isBestBefore: Opt.Option<boolean>
				type: Opt.Option<string>
			}
	  }
	| { _tag: 'Add' }
>
export type FoodAddViewModel = Readonly<
	{ _tag: 'Loading' } | { _tag: 'Ready'; errors: Opt.Option<FieldErrors> }
>

type FoodAdd = (
	deps: FoodAddDeps
) => (cmds: Rx.Observable<FoodAddCmd>) => Rx.Observable<FoodAddViewModel>

export const addFood: FoodAdd = ({ addFood }) =>
	flow(
		Rx.switchMap(cmd =>
			cmd._tag === 'Validate'
				? pipe(
						cmd.data,
						O.of,
						O.map(({ name, type, expDate, isBestBefore }) =>
							Opt.isNone(type)
								? Opt.some({
										type: 'type not defined',
										name: pipe(
											name,
											Opt.fold(
												() => Opt.some('name not defined'),
												() => Opt.none
											)
										),
										expDate: pipe(
											expDate,
											Opt.fold(
												() => Opt.some('expDate not defined'),
												() => Opt.none
											)
										),
										isBestBefore: pipe(
											isBestBefore,
											Opt.fold(
												() => Opt.some('isBestBefore not defined'),
												() => Opt.none
											)
										)
								  })
								: Opt.isNone(name)
								? Opt.some({
										name,
										type: pipe(),
										expDate: Opt.fromNullable(expDate),
										isBestBefore: Opt.fromNullable(isBestBefore)
								  })
								: Opt.isNone(expDate)
								? Opt.some({
										expDate,
										type: pipe(
											Opt.fromNullable(type),
											Opt.map(a => a)
										),
										name: Opt.fromNullable(name),
										isBestBefore: Opt.fromNullable(isBestBefore)
								  })
								: Opt.isNone(D.isBestBefore)
								? Opt.some({
										isBestBefore,
										type: Opt.fromNullable(type),
										expDate: Opt.fromNullable(expDate),
										name: Opt.fromNullable(name)
								  })
								: Opt.none
						)
				  )
				: O.of(1)
		)
	)

const validateType: (
	data: Partial<D.FoodData>
) => E.Either<FieldErrors, D.FoodData> = data => {}
