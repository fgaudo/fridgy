/* eslint-disable @typescript-eslint/no-explicit-any */
export type AtLeastOne<
	T,
	U = { [K in keyof T]: Pick<T, K> },
> = Partial<T> & U[keyof U]

type Flipped<
	T extends (a: any) => (b: any) => any,
> = T extends (
	a: infer A,
) => (b: infer B) => infer D
	? (b: B) => (a: A) => D
	: never
