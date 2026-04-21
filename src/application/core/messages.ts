import * as Data from 'effect/Data'

import type { PrefixKeys } from '@/shared/types.ts'

import type * as Home from './home/messages.ts'

export type Message = Data.TaggedEnum<PrefixKeys<Home.Message, 'Home'>>

export type InternalMessage =
	| Message
	| Data.TaggedEnum<
			PrefixKeys<Home.InternalMessage, 'Home'> & {
				HideToast: { version: bigint }
				NoOp: object
				Crash: object
				ShowToast: { text: string }
			}
	  >

export const InternalMessage = Data.taggedEnum<InternalMessage>()
