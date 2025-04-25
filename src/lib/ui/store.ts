import type { ReadonlyDeep } from 'type-fest'

export type Store<S, D, A> = ReadonlyDeep<{
	state: S
	derived: D
	actions: A
}>
