import * as RoR from 'fp-ts/ReadonlyRecord'
import { useState } from 'preact/hooks'
import { JSX } from 'preact/jsx-runtime'

import { Title } from '@/presentation/preact/ui/title'
import { Transition } from '@/presentation/preact/ui/transition'

interface FoodElementState {
  readonly name: string
  readonly id: string
  readonly selected: boolean
  readonly removed: boolean
}

interface FoodsPageState {
  readonly loading: boolean
  readonly selected: ReadonlySet<string>
  readonly foods: RoR.ReadonlyRecord<string, FoodElementState>
}

const init: FoodsPageState = {
  loading: true,
  selected: new Set(),
  foods: {}
}

export function AddFoodPage (): JSX.Element {
  const [state] = useState<FoodsPageState>(init)

  return (
    <Transition loading={state.loading}>
      <Title text='Add food' />
    </Transition>
  )
}
