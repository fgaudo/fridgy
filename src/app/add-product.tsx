import { SafeAreaView } from 'react-native-safe-area-context'

import * as Screen from '@/screen/add-product/index.ts'

import { useViewmodel } from '../lib/adapter.ts'
import { useFridgyContext } from '../lib/context.ts'

export default function AddProduct() {
	const runtime = useFridgyContext()

	const model = useViewmodel({
		runtime,
		makeViewModel: Screen.ViewModel.make,
		initState: Screen.ViewModel.init,
	})

	return <SafeAreaView className="flex-1"></SafeAreaView>
}
