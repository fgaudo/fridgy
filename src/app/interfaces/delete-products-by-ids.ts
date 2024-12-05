import { C, Eff, NEHS } from '@/core/imports.ts'

export class DeleteProductsByIdsService extends C.Tag(
	'DeleteProductsByIdsService',
)<
	DeleteProductsByIdsService,
	(
		ids: NEHS.NonEmptyHashSet<string>,
	) => Eff.Effect<void, void>
>() {}
