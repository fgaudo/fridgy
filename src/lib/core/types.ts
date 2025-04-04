/* eslint-disable @typescript-eslint/no-explicit-any */
export type AtLeastOne<
	T,
	U = { [K in keyof T]: Pick<T, K> },
> = Partial<T> & U[keyof U];

export type Flipped<
	T extends (a: any) => (b: any) => any,
> = T extends (
	a: infer A,
) => (b: infer B) => infer D
	? (b: B) => (a: A) => D
	: never;

export type AssertEqual<T, U> = T extends U
	? U extends T
		? true
		: never
	: never;

export type Exact<A, B> = A extends B
	? B extends A
		? A
		: never
	: never;
