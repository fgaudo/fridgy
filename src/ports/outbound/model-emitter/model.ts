import type * as Data from 'effect/Data'
import type * as Opt from 'effect/Option'

import type * as Home from './home/model.ts'

export type Model = {
	toast: {
		key: string
		maybeText: Opt.Option<string>
	}
	currentPage: Data.TaggedEnum<{
		Home: { model: Home.Model }
		AddProduct: { model: object }
	}>
}
