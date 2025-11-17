import * as Context from 'effect/Context'

export class Service extends Context.Tag(
	`feature/product-management/implementations/mock/config`,
)<Service, { withErrors: boolean }>() {}
