import { expect, test } from 'bun:test'
import { describeTags } from './describe-tags.ts'

test('describes the tags of what a value wraps, and none of its data', () => {
  const message = { _tag: 'Home', message: { _tag: 'Products', message: { _tag: 'ItemSelected', id: '42' } } }
  const command = { _tag: 'Home', command: { _tag: 'ShowToast', text: 'secret' } }
  expect(describeTags(message)).toBe('Home › Products › ItemSelected')
  expect(describeTags(command)).toBe('Home › ShowToast')
  expect(describeTags({ _tag: 'BackRequested' })).toBe('BackRequested')
})

test('stops at a field that is not tagged', () => {
  const typed = { _tag: 'NameChanged', message: 'typed text' }
  expect(describeTags(typed)).toBe('NameChanged')
})
