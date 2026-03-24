import * as Struct from 'effect/Struct'

type StrictKeys<T, U extends { [K in keyof T]?: any }> = {
	[K in keyof U]: K extends keyof T ? U[K] : never
}

export const evolveStrict = <S extends object>(
	state: S,
	updater: StrictKeys<S, Partial<{ [K in keyof S]: (prev: S[K]) => S[K] }>>,
) => {
	return Struct.evolve(state, updater) as S
}
