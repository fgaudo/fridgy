import * as Data from 'effect/Data'

import type { PrefixKeys } from '@/core/types.ts'

import type * as AddProduct from './add-product/messages.ts'
import type * as Home from './home/messages.ts'

export type Message = Data.TaggedEnum<
	PrefixKeys<Home.Message, 'Home'> &
		PrefixKeys<AddProduct.Message, 'AddProduct'> & {
			HideToast: object
			NoOp: object
			Crash: object
		}
>

export const Message = Data.taggedEnum<Message>()
