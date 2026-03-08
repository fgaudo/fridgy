import { SqliteClient } from '@effect/sql-sqlite-react-native'
import * as Layer from 'effect/Layer'

import { sql as layer } from '@/business/index.ts'

import { RootLayout } from '../lib/root.tsx'

const sqliteLayer = Layer.provide(
	layer,
	SqliteClient.layer({ filename: 'fridgy.db' }),
)

export default RootLayout(sqliteLayer)
