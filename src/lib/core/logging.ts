import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Logger from 'effect/Logger'
import * as Option from 'effect/Option'

const TAG = `_LAYER_`

export function withLayerLogging<A, B, C>(type: `A` | `P` | `I`) {
	return (eff: Effect.Effect<A, B, C>) =>
		eff.pipe(Effect.annotateLogs(TAG, type))
}

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
