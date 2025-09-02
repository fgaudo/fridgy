import * as Effect from 'effect/Effect'

export class Config extends Effect.Service<Config>()(`data/mock/Config`, {
	accessors: true,
	succeed: {
		withErrors: false as boolean,
	},
}) {}
