import * as O from 'fp-ts-rxjs/lib/Observable'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as E from 'fp-ts/lib/Either'
import * as Opt from 'fp-ts/lib/Option'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import { Interface } from '../interfaces'

export type FoodAddDeps = Interface['log'] & Interface['onceNow']

type RequireAtLeastOne<T> = {
	[K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T]

type FieldErrors = Readonly<
	RequireAtLeastOne<{
		name: string
		expDate: string
		isBestBefore: string
		type: string
	}>
>

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

type Validate = (rec: {
	success: () => FoodAddViewModel
	error: () => FoodAddViewModel
}) => (f: Fields) => FoodAddViewModel

const validate: Validate =
	({ success, error }) =>
	fields => ({ _tag: 'Loading' })

const subject: Rx.Subject<FoodAddCmd> = new Rx.Subject<FoodAddCmd>()

export const foodAdd: RO.ReaderObservable<
	FoodAddDeps,
	FoodAddViewModel
> = deps =>
	pipe(
		subject,
		O.map(cmd => ({ _tag: 'Loading' }))
	)

export const next: (cmd: FoodAddCmd) => void = cmd => subject.next(cmd)
