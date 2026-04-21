import * as Effect from 'effect/Effect'

export const saferImport = Effect.fnUntraced(function* (path: string) {
	return yield* Effect.promise(() => import(path).then(a => a as unknown))
})
