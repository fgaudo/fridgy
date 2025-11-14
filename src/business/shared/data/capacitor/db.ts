import { registerPlugin } from '@capacitor/core'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as H from '@/core/helper.ts'
import * as Integer from '@/core/integer/index.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

interface FridgySqlitePlugin {
	getAllProductsWithTotal(): Promise<unknown>

	addProduct(data: {
		product: {
			name: string
			creationDate: number
			expirationDate: number | undefined
		}
	}): Promise<unknown>

	deleteProductsByIds(data: { ids: readonly number[] }): Promise<unknown>
}

export class DeleteFailed extends Data.TaggedError(`DeleteFailed`) {}

export class AddProductFailed extends Data.TaggedError(`AddProductFailed`) {}

export class Db extends Effect.Service<Db>()(`data/capacitor/Db`, {
	sync: () => {
		const db = registerPlugin<FridgySqlitePlugin>(`FridgySqlitePlugin`)

		return {
			addProduct: Effect.fn(function* (...p: Parameters<typeof db.addProduct>) {
				return yield* H.tryPromise(() => db.addProduct(...p))
			}),
			deleteProductsByIds: Effect.fn(function* (
				...p: Parameters<typeof db.deleteProductsByIds>
			) {
				return yield* H.tryPromise(() => db.deleteProductsByIds(...p))
			}),
			getAllProductsWithTotal: H.tryPromise(() => db.getAllProductsWithTotal()),
		}
	},
}) {}
