import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as ROE from 'fp-ts-rxjs/lib/ReaderObservableEither'
import * as E from 'fp-ts/lib/Either'
import * as Opt from 'fp-ts/lib/Option'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import { AddFood } from '../commands/add-food'
import { LogEntry, OnceInfo } from '../queries/logging'

export type FoodAddDeps = Readonly<{
	addFood: AddFood
	onceInfo: OnceInfo<FoodAddViewModel>
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

export type Fields = Readonly<{
	name: Opt.Option<string>
	expDate: Opt.Option<number>
	isBestBefore: Opt.Option<boolean>
	type: Opt.Option<string>
}>

export type FoodAddCmd = Readonly<
	| {
			_tag: 'Validate'
			data: Fields
	  }
	| { _tag: 'Add'; data: Fields }
>
export type FoodAddViewModel = Readonly<
	{ _tag: 'Loading' } | { _tag: 'Ready'; errors: Opt.Option<FieldErrors> }
>
type FoodAddReturn = FoodAddViewModel | LogEntry

type DispatchCommand = (rec: {
	validate: (fields: Fields) => ReturnType<FoodAdd>
}) => (cmd$: Rx.Observable<FoodAddCmd>) => ReturnType<FoodAdd>

const dispatchCommand: DispatchCommand =
	({ validate }) =>
	cmd$ =>
	deps =>
		pipe(
			cmd$,
			Rx.switchMap(cmd =>
				cmd._tag === 'Validate'
					? validate(cmd.data)(deps)
					: validate(cmd.data)(deps)
			)
		)

type Validate = (rec: {
	success: () => ReturnType<FoodAdd>
	error: () => ReturnType<FoodAdd>
}) => (f: Fields) => ReturnType<FoodAdd>

const validate: Validate =
	({ success, error }) =>
	fields =>
		ROE.of({ _tag: 'Loading' })

const asd = flow(
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

export type FoodAdd = (
	cmds: Rx.Observable<FoodAddCmd>
) => ROE.ReaderObservableEither<FoodAddDeps, LogEntry, FoodAddViewModel>

export const addFood: FoodAdd = flow(
	dispatchCommand({
		validate: validate({
			success: () => ROE.of({ _tag: 'Loading' }),
			error: () => ROE.of({ _tag: 'Loading' })
		})
	})
)
