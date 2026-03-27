import * as ManagedRuntime from 'effect/ManagedRuntime'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { UseCases } from '@/business/index.ts'

import { useViewmodel } from '../../lib/adapter.ts'
import { viewModel } from './viewmodel/index.ts'

export { type Model } from './viewmodel/model.ts'
export { viewModel } from './viewmodel/index.ts'

export function AddProduct(props: {
	runtime: ManagedRuntime.ManagedRuntime<UseCases.All, never>
}) {
	const model = useViewmodel({
		runtime: props.runtime,
		update: viewModel,
	})

	return <SafeAreaView className="flex-1"></SafeAreaView>
}
