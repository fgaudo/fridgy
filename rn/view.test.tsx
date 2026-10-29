/** @jsxImportSource react */
import { describe, expect, mock, test } from 'bun:test'
import { dispatchViolations } from '@fgaudo/effect-tea/testing'
import * as Data from 'effect/Data'
import * as fc from 'fast-check'
import { state } from '#app/children/about/program.test_arbitrary.ts'
import { type Message, type Model, program } from '#app/children/about/program.ts'
import { messagesSentBy } from './view.test_support.ts'

// React Native's own modules are Flow, which Bun cannot load: host components are drawn as their names.
mock.module('react-native', () => ({
  Linking: { openURL: () => Promise.resolve() },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StatusBar: { currentHeight: 24 },
  StyleSheet: { create: <A,>(styles: A) => styles, hairlineWidth: 1 },
  Text: 'Text',
  View: 'View',
}))

const { about } = await import('./view.tsx')

const Msg = Data.taggedEnum<Message>()

describe('About on React Native', () => {
  // The same property as the snabbdom view's, in `src/app/children/about/program.test.ts`.
  test('the view sends what update accepts, all of it, and acts once when sent twice', () => {
    const check = dispatchViolations(program.update, {
      repeatable: (msg) => msg._tag === 'BackPressed' || msg._tag === 'Scrolled',
    })
    fc.assert(fc.property(state, (before) => {
      const askable = [Msg.BackPressed(), Msg.Scrolled({ top: 0 })]
      expect(check(before, messagesSentBy<Model, Message>(about, program.makeModel(before)), askable)).toEqual([])
    }))
  })
})
