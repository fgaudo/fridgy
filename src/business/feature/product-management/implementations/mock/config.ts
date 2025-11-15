import * as Context from 'effect/Context'

export class Config extends Context.Tag(
	`feature/product-management/implementations/mock/config`,
)<Config, { withErrors: boolean }>() {}
