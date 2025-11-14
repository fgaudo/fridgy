import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Ref from 'effect/Ref'
import * as RequestResolver from 'effect/RequestResolver'

import * as AddProduct from '../add-product.ts'
import { Config } from './config.ts'
import { Db } from './db.ts'

export const command = Layer.effect(
	AddProduct.AddProduct,
	Effect.gen(function* () {
		const { withErrors } = yield* Config
		const db = yield* Db
		return RequestResolver.fromEffect(
			Effect.fn(function* (product) {
				if (withErrors && Math.random() < 0.5) {
					yield* Effect.logInfo(`Triggered fake error on mock AddProduct`)
					return yield* Effect.fail(undefined)
				}

				yield* Effect.log(`Attempting to add product into mock database...`)

				yield* Ref.update(db, dbValues => {
					const index = dbValues.index + 1
					const indexString = index.toString(10)
					return {
						...dbValues,
						index,
						map: dbValues.map.pipe(
							HashMap.set(indexString, {
								maybeName: Option.some(product.name),
								maybeExpirationDate: product.maybeExpirationDate,
								maybeCreationDate: Option.some(product.creationDate),
								maybeId: Option.some(indexString),
							}),
						),
					}
				})

				yield* Effect.log(`Added product ${product.name} into mock database`)

				return yield* Effect.void
			}),
		)
	}),
)
