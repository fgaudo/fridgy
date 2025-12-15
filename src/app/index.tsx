import Ionicons from '@expo/vector-icons/Ionicons'
import * as Arr from 'effect/Array'
import { absurd } from 'effect/Function'
import { Link } from 'expo-router'
import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Svg from 'react-native-svg'

import * as Home from '@/screen/home/viewmodel/index.ts'

import { useViewmodel } from '../lib/adapter.ts'
import { useFridgyContext } from '../lib/context.ts'

export default function Index() {
	const runtime = useFridgyContext()

	const model = useViewmodel({
		runtime,
		makeViewModel: Home.make,
		initState: Home.init,
	})

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

			{model.canNavigateToAddProduct ? (
				<View className="absolute bottom-5 right-5 items-end">
					{model.productListStatus._tag === 'Empty' && <StylishArrow />}
					<Link href={'/add-product'}>
						<Ionicons
							name="add"
							size={50}
							color={'white'}
							className="bg-red-600 z-50 text-background shadow-md shadow-on-background/30 flex h-24 w-24 items-center justify-center rounded-full"
						/>
					</Link>
				</View>
			) : (
				<></>
			)}
		</SafeAreaView>
	)
}

const StylishArrow = () => (
	<View className="flex flex-col items-center pb-5 right-16">
		<Svg.Svg
			width={160}
			height={160}
			viewBox="0 0 130 185"
			className="rotate-[12deg] relative left-[25px]"
		>
			<Svg.Path d="M22.6 5.9c-.3.5..." />
			<Svg.Path d="M93.5 125c-.3.5..." />
		</Svg.Svg>
	</View>
)
