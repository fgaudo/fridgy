import { C, Da, NEHS, R, RR, Sc } from '$lib/core/imports.ts'

export class OperationFailed extends Da.TaggedError(`OperationFailed`) {}

export const DeleteProductsByIdsDTO = Sc.fromBrand(
	NEHS.NonEmptyHashSet<string>(),
)(Sc.HashSet(Sc.String))

export type DeleteProductsByIdsDTO = Sc.Schema.Type<
	typeof DeleteProductsByIdsDTO
>

interface Request extends R.Request<void, OperationFailed> {
	readonly _tag: `DeleteProductsByIds`
	readonly ids: DeleteProductsByIdsDTO
}

export const Request = R.tagged<Request>(`DeleteProductsByIds`)

export class Resolver extends C.Tag(
	`app/operations/DeleteProductsByIdsResolver`,
)<Resolver, RR.RequestResolver<Request>>() {}
