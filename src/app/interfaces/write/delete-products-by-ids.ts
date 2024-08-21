import { B, C, Eff, HS } from '@/core/imports'

export class DeleteProductsByIdsService extends C.Tag(
	'DeleteProductsByIdsService',
)<
	DeleteProductsByIdsService,
	(
		ids: HS.HashSet<string>,
	) => Eff.Effect<
		void,
		DeleteProductsByIdsServiceError
	>
>() {}

export type DeleteProductsByIdsServiceError =
	string &
		B.Brand<'DeleteProductsByIdsServiceError'>

export const DeleteProductsByIdsServiceError =
	B.nominal<DeleteProductsByIdsServiceError>()
