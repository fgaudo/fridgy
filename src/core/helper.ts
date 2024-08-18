import type { ParseIssue } from '@effect/schema/ParseResult'
import { Cause, Exit } from 'effect'
import { assert } from 'vitest'

import { Eff } from '@/core/imports'

export const fallback: <A>(
	def: A,
) => (
	issue: ParseIssue,
) => Eff.Effect<A, ParseIssue> = def => issue =>
	Eff.gen(function* () {
		yield* Eff.logWarning(
			'Problem decoding',
		).pipe(Eff.annotateLogs({ issue }))
		return yield* Eff.succeed(def)
	})

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
