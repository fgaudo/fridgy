import type { Dispatch } from '@fgaudo/effect-tea'
import type { VNode } from 'snabbdom'
import { handlers, initialValue } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { Message, Model } from './add-product.ts'
import { backdrop, fade } from '#libs/ui/overlay.tsx'

const inputValue = (event: Event) => (event.target as HTMLInputElement).value

const field = (label: string, input: VNode) => (
  <div>
    <div>{label}</div>
    {input}
  </div>
)

const inputClassName = 'w-full bg-white focus:inset-ring-1 shadow-md rounded-md p-3'

/** The floating button that opens the form, dimmed while the list is being scrolled. */
export const addButton = (model: Model, dispatch: Dispatch<Message>, isDimmed: boolean) => {
  const { on } = handlers(dispatch)
  return (
    <div
      props={{
        className: cn(
          { 'opacity-100': !isDimmed, 'opacity-30': isDimmed },
          'fixed bottom-5 right-5 flex items-end justify-center z-30 flex-col gap-6 transition-opacity duration-200',
        ),
      }}
    >
      <button
        props={{
          className:
            'relative shadow-md bg-red-200 flex items-center justify-evenly rounded-2xl h-16 w-16 text-red-400',
        }}
        on={model._tag === 'Closed' ? on('click', model.open) : {}}
      >
        <div props={{ className: 'material-symbols-rounded text-4xl!' }}>add</div>
      </button>
    </div>
  )
}

export const modal = (model: Model, dispatch: Dispatch<Message>): ReadonlyArray<VNode> => {
  if (model._tag === 'Closed') {
    return []
  }
  const { on, onValue } = handlers(dispatch)
  // While submitting, the form only shows what is being added.
  const isEditable = model._tag !== 'Submitting'
  return [
    backdrop('add-product-box-background', 'z-1000', isEditable ? on('click', model.close) : {}),
    <div
      key='add-product-box'
      style={{
        ...fade,
        transform: 'scale(0.8)',
        transition: 'opacity 200ms, transform 200ms',
        delayed: { opacity: '1', transform: 'scale(1)' },
      }}
      props={{
        className:
          'w-3/4 m-auto z-1000 fixed bottom-0 left-0 right-0 flex flex-col p-4 gap-2 rounded-lg shadow-md bg-background mb-12',
      }}
    >
      <div props={{ className: 'font-bold' }}>Add a product</div>
      {field(
        'Name',
        <input
          hook={{
            create: initialValue(model.name),
            insert: (node) => {
              ;(node.elm as HTMLInputElement).focus()
            },
          }}
          props={{ className: inputClassName, type: 'text', disabled: !isEditable }}
          on={isEditable ? onValue('input', model.changeName, inputValue) : {}}
        />,
      )}
      {field(
        'Expiration date',
        <input
          hook={{ create: initialValue(model.expirationDate) }}
          props={{ className: inputClassName, type: 'date', disabled: !isEditable }}
          on={isEditable ? onValue('input', model.changeExpiration, inputValue) : {}}
        />,
      )}
      {model._tag === 'Incomplete' && model.isExpirationPast
        && <div props={{ className: 'text-xs text-red-400' }}>This date has already passed.</div>}
      <button
        props={{
          className: cn('w-full mt-4 shadow-md bg-secondary h-12 rounded-md p-3', {
            'opacity-50': model._tag !== 'Complete',
          }),
          disabled: model._tag !== 'Complete',
        }}
        on={model._tag === 'Complete' ? on('click', model.submit) : {}}
      >
        {model._tag === 'Submitting' ? 'Adding…' : 'Add'}
      </button>
    </div>,
  ]
}
