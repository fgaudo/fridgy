import { Context } from 'effect'
import type * as Eff from 'effect/Effect'
import type * as OPT from 'effect/Option'

import { B } from '@/core/imports'
import type { Integer } from '@/core/integer'
import type { NonEmptyTrimmedString } from '@/core/non-empty-trimmed-string'

export interface AddProductDTO {
	name: NonEmptyTrimmedString
	expirationDate: OPT.Option<Integer>
	creationDate: Integer
}

export class AddProductService extends Context.Tag(
	'AddProductService',
)<
	AddProductService,
	(
		product: AddProductDTO,
	) => Eff.Effect<void, AddProductServiceError>
>() {}

export type AddProductServiceError = string &
	B.Brand<'AddProductServiceError'>

export const AddProductServiceError =
	B.nominal<AddProductServiceError>()
