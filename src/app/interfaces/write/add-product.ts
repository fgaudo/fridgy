import type {
	option as OPT,
	taskEither as TE,
} from 'fp-ts'

export interface ProductDTO {
	id: string
	name: string
	expiration: OPT.Option<{
		date: number
		isBestBefore: boolean
	}>
}

export type AddProduct = (
	product: ProductDTO,
) => TE.TaskEither<Error, void>
