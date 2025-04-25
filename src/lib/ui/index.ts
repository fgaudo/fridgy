import {
	Chunk,
	Console,
	Queue,
	pipe,
} from 'effect'

import { Eff, Q, Str } from '$lib/core/imports.ts'

import { getSortedProducts } from '$lib/business/data/mock/index.ts'
import { GetSortedProducts } from '$lib/business/index.ts'

import { StoreService } from './pages/home/internal/store.ts'

export const stream1 = pipe(
	Str.concatAll(
		Chunk.make(
			Str.make({ type: 'START' }),
			pipe(
				Str.Do,
				Str.bind(
					'getSortedProducts',
					() => GetSortedProducts.Service,
				),
				Str.bind(
					'products',
					({ getSortedProducts }) =>
						Str.fromEffect(getSortedProducts),
				),
				Str.map(({ products }) => ({
					type: 'END',
					products,
				})),
			),
		),
	),
	Str.ensuring(Eff.succeed(3)),
)
