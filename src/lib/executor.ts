import * as Effect from 'effect/Effect'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Runtime from 'effect/Runtime'

const symbol: unique symbol = Symbol()

export type Executor<R> = {
	runCallback: <A, E>(
		effect: Effect.Effect<A, E, R>,
		onSucceed?: (a: A) => void,
	) => Runtime.Cancel<A, E>
	runSync: <A, E>(effect: Effect.Effect<A, E, R>) => A
} & { readonly _id: typeof symbol }

export const makeExecutor: <R>(
	parm: ManagedRuntime.ManagedRuntime<R, never>,
) => Executor<R> = runtime => ({
	runCallback: (effect, onSucceed) =>
		runtime.runCallback(effect, {
			onExit: exit => {
				if (exit._op === `Success`) {
					onSucceed?.(exit.value)
					return
				}
			},
		}),

	runSync: effect => runtime.runSync(effect),

	_id: symbol,
})
