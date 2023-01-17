import { FoodsPageModel } from '@/application/read/foods-page'
import { useGlobalContext } from '@/presentation/preact'
import { flow, pipe } from 'fp-ts/function'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as RS from 'fp-ts/ReadonlySet'
import * as T from 'fp-ts/ReadonlyTuple'
import { useSubscription } from 'observable-hooks'
import { useState } from 'preact/hooks'
import { JSX } from 'preact/jsx-runtime'
import { route } from 'preact-router'
import { AddFab } from '@/presentation/preact/ui/fab-add-button'
import { Title } from '@/presentation/preact/ui/title'
import { Transition } from '../ui/transition'

interface FoodItemState {
  readonly name: string
  readonly id: string
  readonly selected: boolean
  readonly removed: boolean
}

interface FoodsPageState {
  readonly loading: boolean
  readonly selected: ReadonlySet<string>
  readonly foods: RR.ReadonlyRecord<string, FoodItemState>
}

const combineState:
(data: FoodsPageModel) =>
(state: FoodsPageState) =>
FoodsPageState = data =>
  prevState => ({
    loading: false,
    selected: pipe(
      prevState.selected,
      RS.filter(id => RR.has(id, data.foods))
    ),
    foods: pipe(
      data.foods,
      RR.map(({ name, id }) => ({
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
  foods: {}
}

const mapFoods:
(toJsx: (state: FoodItemState) => JSX.Element)
=> (record: RR.ReadonlyRecord<string, FoodItemState>)
=> readonly JSX.Element[] =
toJsx => flow(
  RR.toEntries,
  RA.map(T.snd),
  RA.map(toJsx)
)

const FoodItem = ({ food }: { food: FoodItemState }): JSX.Element =>
  <li key={food.id} class='p-3 sm:pb-4 bg-white mx-2 mb-2 shadow-md'>
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

const openAddFoodPage = (): void => {
  route('/add-food')
}

export function FoodsPage (): JSX.Element {
  const [state, setState] = useState<FoodsPageState>(() => init)

  const { useCases: { foodsPageModel$ } } = useGlobalContext()

  useSubscription(
    foodsPageModel$,
    data => setState(combineState(data))
  )

  return (
    <Transition loading={state.loading}>
      <div class='bg-gray-100 h-full'>
        <Title text='Fridgy' />
        <ul class='pt-14'>
          {mapFoods(food =>
            <FoodItem food={food} />
          )(state.foods)}
        </ul>
        <div class='fixed right-7 bottom-12'>
          <AddFab color='orange-700' onClick={openAddFoodPage} label='Add Food' />
        </div>
      </div>
    </Transition>
  )
}
