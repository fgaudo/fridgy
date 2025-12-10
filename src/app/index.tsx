import Ionicons from '@expo/vector-icons/Ionicons'
import * as Data from 'effect/Data'
import { absurd, pipe } from 'effect/Function'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Option from 'effect/Option'
import { Link } from 'expo-router'
import { type ReactNode, useCallback } from 'react'
import {
	ActivityIndicator,
	FlatList,
	Image,
	type ListRenderItem,
	type ListRenderItemInfo,
	Text,
	View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Svg from 'react-native-svg'

import type { Reader } from '@/core/reader.ts'

import { Model } from '@/screen/home/index.ts'
import * as Home from '@/screen/home/viewmodel/index.ts'

import type { UseCasesWithoutDependencies as UC } from '../business/index.ts'
import { useViewmodel } from '../lib/adapter.ts'
import { useFridgyContext } from '../lib/context.ts'

type HomeNode = Reader<
	{
		runtime: ManagedRuntime.ManagedRuntime<UC.All, never>
		model: Model.Model
	},
	ReactNode
>
type AvailableNode = Reader<
	{
		runtime: ManagedRuntime.ManagedRuntime<UC.All, never>
		model: Model.Model & { productListStatus: { _tag: 'Available' } }
	},
	ReactNode
>

export default function Index() {
	const runtime = useFridgyContext()

	const model = useViewmodel({
		runtime,
		makeViewModel: Home.make,
		initState: Home.init,
	})

	return Page({ model, runtime })
}

const Page: HomeNode = deps => {
	return (
		<SafeAreaView className="flex-1">
			{(() => {
				switch (deps.model.productListStatus._tag) {
					case 'Available':
						return Available({
							...deps,
							model: {
								...deps.model,
								productListStatus: deps.model.productListStatus,
							},
						})
					case 'Empty':
						return (
							<View className="flex-1 items-center justify-center">
								<Text className="text-center text-md">
									Uh-oh, your fridge is looking a little empty!{'\n'}
									Let’s fill it up!
								</Text>
							</View>
						)
					case 'Error':
						return Error(deps)
					case 'Initial':
						return (
							<View className="flex-1 items-center justify-center">
								<ActivityIndicator color={'red'} size={60} />
							</View>
						)
					default:
						return absurd(deps.model.productListStatus)
				}
			})()}

			{(deps.model.productListStatus._tag !== 'Available' ||
				deps.model.productListStatus.hasSelectedProducts._tag === 'False') &&
				Fab(deps)}
		</SafeAreaView>
	)
}

const Fab: HomeNode = deps => (
	<View className="absolute bottom-5 right-5 items-end">
		{deps.model.productListStatus._tag === 'Empty' && (
			<View className="flex flex-col items-center pb-5 right-16">
				<Svg.Svg
					width={160}
					height={160}
					viewBox="0 0 130 185"
					className="rotate-[12deg] relative left-[25px]"
				>
					<Svg.Path d="M22.6 5.9c-.3.5.1 1.5 1 2.2 2.8 2.3 10.1 12.3 10.9 14.9.4 1.4 1.3 3.1 1.9 3.9.7.9 1.1 6.2 1 14.5 0 12.4-1.1 19-4.7 27.6-.3.8-1.6 5.5-2.8 10.5-1.8 7.7-2.1 10.9-1.6 22 .5 12.7 2.5 21.3 7 30.4 1.4 2.9 9.4 11.1 10.9 11.1.5 0 3 1.2 5.6 2.7 9.2 5.4 13.5 6.4 31.6 7 14.1.5 16.8.4 16.4-.8-.4-1.1-4-1.5-15.9-2-16.5-.7-22.3-2-31.1-7.2-2.6-1.5-5.1-2.7-5.6-2.7-1.2 0-7.6-6.6-9-9.2-6.9-14.1-9.1-34.1-5.3-49.4 1.2-4.9 2.6-9.8 3-10.9.5-1.1 1.9-5.7 3.1-10.2 1.9-7.1 2.2-10 1.8-20.5-.4-8.8-1-13.2-2.1-15.3-.9-1.7-1.7-3.4-1.7-3.8 0-.5-2.1-3.6-4.7-7-6.1-8.2-8.4-10-9.7-7.8z" />
					<Svg.Path d="M93.5 125c-.3.5.3 1.5 1.5 2.2 1.1.7 2 1.6 2 2 0 1 6.5 10.3 9.6 13.8 1.2 1.4 3.9 6.2 6.1 10.8l3.9 8.2h-7.9c-9.5 0-15.1 1.5-19.2 4.9-1.7 1.4-4.2 3.3-5.5 4.3-1.9 1.2-2.2 1.9-1.3 2.8.9.9 2.2.5 6-2.1 2.6-1.8 5-3.6 5.3-4 1.1-1.6 9.1-2.9 17.8-2.9 5 0 9.2-.3 9.2-.7 0-1.8-10.1-21.1-11.9-22.8-1.2-1-2.1-2.2-2.1-2.7s-1.6-2.9-3.5-5.2c-1.9-2.4-3.5-4.8-3.5-5.4 0-1.1-3.8-4.2-5.2-4.2-.4 0-1 .4-1.3 1z" />
				</Svg.Svg>
			</View>
		)}
		<Link href={'/add-product'}>
			<Ionicons
				name="add"
				size={50}
				color={'white'}
				className="bg-red-600 z-50 text-background shadow-md shadow-on-background/30 flex h-24 w-24 items-center justify-center rounded-full"
			/>
		</Link>
	</View>
)

const Available: AvailableNode = ({ model }) => {
	const renderItem = useCallback(
		({
			item,
		}: ListRenderItemInfo<
			(typeof model)['productListStatus']['products'][0]
		>) => (
			<View
				{
					// Corrupt items don't have an id
					...(item._tag !== 'Corrupt' ? { key: item.id } : {})
				}
				className="h-30 w-full"
			>
				ciao
			</View>
		),
		[],
	)

	return (
		<FlatList
			data={model.productListStatus.products.filter(p => p._tag !== 'Corrupt')}
			renderItem={renderItem}
		/>
	)
}

const Error: HomeNode = ({ runtime, model }) => {
	const fetch = useCallback(() => {
		if (model.canFetch._tag === 'True') {
			runtime.runFork(model.canFetch.fetch)
			return
		}
	}, [model, runtime])

	if (model.isFetching) {
		return <ActivityIndicator />
	}

	return (
		<View className="flex h-screen w-screen items-center justify-center text-center text-lg">
			<Text onPress={fetch}>Could not load the list :(</Text>
		</View>
	)
}
