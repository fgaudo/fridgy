import { FoodsPageData } from '@/application/read/foods-page'
import { useGlobalContext } from '@/presentation/preact'
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

export function FoodsPage (): JSX.Element {
  const [state, setState] = useState<FoodsPageState>(init)

  const { useCases: { foodsPageData$ } } = useGlobalContext()

  useSubscription(
    foodsPageData$,
    data => setState(combineState(data))
  )

  if (state.loading) {
    return <div>loading</div>
  }

  return (
    <ul>
      {pipe(state.foods, mapFoods(food =>
        <li key={food.id}>{food.name}</li>
      ))}
    </ul>
  )
}
