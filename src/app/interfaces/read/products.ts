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
	expiration: OPT.Option<{
		date: number
		isBestBefore: boolean
	}>
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

export interface Options {
	sortBy:
		| 'expirationDate'
		| 'a-z'
		| 'creationDate'
	offset: number
}

export type Products = (
	options: Options,
) => TE.TaskEither<
	Error,
	{
		items: readonly ProductDTO[]
		total: number
	}
>
