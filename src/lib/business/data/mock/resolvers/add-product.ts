/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Eff, HM, L, O, RR, Ref, pipe } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { AddProduct } from '$lib/business/app/operations.ts'

import { Config } from '../config.ts'
import { Db } from '../db.ts'

export const command = L.effect(
	AddProduct.Resolver,
	Eff.gen(function* () {
		const withErrors = yield* Config.withErrors
		const db = yield* Db
		return RR.fromEffect(product =>
			pipe(
				Eff.gen(function* () {
					if (withErrors && Math.random() < 0.5) {
						yield* Eff.logInfo(`Triggered fake error on mock AddProduct`)
						return yield* Eff.fail(new AddProduct.OperationFailed())
					}

					yield* Eff.log(`Attempting to add product into mock database...`)

					yield* Ref.update(db, dbValues => {
						const index = dbValues.index + 1
						const indexString = index.toString(10)
						return {
							...dbValues,
							index,
							map: dbValues.map.pipe(
								HM.set(indexString, {
									maybeName: O.some(product.name),
									maybeExpirationDate: product.maybeExpirationDate,
									maybeCreationDate: O.some(product.creationDate),
									maybeId: O.some(indexString),
								}),
							),
						}
					})

					yield* Eff.log(`Added product ${product.name} into mock database`)

					return yield* Eff.void
				}),
				withLayerLogging(`I`),
			),
		)
	}),
)
