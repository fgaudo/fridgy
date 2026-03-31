import * as Atom from 'effect/unstable/reactivity/Atom'
import * as Expo from 'expo'
import * as React from 'react'

import { UseCaseWithDeps } from '../business/index.ts'
import { App } from './App.tsx'

const runtime = Atom.runtime(UseCaseWithDeps.inMemory)

const AppWeb = () => {
	return <App runtime={runtime}></App>
}

Expo.registerRootComponent(AppWeb)
