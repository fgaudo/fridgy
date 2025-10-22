import * as Effect from 'effect/Effect'
import * as Function from 'effect/Function'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Logger from 'effect/Logger'
import * as Option from 'effect/Option'

const TAG = `_LAYER_`

type Type = `A` | `P` | `I`
export const withLayerLogging = Function.dual<
	(
		type: Type,
	) => <A, B, C>(that: Effect.Effect<A, B, C>) => Effect.Effect<A, B, C>,
	<A, B, C>(eff: Effect.Effect<A, B, C>, type: Type) => Effect.Effect<A, B, C>
>(2, (eff, type) => Effect.annotateLogs(eff, TAG, type))

export const withLayerLogger = Logger.mapInputOptions(
	(options: Logger.Logger.Options<unknown>) => ({
		...options,
		message: pipe(
			options.annotations,
			HashMap.get(`_LAYER_`),
			Option.filter(l => typeof l === `string`),
			Option.match({
				onSome: layer => `[${layer}] ${options.message as string}`,
				onNone: () => options.message,
			}),
		),
	}),
)
