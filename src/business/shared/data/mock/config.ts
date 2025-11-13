import * as Context from 'effect/Context'

export class Config extends Context.Tag(`shared/mock/Config`)<
	Config,
	{ withErrors: boolean }
>() {}
