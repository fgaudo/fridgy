import type { Accessor } from 'solid-js'

export function withDefault<T>(
	accessor: Accessor<T | undefined>,
	init: T,
): Accessor<T> {
	return () => accessor() ?? init
}
