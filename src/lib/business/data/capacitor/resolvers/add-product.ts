import { LogLevel, RequestResolver } from 'effect'

import {
	E,
	Eff,
	L,
	O,
} from '$lib/core/imports.ts'

import { AddProduct } from '$lib/business/app/operations.ts'

import { Deps } from '../../deps.ts'
import { DbPlugin } from '../db-plugin.ts'

export const command = L.effect(
	AddProduct.Resolver,
	Eff.gen(function* () {
		const { addProduct } = yield* DbPlugin
		const { log } = yield* Deps

		return RequestResolver.fromEffect(product =>
			Eff.gen(function* () {
				const maybeExpirationDate =
					product.maybeExpirationDate

				const result = yield* Eff.either(
					addProduct({
						product: {
							name: product.name,
							creationDate: product.creationDate,
							expirationDate: O.getOrUndefined(
								maybeExpirationDate,
							),
						},
					}),
				)

				if (E.isLeft(result)) {
					yield* Eff.logError(result.left.error)
					return yield* new AddProduct.OperationFailed()
				}

				yield* log(
					LogLevel.Debug,
					'No errors adding the product',
				)
			}),
		)
	}),
)
