import { Context } from 'effect'
import type * as Eff from 'effect/Effect'
import type * as OPT from 'effect/Option'

export interface AddProductDTO {
	name: string
	expirationDate: OPT.Option<number>
	creationDate: number
}

export class AddProductService extends Context.Tag(
	'AddProductService',
)<
	AddProductService,
	(
		product: AddProductDTO,
	) => Eff.Effect<void, string>
>() {}
