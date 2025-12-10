import * as ManagedRuntime from 'effect/ManagedRuntime'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import '../../global.css'
import { layers } from '../business'
import { FridgyContext } from '../lib/context'

export default function RootLayout() {
	const runtime = useMemo(() => ManagedRuntime.make(layers), [])

	useEffect(() => {
		return () => {
			runtime.dispose()
		}
	}, [runtime])

	return (
		<SafeAreaProvider>
			<FridgyContext.Provider value={runtime}>
				<StatusBar style="auto" />
				<Stack />
			</FridgyContext.Provider>
		</SafeAreaProvider>
	)
}
