import {
	eq as Eq,
	function as F,
	option as OPT,
	string as S,
	taskEither as TE,
} from 'fp-ts'

const pipe = F.pipe

export interface ProductDTO {
	id: string
	name: string
	expirationDate: OPT.Option<number>
	creationDate: number
}

export const ProductDTO = {
	Eq: pipe(
		S.Eq,
		Eq.contramap(
			(product: ProductDTO) => product.id,
		),
	),
	create: ({
		id,
		product,
	}: {
		id: string
		product: ProductDTO
	}) => ({ id, product }),
} as const

export type Products = TE.TaskEither<
	string,
	{
		items: readonly ProductDTO[]
		total: number
	}
>
