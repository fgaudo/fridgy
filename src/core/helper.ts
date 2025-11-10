import * as Arr from 'effect/Array'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Function from 'effect/Function'
import * as ParseResult from 'effect/ParseResult'
import { type Draft, createDraft, finishDraft } from 'immer'

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

export const modify = Function.dual<
	<S extends object, C>(
		p: (draft: Draft<S>) => Arr.NonEmptyArray<C> | void,
	) => (state: S) => {
		state: S
		commands: C[]
	},
	<S extends object, C>(
		state: S,
		p: (draft: Draft<S>) => Arr.NonEmptyArray<C> | void,
	) => { state: S; commands: C[] }
>(2, (state, p) => {
	const draft = createDraft(state)

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	const commands = p(draft) ?? []

	return { state: finishDraft(draft) as typeof state, commands }
})

export const noOp = Function.dual<
	<C>(_: void) => <S>(state: S) => {
		state: S
		commands: C[]
	},
	<S, C>(state: S, _: void) => { state: S; commands: C[] }
>(2, state => {
	return { state, commands: [] }
})

export const commands = Function.dual<
	<C>(commands: Arr.NonEmptyArray<C>) => <S>(state: S) => {
		state: S
		commands: C[]
	},
	<S, C>(
		state: S,
		commands: Arr.NonEmptyArray<C>,
	) => { state: S; commands: C[] }
>(2, (state, commands) => {
	return { state, commands }
})
