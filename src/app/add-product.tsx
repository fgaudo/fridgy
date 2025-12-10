import * as ManagedRuntime from 'effect/ManagedRuntime'
import type { ReactNode } from 'react'

import type { Reader } from '@/core/reader.ts'

import * as Screen from '@/screen/add-product/index.ts'

import type { UseCasesWithoutDependencies as UC } from '../business/index.ts'
import { useViewmodel } from '../lib/adapter.ts'
import { useFridgyContext } from '../lib/context.ts'

type AddProductNode = Reader<
	{
		runtime: ManagedRuntime.ManagedRuntime<UC.All, never>
		model: Screen.Model.Model
	},
	ReactNode
>

export default function AddProduct() {
	const runtime = useFridgyContext()

	const model = useViewmodel({
		runtime,
		makeViewModel: Screen.ViewModel.make,
		initState: Screen.ViewModel.init,
	})

	return Page({ model, runtime })
}

const Page: AddProductNode = deps => {
	return <SafeAreaView className="flex-1"></SafeAreaView>
}
