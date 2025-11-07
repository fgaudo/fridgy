import * as FC from 'effect/FastCheck'
import { flow } from 'effect/Function'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import * as Integer from './integer/index.ts'

export const maybeInteger = FC.constantFrom(
	`some` as const,
	`none` as const,
).chain(
	flow(
		Match.value,
		Match.when(`none`, () => FC.constant(Option.none())),
		Match.when(`some`, () =>
			FC.integer().map(Integer.unsafeFromNumber).map(Option.some),
		),
		Match.exhaustive,
	),
)

export const integer = FC.integer().map(Integer.unsafeFromNumber)

export const nonBlankString = FC.stringMatching(/\S/)

export const blankString = FC.stringMatching(/^\s*$/)

export const string = FC.constantFrom(
	`blank` as const,
	`non-blank` as const,
	`empty` as const,
).chain(
	flow(
		Match.value,
		Match.when(`blank`, () => blankString),
		Match.when(`empty`, () => FC.constant(``)),
		Match.when(`non-blank`, () => nonBlankString),
		Match.exhaustive,
	),
)

export const maybeString = FC.constantFrom(
	`some` as const,
	`none` as const,
).chain(
	flow(
		Match.value,
		Match.when(`some`, () => string.map(Option.some)),
		Match.when(`none`, () => FC.constant(Option.none())),
		Match.exhaustive,
	),
)

export const stringOrUndefined = FC.constantFrom(
	`blank` as const,
	`non-blank` as const,
	`empty` as const,
	`undefined` as const,
).chain(
	flow(
		Match.value,
		Match.when(`undefined`, () => FC.constant(undefined)),
		Match.when(`blank`, () => blankString),
		Match.when(`empty`, () => FC.constant(``)),
		Match.when(`non-blank`, () => nonBlankString),
		Match.exhaustive,
	),
)

export const nonInteger = FC.constantFrom(
	`double` as const,
	`NaN` as const,
	`Infinity` as const,
	`-Infinity` as const,
).chain(
	flow(
		Match.value,
		Match.when(`-Infinity`, () => FC.constant(-Infinity)),
		Match.when(`Infinity`, () => FC.constant(Infinity)),
		Match.when(`NaN`, () => FC.constant(NaN)),
		Match.when(`double`, () =>
			FC.double({
				noDefaultInfinity: true,
				noNaN: true,
				noInteger: true,
			}),
		),
		Match.exhaustive,
	),
)

export const nonIntegerOrUndefined = FC.constantFrom(
	`double` as const,
	`NaN` as const,
	`Infinity` as const,
	`-Infinity` as const,
	`undefined` as const,
).chain(
	flow(
		Match.value,
		Match.when(`-Infinity`, () => FC.constant(-Infinity)),
		Match.when(`Infinity`, () => FC.constant(Infinity)),
		Match.when(`NaN`, () => FC.constant(NaN)),
		Match.when(`double`, () =>
			FC.double({
				noDefaultInfinity: true,
				noNaN: true,
				noInteger: true,
			}),
		),
		Match.when(`undefined`, () => FC.constant(undefined)),
		Match.exhaustive,
	),
)

export const numberOrUndefined = FC.constantFrom(
	`integer` as const,
	`double` as const,
	`NaN` as const,
	`Infinity` as const,
	`-Infinity` as const,
	`undefined` as const,
).chain(
	flow(
		Match.value,
		Match.when(`-Infinity`, () => FC.constant(-Infinity)),
		Match.when(`Infinity`, () => FC.constant(-Infinity)),
		Match.when(`NaN`, () => FC.constant(NaN)),
		Match.when(`double`, () =>
			FC.double({
				noDefaultInfinity: true,
				noNaN: true,
				noInteger: true,
			}),
		),
		Match.when(`integer`, () => FC.integer()),
		Match.when(`undefined`, () => FC.constant(undefined)),
		Match.exhaustive,
	),
)
