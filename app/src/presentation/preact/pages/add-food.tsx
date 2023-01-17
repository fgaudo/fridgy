import { FoodsPageData } from '@/application/read/foods-page'
import { useGlobalContext } from '@/presentation/preact'
import classnames from 'classnames'
import { flow, pipe } from 'fp-ts/function'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as RS from 'fp-ts/ReadonlySet'
import * as T from 'fp-ts/ReadonlyTuple'
import { useSubscription } from 'observable-hooks'
import { useState } from 'preact/hooks'
import { JSX } from 'preact/jsx-runtime'

interface FoodElementState {
  readonly name: string
  readonly id: string
  readonly selected: boolean
  readonly removed: boolean
}

interface FoodsPageState {
  readonly loading: boolean
  readonly selected: ReadonlySet<string>
  readonly foods: RR.ReadonlyRecord<string, FoodElementState>
}

const combineState:
(data: FoodsPageData) =>
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
(toJsx: (state: FoodElementState) => JSX.Element)
=> (record: RR.ReadonlyRecord<string, FoodElementState>)
=> readonly JSX.Element[] =
toJsx => flow(
  RR.toEntries,
  RA.map(T.snd),
  RA.map(toJsx)
)

const Item = ({ food }: { food: FoodElementState }): JSX.Element =>
  <li key={food.id} class='p-3 sm:pb-4 bg-white m-2 shadow-md'>
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

export function AddFoodPage (): JSX.Element {
  const [state, setState] = useState<FoodsPageState>(init)

  const { useCases: { foodsPageData$ } } = useGlobalContext()

  useSubscription(
    foodsPageData$,
    data => setState(combineState(data))
  )

  return (
    <div class={classnames('bg-gray-100 h-screen transition-opacity duration-500 ease-in-out', state.loading ? 'opacity-60' : 'opacity-100')}>
      <div class='flex items-center p-3 text-white text-2xl font-bold h-14 bg-orange-700'>
        Fridgy - Add Food
      </div>
      <button type='button' class='fixed right-3 bottom-8 text-white bg-orange-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-full text-lg p-3 text-center inline-flex items-center mr-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' class='w-6 h-6'>
          <path fill-rule='evenodd' d='M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z' clip-rule='evenodd' />
        </svg>

        <span class='sr-only'>Add Food</span>
      </button>
    </div>
  )
}
