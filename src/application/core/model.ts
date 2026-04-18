import * as Data from 'effect/Data'
import type * as Opt from 'effect/Option'

import * as Home from './home/model.ts'

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

export type State = Readonly<{
	toast: Readonly<{
		version: bigint
		maybeText: Opt.Option<string>
	}>
	currentPage: Data.TaggedEnum<{
		Home: Readonly<{ state: Home.State }>
		AddProduct: Readonly<{ state: object }>
	}>
}>

export const Page = Data.taggedEnum<State['currentPage']>()

const PageModel = Data.taggedEnum<Model['currentPage']>()

export const makeModel = (state: State): Model => {
	if (state.currentPage._tag === 'Home') {
		return {
			toast: {
				key: state.toast.version.toString(16),
				maybeText: state.toast.maybeText,
			},
			currentPage: PageModel.Home({
				model: Home.makeModel(state.currentPage.state),
			}),
		}
	}
	return {
		toast: {
			key: state.toast.version.toString(16),
			maybeText: state.toast.maybeText,
		},
		currentPage: PageModel.AddProduct({ model: {} }),
	}
}
