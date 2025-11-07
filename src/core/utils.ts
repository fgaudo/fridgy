export const generateHexColor = () => {
	const alphabet = `ABCDEF0123456789`

	const randomize = () => alphabet[Math.floor(Math.random() * alphabet.length)]
	return `#${randomize()}${randomize()}${randomize()}${randomize()}${randomize()}${randomize()}`
}

export const useOrCreateError = (message: string) => (error: unknown) =>
	error instanceof Error ? error : new Error(message)

export const objectFromEntries = <
	const T extends readonly (readonly [PropertyKey, unknown])[],
>(
	entries: T,
): { [K in T[number] as K[0]]: K[1] } => {
	return Object.fromEntries(entries) as {
		[K in T[number] as K[0]]: K[1]
	}
}

export const objectEntries = <T extends Record<PropertyKey, unknown>>(
	obj: T,
): { [K in keyof T]: [K, T[K]] }[keyof T][] => {
	return Object.entries(obj) as {
		[K in keyof T]: [K, T[K]]
	}[keyof T][]
}
