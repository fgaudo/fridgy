import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import { Stack } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import { UseCases } from '@/business/index.ts'

import '../../global.css'
import { FridgyContext } from './context.ts'

export function RootLayout(layer: Layer.Layer<UseCases.All>) {
	const runtime = useMemo(() => ManagedRuntime.make(layer), [layer])

	useEffect(() => {
		return () => {
			void runtime.dispose()
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
