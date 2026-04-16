import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'

import type * as UC from '@/app/use-cases/index.ts'
import type { PrefixKeys } from '@/shared/types.ts'

export type Message = Data.TaggedEnum<
	PrefixKeys<
		{
			StartFetchList: object
			StartDeleteAndRefresh: object
			ToggleItem: { id: string }
			ClearSelected: object
			FetchListFailed: {
				version: bigint
				response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
			}
			FetchListSucceeded: {
				version: bigint
				response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
			}
			FetchListTick: { version: bigint }
			FetchListTickSucceeded: {
				version: bigint
				response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
			}
			FetchListTickFailed: {
				version: bigint
				response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
			}
			DeleteAndRefreshSucceeded: {
				response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Succeeded'>
			}
			DeleteAndRefreshFailed: {
				response: Data.TaggedEnum.Value<
					UC.DeleteProductsByIds.Response,
					'Failed'
				>
			}
			DeleteSucceededButRefreshFailed: {
				response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
			}
		},
		'Home'
	> & {
		HideToast: { version: bigint }
		NoOp: object
		Crash: object
		ShowToast: { text: string }
	}
>

export const Message = Data.taggedEnum<Message>()

export class MessageDispatcher extends Context.Service<
	MessageDispatcher,
	(m: Message) => Effect.Effect<void>
>()('0b011bae6e3a6a1f') {}
