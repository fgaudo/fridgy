import type {
	option as OPT,
	taskEither as TE,
} from 'fp-ts'

export interface ProductDTO {
	name: string
	expirationDate: OPT.Option<number>
	creationDate: number
}

export type AddProduct = (
	product: ProductDTO,
) => TE.TaskEither<Error, void>
