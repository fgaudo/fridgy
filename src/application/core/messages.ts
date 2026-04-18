import * as Data from 'effect/Data'

import type * as UC from '@/app/use-cases/index.ts'
import type { PrefixKeys } from '@/shared/types.ts'

export type Message = Data.TaggedEnum<
	PrefixKeys<
		{
			StartFetchList: object
			StartDeleteAndRefresh: object
			ToggleItem: { id: string }
			ClearSelected: object
		},
		'Home'
	>
>

export type InternalMessage =
	| Message
	| Data.TaggedEnum<
			PrefixKeys<
				{
					FetchListFailed: {
						version: bigint
						response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
					}
					FetchListSucceeded: {
						version: bigint
						response: Data.TaggedEnum.Value<
							UC.GetProducts.Response,
							'Succeeded'
						>
					}
					FetchListTick: { version: bigint }
					FetchListTickSucceeded: {
						version: bigint
						response: Data.TaggedEnum.Value<
							UC.GetProducts.Response,
							'Succeeded'
						>
					}
					FetchListTickFailed: {
						version: bigint
						response: Data.TaggedEnum.Value<UC.GetProducts.Response, 'Failed'>
					}
					DeleteAndRefreshSucceeded: {
						response: Data.TaggedEnum.Value<
							UC.GetProducts.Response,
							'Succeeded'
						>
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

export const InternalMessage = Data.taggedEnum<InternalMessage>()
