import * as Cause from 'effect/Cause'
import * as Exit from 'effect/Exit'
import { assert } from 'vitest'

export * as FC from 'effect/FastCheck'
export * as Arb from 'effect/Arbitrary'

export function assertExitIsFailure<A, E>(
	exit: Exit.Exit<A, E>,
): asserts exit is Exit.Failure<A, E> {
	if (Exit.isSuccess(exit)) {
		assert(false, `Exit is a success`)
	}

	if (
		Exit.isFailure(exit) &&
		(Cause.isDie(exit.cause) || Cause.isDieType(exit.cause))
	) {
		assert(false, `Exit is a Die`)
	}
}

export function assertExitIsDie<A, E>(
	exit: Exit.Exit<A, E>,
): asserts exit is Exit.Failure<A, E> {
	if (Exit.isSuccess(exit)) {
		assert(false, `Exit is a success`)
	}

	if (
		Exit.isFailure(exit) &&
		!Cause.isDie(exit.cause) &&
		!Cause.isDieType(exit.cause)
	) {
		assert(false, `Exit is not a Die`)
	}
}

export function assertExitIsSuccess<A, E>(
	exit: Exit.Exit<A, E>,
): asserts exit is Exit.Success<A, E> {
	if (Exit.isFailure(exit)) {
		assert(false, exit.cause.toString())
	}
}
