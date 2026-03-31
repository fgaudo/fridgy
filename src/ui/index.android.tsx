import * as SqliteClient from '@effect/sql-sqlite-react-native/SqliteClient'
import * as Layer from 'effect/Layer'
import * as Atom from 'effect/unstable/reactivity/Atom'
import * as Expo from 'expo'
import * as React from 'react'

import { UseCaseWithDeps } from '../business/index.ts'
import { App } from './App.tsx'

const runtime = Atom.runtime(
	Layer.provide(
		UseCaseWithDeps.sql,
		SqliteClient.layer({ filename: 'fridgy.db' }),
	),
)

const AppAndroid = () => {
	return <App runtime={runtime}></App>
}

Expo.registerRootComponent(AppAndroid)
