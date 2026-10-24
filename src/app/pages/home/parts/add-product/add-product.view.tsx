import type { Dispatch } from '@fgaudo/effect-tea'
import type { Hooks, On, VNode } from 'snabbdom'
import { handlers, initialValue } from '#libs/tea-snabbdom/tea-snabbdom.ts'
import { cn } from '#libs/ui/class-names.ts'
import type { Message, Model } from './add-product.ts'
import { backdrop } from '#libs/ui/overlay.tsx'

const inputValue = (event: Event) => (event.target as HTMLInputElement).value

type TextField = Readonly<{
  label: string
  type: 'text' | 'date'
  isEnabled: boolean
  error: string | undefined
  hook: Hooks
  on: On
}>

/**
 * Material's outlined text field. The label sits in the field while it is empty and moves into the outline once
 * it is focused or filled (a date input is never empty: it shows its format). The blank placeholder is what
 * `:placeholder-shown` needs to tell an empty field; the label's background, the sheet's, cuts the outline.
 */
const textField = ({ label, type, isEnabled, error, hook, on }: TextField) => (
  <div props={{ className: 'flex flex-col gap-1' }}>
    <label props={{ className: 'relative block' }}>
      <input
        hook={hook}
        props={{
          type,
          disabled: !isEnabled,
          placeholder: ' ',
          className: cn(
            'peer h-14 w-full rounded-extra-small border bg-transparent px-4 text-body-large text-on-surface',
            'outline-none placeholder:text-transparent focus:inset-ring-1',
            'disabled:border-on-surface/12 disabled:text-on-surface/38',
            error === undefined
              ? 'border-outline caret-primary inset-ring-primary hover:border-on-surface focus:border-primary'
              : 'border-error caret-error inset-ring-error',
          ),
        }}
        on={on}
      />
      <span
        props={{
          className: cn(
            'pointer-events-none absolute top-0 left-3 -translate-y-1/2 bg-surface-container-low px-1 text-body-small',
            'transition-all duration-150 peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-body-large',
            'peer-focus:top-0 peer-focus:text-body-small peer-disabled:text-on-surface/38',
            error === undefined ? 'text-on-surface-variant peer-focus:text-primary' : 'text-error',
          ),
        }}
      >
        {label}
      </span>
    </label>
    {error === undefined ? [] : [<div props={{ className: 'px-4 text-body-small text-error' }}>{error}</div>]}
  </div>
)

/**
 * Material's extended FAB: an icon and its action. While the list scrolls it shrinks to the icon alone, to leave
 * the products in view.
 */
export const addButton = (model: Model, dispatch: Dispatch<Message>, isCollapsed: boolean) => {
  const { on } = handlers(dispatch)
  return (
    <button
      props={{
        className: cn(
          'state-layer fixed right-4 bottom-4 z-30 mr-sair mb-saib flex h-14 items-center rounded-large px-4',
          'bg-primary-container text-on-primary-container shadow-elevation-3 hover:shadow-elevation-4',
          'transition-shadow duration-200',
        ),
        title: 'Add a product',
      }}
      on={model._tag === 'Closed' ? on('click', model.open) : {}}
    >
      <span props={{ className: 'material-symbols-rounded' }}>add</span>
      <span
        props={{
          className: cn(
            'overflow-hidden whitespace-nowrap text-label-large transition-[max-width,margin,opacity] duration-200',
            isCollapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-40 opacity-100',
          ),
        }}
      >
        Add product
      </span>
    </button>
  )
}

/**
 * Material's modal bottom sheet: a headline, the fields, and its actions at the end. At the bottom of the screen,
 * the form stays within the thumb's reach, right above the keyboard.
 */
export const modal = (model: Model, dispatch: Dispatch<Message>): ReadonlyArray<VNode> => {
  if (model._tag === 'Closed') {
    return []
  }
  const { on, onValue } = handlers(dispatch)
  // While submitting, the form only shows what is being added.
  const isEditable = model._tag !== 'Submitting'
  return [
    backdrop('add-product-box-background', 'z-1000', isEditable ? on('click', model.close) : {}),
    // The layer holds the sheet at the bottom and lets the taps above it reach the backdrop.
    <div
      key='add-product-box'
      style={{
        transform: 'translateY(100%)',
        transition: 'transform 250ms cubic-bezier(0.05, 0.7, 0.1, 1)',
        delayed: { transform: 'translateY(0)' },
        remove: { transform: 'translateY(100%)' },
      }}
      props={{ className: 'pointer-events-none fixed inset-0 z-1000 flex items-end justify-center' }}
    >
      <div
        props={{
          className:
            'pointer-events-auto flex w-full max-w-160 flex-col gap-4 rounded-t-extra-large bg-surface-container-low pt-6 pb-[calc(1.5rem+var(--spacing-saib))] pl-[calc(1.5rem+var(--spacing-sail))] pr-[calc(1.5rem+var(--spacing-sair))] shadow-elevation-1',
        }}
      >
        <h2 props={{ className: 'text-headline-small text-on-surface' }}>Add a product</h2>
        {textField({
          label: 'Name',
          type: 'text',
          isEnabled: isEditable,
          error: undefined,
          hook: {
            create: initialValue(model.name),
            insert: (node) => {
              ;(node.elm as HTMLInputElement).focus()
            },
          },
          on: isEditable ? onValue('input', model.changeName, inputValue) : {},
        })}
        {textField({
          label: 'Expiration date',
          type: 'date',
          isEnabled: isEditable,
          error: model._tag === 'Incomplete' && model.isExpirationPast ? 'This date has already passed.' : undefined,
          hook: { create: initialValue(model.expirationDate) },
          on: isEditable ? onValue('input', model.changeExpiration, inputValue) : {},
        })}
        <div props={{ className: 'flex justify-end gap-2 pt-2' }}>
          <button
            props={{
              className: 'state-layer h-10 rounded-full px-3 text-label-large text-primary disabled:text-on-surface/38',
              disabled: !isEditable,
            }}
            on={isEditable ? on('click', model.close) : {}}
          >
            Cancel
          </button>
          <button
            props={{
              className: cn(
                'state-layer h-10 rounded-full px-6 text-label-large transition-shadow',
                model._tag === 'Complete'
                  ? 'bg-primary text-on-primary hover:shadow-elevation-1'
                  : 'bg-on-surface/12 text-on-surface/38',
              ),
              disabled: model._tag !== 'Complete',
            }}
            on={model._tag === 'Complete' ? on('click', model.submit) : {}}
          >
            {model._tag === 'Submitting' ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>,
  ]
}
