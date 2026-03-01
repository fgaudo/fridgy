import { SqliteClient } from '@effect/sql-sqlite-react-native'
import * as Layer from 'effect/Layer'

import * as Adapters from '@/adapters/index.ts'
import * as UseCases from '@/use-cases/index.ts'

export * as UseCases from '@/use-cases/index.ts'

export const layers: Layer.Layer<UseCases.All> = __DEV__
	? Layer.provide(UseCases.all, Adapters.inMemory)
	: Layer.provide(
			UseCases.all,
			Layer.provide(
				Adapters.sql,
				SqliteClient.layer({
					filename: 'fridgy.db',
				}),
			),
		)
