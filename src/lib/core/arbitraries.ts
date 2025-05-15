import * as FC from 'effect/FastCheck'

import { Int, M, O, flow } from './imports.ts'

export const maybeInteger = FC.constantFrom(
	`some` as const,
	`none` as const,
).chain(
	flow(
		M.value,
		M.when(`none`, () => FC.constant(O.none())),
		M.when(`some`, () => FC.integer().map(Int.unsafeFromNumber).map(O.some)),
		M.exhaustive,
	),
)

export const integer = FC.integer().map(Int.unsafeFromNumber)

export const nonBlankString = FC.stringMatching(/\S/)

export const blankString = FC.stringMatching(/^\s*$/)

export const string = FC.constantFrom(
	`blank` as const,
	`non-blank` as const,
	`empty` as const,
).chain(
	flow(
		M.value,
		M.when(`blank`, () => blankString),
		M.when(`empty`, () => FC.constant(``)),
		M.when(`non-blank`, () => nonBlankString),
		M.exhaustive,
	),
)

export const maybeString = FC.constantFrom(
	`some` as const,
	`none` as const,
).chain(
	flow(
		M.value,
		M.when(`some`, () => string.map(O.some)),
		M.when(`none`, () => FC.constant(O.none())),
		M.exhaustive,
	),
)

export const stringOrUndefined = FC.constantFrom(
	`blank` as const,
	`non-blank` as const,
	`empty` as const,
	`undefined` as const,
).chain(
	flow(
		M.value,
		M.when(`undefined`, () => FC.constant(undefined)),
		M.when(`blank`, () => blankString),
		M.when(`empty`, () => FC.constant(``)),
		M.when(`non-blank`, () => nonBlankString),
		M.exhaustive,
	),
)

export const nonInteger = FC.constantFrom(
	`double` as const,
	`NaN` as const,
	`Infinity` as const,
	`-Infinity` as const,
).chain(
	flow(
		M.value,
		M.when(`-Infinity`, () => FC.constant(-Infinity)),
		M.when(`Infinity`, () => FC.constant(Infinity)),
		M.when(`NaN`, () => FC.constant(NaN)),
		M.when(`double`, () =>
			FC.double({
				noDefaultInfinity: true,
				noNaN: true,
				noInteger: true,
			}),
		),
		M.exhaustive,
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
		M.value,
		M.when(`-Infinity`, () => FC.constant(-Infinity)),
		M.when(`Infinity`, () => FC.constant(Infinity)),
		M.when(`NaN`, () => FC.constant(NaN)),
		M.when(`double`, () =>
			FC.double({
				noDefaultInfinity: true,
				noNaN: true,
				noInteger: true,
			}),
		),
		M.when(`undefined`, () => FC.constant(undefined)),
		M.exhaustive,
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
		M.value,
		M.when(`-Infinity`, () => FC.constant(-Infinity)),
		M.when(`Infinity`, () => FC.constant(-Infinity)),
		M.when(`NaN`, () => FC.constant(NaN)),
		M.when(`double`, () =>
			FC.double({
				noDefaultInfinity: true,
				noNaN: true,
				noInteger: true,
			}),
		),
		M.when(`integer`, () => FC.integer()),
		M.when(`undefined`, () => FC.constant(undefined)),
		M.exhaustive,
	),
)
