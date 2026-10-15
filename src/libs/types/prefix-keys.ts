export type PrefixKeys<T, P extends string> = {
	[K in keyof T as `${P}_${Extract<K, string>}`]: T[K]
}
