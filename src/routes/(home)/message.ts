import * as Data from 'effect/Data'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

export type Message = Data.TaggedEnum<{
	StartFetchList: object
	StartDeleteAndRefresh: object
	ToggleItem: { id: string }
	ClearSelected: object
	ProductListHidden: object
}>

export const Message = Data.taggedEnum<Message>()

type _InternalMessage = Data.TaggedEnum<{
	NoOp: object
	FetchListFailed: {
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
	}
	FetchListSucceeded: {
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
	}
	FetchListTick: { version: number }
	FetchListTickSucceeded: {
		version: number
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
	}
	FetchListTickFailed: {
		version: number
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
	}
	DeleteAndRefreshSucceeded: {
		response: Data.TaggedEnum.Value<
			UC.DeleteAndGetProducts.Response,
			'Succeeded'
		>
	}
	DeleteAndRefreshFailed: {
		response: Data.TaggedEnum.Value<UC.DeleteAndGetProducts.Response, 'Failed'>
	}
	DeleteSucceededButRefreshFailed: {
		response: Data.TaggedEnum.Value<
			UC.DeleteAndGetProducts.Response,
			'DeleteSucceededButRefreshFailed'
		>
	}
}>

export type InternalMessage = Message | _InternalMessage

export const InternalMessage = Data.taggedEnum<InternalMessage>()
