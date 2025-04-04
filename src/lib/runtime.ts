import { L } from '$lib/core/imports.ts';

import type { Dependencies } from '$lib/app/index.ts';

import {
	Capacitor,
	Mock,
} from '$lib/data/index.ts';

export const dependencies: Dependencies =
	import.meta.env.PROD
		? L.provide(
				Capacitor.dependencies,
				L.succeed(Capacitor.Tag, {
					db: Capacitor.registerSqlitePlugin(),
				}),
			)
		: Mock.dependencies;
