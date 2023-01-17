import { JSX } from 'react/jsx-runtime'

export const AddFab = (props: { onClick: () => void, label: string, color: string }): JSX.Element => (
  <button onClick={props.onClick} type='button' class={`text-white bg-${props.color} focus:ring-4 focus:outline-none font-medium rounded-full text-lg p-3 text-center inline-flex items-center`}>
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' class='w-6 h-6'>
      <path fill-rule='evenodd' d='M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z' clip-rule='evenodd' />
    </svg>
    <span class='sr-only'>{props.label}</span>
  </button>
)
