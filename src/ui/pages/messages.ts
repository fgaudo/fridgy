import * as Data from 'effect/Data'

import type { PrefixKeys } from '@/core/types.ts'

import type * as AddProduct from './add-product/messages.ts'
import type * as Home from './home/messages.ts'

export type Message = Data.TaggedEnum<
	PrefixKeys<Home.Message, 'Home'> &
		PrefixKeys<AddProduct.Message, 'AddProduct'> & {
			HideToast: { version: bigint }
			NoOp: object
			Crash: object
			ShowToast: { text: string }
		}
>

export const Message = Data.taggedEnum<Message>()
