import {
	function as F,
	ord as Ord,
	readerTask as RT,
	readerTaskEither as RTE,
	readonlyNonEmptyArray as RoNeA,
} from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'

import * as RoNeS from '@/core/readonly-non-empty-set'

import type { Log } from '@/app/interfaces/write/log'
import type { DeleteProductsByIds } from '@/app/use-cases/delete-products-by-ids'

import { decodeData } from '../common'
import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin'

interface Deps {
	db: FridgySqlitePlugin
	log: Log
}

const flow = F.flow

export const resultCodec = t.union([
	t.type({
		_tag: t.literal('Right'),
		right: t.undefined,
	}),
	t.type({
		_tag: t.literal('Left'),
		left: t.string,
	}),
])

export const fallbackResultCodec = withFallback(
	t.union([
		t.type({
			_tag: t.literal('Right'),
			right: withFallback(t.undefined, undefined),
		}),
		t.type({
			_tag: t.literal('Left'),
			left: withFallback(
				t.string,
				'Unknown error',
			),
		}),
	]),
	{ _tag: 'Left', left: 'Error while decoding' },
)

const deleteProductsByIdsCommand =
	(ids: readonly number[]) =>
	(deps: Deps) =>
	() =>
		deps.db.deleteProductsByIds({ ids })

export const deleteProductsByIds: (
	deps: Deps,
) => DeleteProductsByIds = F.flip(
	flow(
		RT.of,
		RT.bind(
			'ids',
			flow(
				RoNeS.toReadonlyNonEmptyArray<string>(
					Ord.trivial,
				),
				RoNeA.map(id => parseInt(id, 10)),
				RT.of,
			),
		),
		RT.chain(({ ids }) =>
			deleteProductsByIdsCommand(ids),
		),
		RT.chain(
			flow(
				decodeData(
					resultCodec,
					fallbackResultCodec,
				),
				RTE.local((deps: Deps) => deps.log),
			),
		),
		RTE.chainW(RTE.fromEither),
	),
)
