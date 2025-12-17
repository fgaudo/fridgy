import Ionicons from '@expo/vector-icons/Ionicons'
import * as Arr from 'effect/Array'
import { absurd } from 'effect/Function'
import { Link, useNavigation } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Svg from 'react-native-svg'
import Toast from 'react-native-toast-message'

import * as Home from '@/screen/home/viewmodel/index.ts'
import * as Model from '@/screen/home/viewmodel/model.ts'

import { useViewmodel } from '../lib/adapter.ts'
import { useFridgyContext } from '../lib/context.ts'

export default function Index() {
	const runtime = useFridgyContext()
	const navigation = useNavigation()
	const model = useViewmodel({
		runtime,
		makeViewModel: Home.make,
		initState: Home.init,
		messages: message => {
			Toast.show({ type: 'info', text1: message._tag })
		},
	})

	const canClearSelection = Model.canClearSelection(model)
	const hasSelectedProducts = Model.hasSelectedProducts(model)
	const canDeleteSelected = Model.canDeleteSelected(model)

	useEffect(() => {
		if (!hasSelectedProducts) {
			navigation.setOptions({
				headerRight: undefined,
			})

			return
		}

		if (!canDeleteSelected) {
			navigation.setOptions({
				headerRight: () => (
					<View className="pr-5">
						<Text>{model.productListStatus.hasSelectedProducts.number}</Text>
						<Ionicons name="trash" disabled></Ionicons>
					</View>
				),
			})

			return
		}

		navigation.setOptions({
			headerRight: () => (
				<View className="pr-5">
					<Text>{model.productListStatus.hasSelectedProducts.number}</Text>

					<Ionicons
						name="trash"
						onPress={() => {
							runtime.runCallback(
								model.productListStatus.hasSelectedProducts.canDelete
									.deleteSelected,
							)
						}}
					></Ionicons>
				</View>
			),
		})
	}, [hasSelectedProducts, canDeleteSelected])

	useEffect(() => {
		if (!canClearSelection) {
			navigation.setOptions({
				headerLeft: () => (
					<Ionicons name="menu" size={32} className="pl-5"></Ionicons>
				),
			})
			return
		}

		navigation.setOptions({
			headerLeft: () => (
				<Ionicons
					name="close"
					size={32}
					className="pl-5"
					onPress={() => {
						runtime.runCallback(
							model.productListStatus.hasSelectedProducts.canClearSelection
								.clear,
						)
					}}
				></Ionicons>
			),
		})
	}, [canClearSelection])

	return (
		<SafeAreaView className="flex-1">
			{model.productListStatus._tag === 'Available' ? (
				<FlatList
					data={Arr.filter(
						model.productListStatus.products,
						product => product._tag !== 'Corrupt',
					)}
					renderItem={({ item }) => (
						<View key={item.id} className="h-30 w-full">
							ciao
						</View>
					)}
				/>
			) : model.productListStatus._tag === 'Empty' ? (
				<View className="flex-1 items-center justify-center">
					<Text className="text-center text-md">
						Uh-oh, your fridge is looking a little empty!{'\n'}
						Let’s fill it up!
					</Text>
				</View>
			) : model.productListStatus._tag === 'Error' ? (
				<View className="flex h-screen w-screen items-center justify-center text-center text-lg">
					<Text
						onPress={() => {
							if (model.canFetch._tag === 'True') {
								runtime.runCallback(model.canFetch.fetch)
							}
						}}
					>
						Could not load the list :(
					</Text>
				</View>
			) : model.productListStatus._tag === 'Initial' ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator color={'red'} size={60} />
				</View>
			) : (
				absurd(model.productListStatus)
			)}

			{Model.canNavigateToAddProduct(model) ? (
				<View className="absolute bottom-15 right-5 items-end">
					<Link href={'/add-product'}>
						<Ionicons
							name="add"
							size={36}
							color={'white'}
							className="elevation-md bg-red-600 z-50 text-background shadow-md shadow-on-background/30 flex h-24 w-24 items-center justify-center rounded-4xl"
						/>
					</Link>
				</View>
			) : (
				<></>
			)}
		</SafeAreaView>
	)
}
