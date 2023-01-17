import classNames from 'classnames'
import { JSX } from 'react/jsx-runtime'

export const Transition = (props: { loading: boolean, children: JSX.Element[] | JSX.Element }): JSX.Element => (
  <div class={classNames('transition-opacity duration-500 ease-in-out', props.loading ? 'opacity-60' : 'opacity-100')}>
    {props.children}
  </div>)
