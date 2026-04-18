import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Opt from 'effect/Option'

export type License = {
	packageName: string
	licenses: Opt.Option<string>
	repository: Opt.Option<string>
	publisher: Opt.Option<string>
	email: Opt.Option<string>
	copyright: Opt.Option<string>
	name: Opt.Option<string>
	description: Opt.Option<string>
}

export class GetLicenses extends Context.Service<
	GetLicenses,
	Effect.Effect<ReadonlyArray<License>>
>()('f26dda181ceae6f7') {}
