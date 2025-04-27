import { Eff } from '$lib/core/imports.ts'

export class Config extends Eff.Service<Config>()(
	'ui/Home/Config',
	{
		accessors: true,
		succeed: {
			refreshIntervalMs: 20000,
		},
	},
) {}
