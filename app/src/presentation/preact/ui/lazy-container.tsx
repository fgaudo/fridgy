import { JSX } from 'react/jsx-runtime'

export const LazyContainer = (props: { cssHeight?: string, cssWidth?: string, children: JSX.Element[] | JSX.Element }): JSX.Element => (
  <div style={`content-visibility: auto; contain-intrinsic-size: ${props.cssWidth ?? 'auto'} ${props.cssHeight ?? 'auto'}`}>
    {props.children}
  </div>)
