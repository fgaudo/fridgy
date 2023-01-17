import { JSX } from 'react/jsx-runtime'

export const Title = (props: { text: string }): JSX.Element => (
  <div class='fixed w-full bg-gray-100 flex items-center p-3 text-2xl font-bold h-14'>
    {props.text}
  </div>)
