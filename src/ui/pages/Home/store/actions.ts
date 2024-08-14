import { Da, F } from '@/core/imports'

import type { ProductModel } from '@/app/use-cases/get-sorted-products'

export type Message = Da.TaggedEnum<{
	RefreshList: object
	DeleteProducts: object
	ClearSelectedProducts: object
	ToggleItem: { id: string }
}>

export type InternalMessage = Da.TaggedEnum<{
	DeleteProductsFailed: {
		message: string
	}
	DeleteProductsSucceeded: object
	RefreshListStarted: { fiber: F.Fiber<unknown> }
	RefreshListSucceeded: {
		data: {
			total: number
			models: ProductModel[]
		}
	}
	RefreshListFailed: {
		message: string
	}
	ShowToast: { message: string }
	RemoveToast: object
	RemoveToastStarted: { id: F.Fiber<unknown> }
}>

export const Message = Da.taggedEnum<Message>()

export const InternalMessage =
	Da.taggedEnum<InternalMessage>()
