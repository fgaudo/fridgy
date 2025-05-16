import { Eff, HM, Log, O, pipe } from './imports.ts'

const TAG = `_LAYER_`

export function withLayerLogging<A, B, C>(type: `A` | `P` | `I`) {
	return (eff: Eff.Effect<A, B, C>) => eff.pipe(Eff.annotateLogs(TAG, type))
}

export const withLayerLogger = Log.mapInputOptions(
	(options: Log.Logger.Options<unknown>) => ({
		...options,
		message: pipe(
			options.annotations,
			HM.get(`_LAYER_`),
			O.filter(l => typeof l === `string`),
			O.match({
				onSome: layer => `[${layer}] ${options.message as string}`,
				onNone: () => options.message,
			}),
		),
	}),
)
