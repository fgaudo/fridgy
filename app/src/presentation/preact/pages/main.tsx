import { flow, pipe } from 'fp-ts/function'
import * as Ord from 'fp-ts/Ord'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as RoM from 'fp-ts/ReadonlyMap'
import * as RoS from 'fp-ts/ReadonlySet'
import * as RoT from 'fp-ts/ReadonlyTuple'
import * as S from 'fp-ts/string'
import { useSubscription } from 'observable-hooks'
import { useState } from 'preact/hooks'
import { JSX } from 'preact/jsx-runtime'
import { route } from 'preact-router'

import { FoodsPageModel } from '@/application/read/foods-page'
import { useGlobalContext } from '@/presentation/preact'
import { AddFab } from '@/presentation/preact/ui/fab-add-button'
import { Title } from '@/presentation/preact/ui/title'
import { Transition } from '@/presentation/preact/ui/transition'
import { LazyContainer } from '@/presentation/preact/ui/lazy-container'
import { Swipable } from '@/presentation/preact/ui/swipable'

interface FoodItemState {
  readonly name: string
  readonly id: string
  readonly selected: boolean
  readonly removed: boolean
}

interface FoodsPageState {
  readonly loading: boolean
  readonly selected: ReadonlySet<string>
  readonly foods: ReadonlyMap<string, FoodItemState>
}

const combineState:
(model: FoodsPageModel) =>
(state: FoodsPageState) =>
FoodsPageState =
  model => state => ({
    loading: false,
    selected: pipe(
      state.selected,
      RoS.filter(id => RoM.member(S.Eq)(id)(model.foods))
    ),
    foods: pipe(
      model.foods,
      RoM.map(({ name, id }) => ({
        name,
        id,
        selected: false,
        removed: false
      }))
    )
  })

const init: FoodsPageState = {
  loading: true,
  selected: new Set(),
  foods: new Map()
}

const mapFoods:
<A>(f: (state: FoodItemState) => A)
=> (record: ReadonlyMap<string, FoodItemState>)
=> readonly A[] =
f => flow(
  RoM.toReadonlyArray(Ord.trivial),
  RoA.map(RoT.snd),
  RoA.map(f)
)

const FoodItem = ({ food }: { food: FoodItemState }): JSX.Element => {
  return (
    <LazyContainer cssHeight='70px'>
      <Swipable onRight={() => console.log('right')}>
        <li key={food.id} class='p-3 sm:pb-4 bg-white mx-2 mb-2 shadow-md transition-transform duration-1000' style='height: 70px'>
          <div class='flex items-center space-x-4'>
            <div class='flex-1 min-w-0'>
              <p class='text-sm pb-2 font-medium text-gray-900 truncate dark:text-white'>
                {food.name}
              </p>
              <div class='w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700'>
                <div class='bg-blue-600 h-2.5 rounded-full' style='width: 45%' />
              </div>
            </div>
          </div>
        </li>
      </Swipable>
    </LazyContainer>
  )
}

const openAddFoodPage = (): void => {
  route('/add-food')
}

export function FoodsPage (): JSX.Element {
  const [state, setState] = useState<FoodsPageState>(() => init)

  const { useCases: { foodsPageModel$ }, title } = useGlobalContext()

  useSubscription(
    foodsPageModel$,
    data => setState(combineState(data))
  )

  return (
    <Transition loading={state.loading}>
      <div class='bg-gray-100 h-full'>
        <Title text={title} />
        <ul class='pt-14'>
          {mapFoods(food =>
            <FoodItem food={food} />
          )(state.foods)}
        </ul>
        <div class=''>
          <AddFab onClick={openAddFoodPage} label='Add Food' />
        </div>
      </div>
    </Transition>
  )
}
