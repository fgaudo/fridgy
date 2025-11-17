import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as ParseResult from 'effect/ParseResult'

export const fallback: <A>(
	def: A,
) => (
	issue: ParseResult.ParseIssue,
) => Effect.Effect<A, ParseResult.ParseIssue> = def =>
	Effect.fn(() => Effect.succeed(def))

export const tryPromise = <A>(
	evaluate: (signal?: AbortSignal) => PromiseLike<A>,
): Effect.Effect<A, Cause.UnknownException> =>
	Effect.async((resolve, signal) => {
		evaluate(signal).then(
			a => {
				resolve(Exit.succeed(a))
			},
			(e: unknown) => {
				resolve(Exit.fail(new Cause.UnknownException(e)))
			},
		)
	})

// Zero clue how the following works. Thanks, AI.

export type MapTags<
	T extends { _tag: keyof M },
	M extends Record<symbol, string>,
> = T extends { _tag: infer K }
	? K extends keyof M
		? Omit<T, `_tag`> & { _tag: M[K] }
		: never
	: never

export function mapFunctionReturn<F extends (...args: any[]) => any, R>(
	fn: F,
	mapper: (value: ReturnType<F>) => R,
): (...args: Parameters<F>) => R {
	return (...args: Parameters<F>) => mapper(fn(...args))
}
