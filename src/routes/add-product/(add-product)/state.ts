import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

export type State = {
	isBusy: boolean
	maybeName: Option.Option<string>
	maybeExpirationDate: Option.Option<Integer.Integer>
}

export const isSubmittable = (
	state: State,
): state is State & {
	maybeName: Option.Some<NonEmptyTrimmedString.NonEmptyTrimmedString>
	isBusy: false
} => isNameValid(state) && !state.isBusy

export const isNameValid = (
	state: State,
): state is State & {
	maybeName: Option.Some<NonEmptyTrimmedString.NonEmptyTrimmedString>
} =>
	pipe(
		state.maybeName,
		Option.flatMap(NonEmptyTrimmedString.fromString),
		Option.isSome,
	)
