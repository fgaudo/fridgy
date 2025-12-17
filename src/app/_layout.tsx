import * as ManagedRuntime from 'effect/ManagedRuntime'
import { Stack } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import '../../global.css'
import { layers } from '../business/index.ts'
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
				<Stack screenOptions={{ headerTitleAlign: 'center' }}></Stack>
			</FridgyContext.Provider>
			<Toast />
		</SafeAreaProvider>
	)
}
