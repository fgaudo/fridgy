import { JSX } from 'preact/jsx-runtime'
import { useState } from 'preact/hooks'
import { useObservableState } from 'observable-hooks'

import { useGlobalContext } from '../app'
import { FoodsPageData } from '@/application/read/get-foods'

interface FoodsPageState {
  error: boolean
}

const combineState:
(s: FoodsPageState) =>
(r: FoodsPageData) => FoodsPageState =
state => data => state

export function FoodsPage (): JSX.Element {
  const [state] = useState<FoodsPageState>({ error: false })
  const { useCases: { getFoodsPage } } = useGlobalContext()
  const data = useObservableState(getFoodsPage)

  if (data == null) {
    return <ul />
  }

  const newState = combineState(state)(data)

  return (
    <ul />
  )
}
