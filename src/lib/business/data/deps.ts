import { Eff, pipe } from '$lib/core/imports.ts'

export class Deps extends Eff.Service<Deps>()(
	'data/Deps',
	{
		succeed: {
			log: (
				...args: Parameters<
					typeof Eff.logWithLevel
				>
			) =>
				pipe(
					Eff.logWithLevel(...args),
					Eff.annotateLogs('_LAYER_', 'I'),
				),
		},
	},
) {}
