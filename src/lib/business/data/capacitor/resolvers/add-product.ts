import { LogLevel, RequestResolver } from 'effect'

import {
	Eff,
	H,
	L,
	O,
} from '$lib/core/imports.ts'

import { AddProduct } from '$lib/business/app/operations.ts'

import { Deps } from '../../deps.ts'
import { DbPlugin } from '../db-plugin.ts'

export const command = L.effect(
	AddProduct.Resolver,
	Eff.gen(function* () {
		const { db } = yield* DbPlugin
		const { log } = yield* Deps

		return RequestResolver.fromEffect(
			({ product }) =>
				Eff.gen(function* () {
					const maybeExpirationDate =
						product.maybeExpirationDate

					yield* H.tryPromise(() =>
						db.addProduct({
							product: {
								name: O.getOrElse(
									product.maybeName,
									() => '[no name]',
								),
								creationDate: O.getOrElse(
									product.maybeCreationDate,
									() => 0,
								),
								expirationDate: O.getOrUndefined(
									maybeExpirationDate,
								),
							},
						}),
					).pipe(
						Eff.catchTags({
							UnknownException: () =>
								new AddProduct.OperationFailed(),
						}),
					)

					yield* log(
						LogLevel.Debug,
						'No errors adding the product',
					)
				}),
		)
	}),
)
