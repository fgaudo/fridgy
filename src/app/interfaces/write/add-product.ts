import type {
	option as OPT,
	taskEither as TE,
} from 'fp-ts'

export interface ProductDTO {
	name: string
	expiration: OPT.Option<{
		date: number
		isBestBefore: boolean
	}>
	creationDate: number
}

export type AddProduct = (
	product: ProductDTO,
) => TE.TaskEither<Error, void>
