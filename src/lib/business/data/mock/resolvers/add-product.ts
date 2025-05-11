import {
	HashMap,
	LogLevel,
	Ref,
	RequestResolver,
} from 'effect'

import { Eff, L, O } from '$lib/core/imports.ts'

import { AddProduct } from '$lib/business/app/operations.ts'

import { Deps } from '../../deps.ts'
import { Config } from '../config.ts'
import { Db } from '../db.ts'

export const command = L.effect(
	AddProduct.Resolver,
	Eff.gen(function* () {
		const withErrors = yield* Config.withErrors
		const { log } = yield* Deps
		const db = yield* Db
		return RequestResolver.fromEffect(product =>
			Eff.gen(function* () {
				if (withErrors && Math.random() < 0.5) {
					return yield* Eff.fail(
						new AddProduct.OperationFailed(),
					)
				}

				yield* Ref.update(db, dbValues => {
					const index = dbValues.index + 1
					const indexString = index.toString(10)
					return {
						...dbValues,
						index,
						map: dbValues.map.pipe(
							HashMap.set(indexString, {
								maybeName: O.some(product.name),
								maybeExpirationDate:
									product.maybeExpirationDate,
								maybeCreationDate: O.some(
									product.creationDate,
								),
								maybeId: O.some(indexString),
							}),
						),
					}
				})

				yield* log(LogLevel.Info, 'Added product')

				return yield* Eff.void
			}),
		)
	}),
)
