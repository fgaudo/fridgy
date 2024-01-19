import * as E from 'fp-ts/Either'
import * as Eq from 'fp-ts/Eq'
import * as OPT from 'fp-ts/Option'
import * as RoS from 'fp-ts/ReadonlySet'
import { pipe } from 'fp-ts/function'

import * as RoNeS from '@/core/readonly-non-empty-set'

import {
	createProduct,
	expDate,
	name,
} from '@/domain/product'

import type { AddFailure } from '@/app/commands/add-failure'
import type { EnqueueProcess } from '@/app/commands/enqueue-process'
import type { Log } from '@/app/commands/log'
import type { OnChangeProcesses } from '@/app/streams/on-change-processes'
import type { OnProducts } from '@/app/streams/on-products'
import type { ProcessDTO } from '@/app/types/process'
import {
	type ProductDTO,
	productDataEq,
} from '@/app/types/product'
import type { ProductModel } from '@/app/view-models/overview'

export interface UseCases<ID> {
	processes$: OnChangeProcesses<ID>
	enqueueProcess: EnqueueProcess<ID>
	products$: OnProducts<ID>
	log: Log
	addFailure: AddFailure
}

export const toProductEntitiesOrFilterOut = <ID>(
	set: ReadonlySet<ProductDTO<ID>>,
) =>
	pipe(
		set,
		RoS.filterMap(productDataEq<ID>())(
			productDTO =>
				pipe(
					createProduct(productDTO),
					E.map(product => ({
						id: productDTO.id,
						name: name(product),
						expDate: expDate(product),
					})),
					OPT.getRight,
				),
		),
	)

export const toProductModels = <ID>([
	products,
	processes,
]: readonly [
	ReadonlySet<ProductDTO<ID>>,
	ReadonlySet<ProcessDTO<ID>>,
]) =>
	pipe(
		products,
		RoS.map(
			Eq.fromEquals<ProductModel<ID>>(
				(a, b) => a.id === b.id,
			),
		)(product => ({
			...product,
			deleting: pipe(
				processes,
				RoS.filter(
					process => process.type === 'delete',
				),
				RoS.some(process =>
					pipe(
						process.ids,
						RoNeS.toReadonlySet,
						RoS.some(id => product.id === id),
					),
				),
			),
		})),
	)

export const logInfo =
	(message: string) =>
	<ID>({ log }: UseCases<ID>) =>
		log('info', message)
