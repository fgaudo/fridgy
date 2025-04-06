import { L } from '$lib/core/imports.ts';

import type { UseCases } from '$lib/app/use-cases.ts';

import {
	Capacitor,
	Mock,
} from '$lib/data/index.ts';

export const useCases: UseCases = import.meta.env
	.PROD
	? L.provide(
			Capacitor.useCases,
			L.succeed(Capacitor.Tag, {
				db: Capacitor.registerSqlitePlugin(),
			}),
		)
	: Mock.useCases;
