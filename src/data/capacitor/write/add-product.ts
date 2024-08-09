import { Sc } from '@/core/imports'

export const addProductSchema = Sc.Union(
	Sc.Struct({
		_tag: Sc.Literal('Right'),
		right: Sc.optional(Sc.Undefined),
	}),
	Sc.Struct({
		_tag: Sc.Literal('Left'),
		left: Sc.String,
	}),
)

export const addProduct = F.flip(
	flow(
		RT.of,
		RT.bindTo('product'),
		RT.chain(({ product }) =>
			addProductCommand({
				name: product.name,
				creationDate: product.creationDate,
				...(OPT.isSome(product.expirationDate)
					? {
							expirationDate:
								product.expirationDate.value,
						}
					: {}),
			}),
		),
		RT.chain(
			flow(
				decodeData(
					addProductSchema,
					fallbackResultCodec,
				),
				RTE.local((deps: Deps) => deps.log),
			),
		),
		RTE.chainW(RTE.fromEither),
	),
)
