import { fc } from '@fast-check/vitest'
import { Cause, Exit, flow } from 'effect'
import { assert } from 'vitest'

import { M, O } from './imports'
import { unsafe_fromNumber } from './integer'
import { unsafe_fromString } from './non-empty-trimmed-string'

export function assertExitIsFailure<A, E>(
	exit: Exit.Exit<A, E>,
): asserts exit is Exit.Failure<A, E> {
	if (Exit.isSuccess(exit)) {
		assert(false, 'Exit is a success')
	}

	if (
		Exit.isFailure(exit) &&
		(Cause.isDie(exit.cause) ||
			Cause.isDieType(exit.cause))
	) {
		assert(false, exit.cause.toString())
	}
}

export function assertExitIsSuccess<A, E>(
	exit: Exit.Exit<A, E>,
): asserts exit is Exit.Success<A, E> {
	if (Exit.isFailure(exit)) {
		assert(false, exit.cause.toString())
	}
}

export const maybeInteger = fc
	.constantFrom('some' as const, 'none' as const)
	.chain(
		flow(
			M.value,
			M.when('none', () => fc.constant(O.none())),
			M.when('some', () =>
				fc
					.integer()
					.map(unsafe_fromNumber)
					.map(O.some),
			),
			M.exhaustive,
		),
	)

export const integer = fc
	.integer()
	.map(unsafe_fromNumber)

export const nonBlankString =
	fc.stringMatching(/\S/)

export const blankString =
	fc.stringMatching(/^\s*$/)

export const string = fc
	.constantFrom(
		'blank' as const,
		'non-blank' as const,
		'empty' as const,
	)
	.chain(
		flow(
			M.value,
			M.when('blank', () => blankString),
			M.when('empty', () => fc.constant('')),
			M.when('non-blank', () => nonBlankString),
			M.exhaustive,
		),
	)

export const maybeString = fc
	.constantFrom('some' as const, 'none' as const)
	.chain(
		flow(
			M.value,
			M.when('some', () => string.map(O.some)),
			M.when('none', () => fc.constant(O.none())),
			M.exhaustive,
		),
	)

export const nonEmptyTrimmedString =
	nonBlankString.map(unsafe_fromString)

export const maybeNonEmptyTrimmedString = fc
	.constantFrom('some' as const, 'none' as const)
	.chain(
		flow(
			M.value,
			M.when('some', () =>
				nonEmptyTrimmedString.map(O.some),
			),
			M.when('none', () => fc.constant(O.none())),
			M.exhaustive,
		),
	)

export const stringOrUndefined = fc
	.constantFrom(
		'blank' as const,
		'non-blank' as const,
		'empty' as const,
		'undefined' as const,
	)
	.chain(
		flow(
			M.value,
			M.when('undefined', () =>
				fc.constant(undefined),
			),
			M.when('blank', () => blankString),
			M.when('empty', () => fc.constant('')),
			M.when('non-blank', () => nonBlankString),
			M.exhaustive,
		),
	)

export const nonInteger = fc
	.constantFrom(
		'double' as const,
		'NaN' as const,
		'Infinity' as const,
		'-Infinity' as const,
	)
	.chain(
		flow(
			M.value,
			M.when('-Infinity', () =>
				fc.constant(-Infinity),
			),
			M.when('Infinity', () =>
				fc.constant(Infinity),
			),
			M.when('NaN', () => fc.constant(NaN)),
			M.when('double', () =>
				fc.double({
					noDefaultInfinity: true,
					noNaN: true,
					noInteger: true,
				}),
			),
			M.exhaustive,
		),
	)

export const nonIntegerOrUndefined = fc
	.constantFrom(
		'double' as const,
		'NaN' as const,
		'Infinity' as const,
		'-Infinity' as const,
		'undefined' as const,
	)
	.chain(
		flow(
			M.value,
			M.when('-Infinity', () =>
				fc.constant(-Infinity),
			),
			M.when('Infinity', () =>
				fc.constant(Infinity),
			),
			M.when('NaN', () => fc.constant(NaN)),
			M.when('double', () =>
				fc.double({
					noDefaultInfinity: true,
					noNaN: true,
					noInteger: true,
				}),
			),
			M.when('undefined', () =>
				fc.constant(undefined),
			),
			M.exhaustive,
		),
	)

export const numberOrUndefined = fc
	.constantFrom(
		'integer' as const,
		'double' as const,
		'NaN' as const,
		'Infinity' as const,
		'-Infinity' as const,
		'undefined' as const,
	)
	.chain(
		flow(
			M.value,
			M.when('-Infinity', () =>
				fc.constant(-Infinity),
			),
			M.when('Infinity', () =>
				fc.constant(-Infinity),
			),
			M.when('NaN', () => fc.constant(NaN)),
			M.when('double', () =>
				fc.double({
					noDefaultInfinity: true,
					noNaN: true,
					noInteger: true,
				}),
			),
			M.when('integer', () => fc.integer()),
			M.when('undefined', () =>
				fc.constant(undefined),
			),
			M.exhaustive,
		),
	)
