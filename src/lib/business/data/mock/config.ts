import { Eff } from '$lib/core/imports.ts'

export class Config extends Eff.Service<Config>()(
	'data/mock/Config',
	{
		accessors: true,
		succeed: {
			withErrors: false,
		},
	},
) {}
