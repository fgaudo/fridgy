import { C, Da, R, RR, Sc } from '$lib/core/imports.ts'

export class OperationFailed extends Da.TaggedError(`OperationFailed`) {}

export const DeleteProductByIdDTO = Sc.String

export type DeleteProductByIdDTO = Sc.Schema.Type<typeof DeleteProductByIdDTO>

export interface Request extends R.Request<void, OperationFailed> {
	readonly _tag: `DeleteProductById`
	readonly id: DeleteProductByIdDTO
}

export const Request = R.tagged<Request>(`DeleteProductById`)

export class Resolver extends C.Tag(`app/operations/DeleteProductByIdResolver`)<
	Resolver,
	RR.RequestResolver<Request>
>() {}
