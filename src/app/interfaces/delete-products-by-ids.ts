import { C, Eff, HS } from '@/core/imports.ts'

export class DeleteProductsByIdsService extends C.Tag(
	'DeleteProductsByIdsService',
)<
	DeleteProductsByIdsService,
	(
		ids: HS.HashSet<string>,
	) => Eff.Effect<void, void>
>() {}
