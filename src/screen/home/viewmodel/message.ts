import * as Data from 'effect/Data'

import { UseCasesWithoutDependencies as UC } from '@/feature/product-management/index.ts'

import type { FetchListSchedulerVersion, FetchListVersion } from './state.ts'

export type Message = Data.TaggedEnum<{
	StartFetchList: object
	StartDeleteAndRefresh: object
	ToggleItem: { id: string }
	ClearSelected: object
	Crash: { error: unknown }
	NoOp: object
	FetchListFailed: {
		version: FetchListVersion
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
	}
	FetchListSucceeded: {
		version: FetchListVersion
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
	}
	FetchListTick: { version: FetchListSchedulerVersion }
	FetchListTickSucceeded: {
		version: FetchListSchedulerVersion
		response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
	}
	FetchListTickFailed: {
		version: FetchListSchedulerVersion
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

export const Message = Data.taggedEnum<Message>()
