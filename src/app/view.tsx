import * as Tea from '@fgaudo/effect-tea'
import * as Match from 'effect/Match'
import { type ComponentProps, Fragment, type ReactNode } from 'react'
import { View as Box, StyleSheet } from 'react-native'
import Animated, {
  type EntryAnimationsValues,
  type ExitAnimationsValues,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  type LayoutAnimation,
  withTiming,
} from 'react-native-reanimated'
import type { View } from '#libs/tea-react/tea-react.ts'
import { duration, easing } from '#styles'
import * as About from './children/about/view.tsx'
import * as AddProducts from './children/add-products/view.tsx'
import * as EditProduct from './children/edit-product/view.tsx'
import * as Home from './children/home/view.tsx'
import type { Message, Model } from './program.ts'

type Motion = Readonly<Pick<ComponentProps<typeof Animated.View>, 'entering' | 'exiting'> & { isOver: boolean }>

// Material's full-screen dialog: it rises from the bottom edge, and sinks back to it. A `translateY`, not
// Reanimated's `SlideInDown`, which moves the view in the layout and lays the page out again on every frame.
const dialog = {
  entering: (values: EntryAnimationsValues): LayoutAnimation => {
    'worklet'
    return {
      initialValues: { translateY: values.windowHeight },
      animations: {
        translateY: withTiming(0, { duration: duration.medium4, easing: easing.emphasizedDecelerate }),
      },
    }
  },
  exiting: (values: ExitAnimationsValues): LayoutAnimation => {
    'worklet'
    return {
      initialValues: { translateY: 0 },
      animations: {
        translateY: withTiming(values.windowHeight, { duration: duration.short4, easing: easing.emphasizedAccelerate }),
      },
    }
  },
}

// The choreographies of `docs/motion.md`.
const motions = {
  // Held under the page that opens over it until that page covers it.
  Home: { exiting: FadeOut.delay(duration.medium4).duration(duration.short1), isOver: false },
  AddProducts: { ...dialog, isOver: true },
  EditProduct: { ...dialog, isOver: true },
  About: {
    entering: FadeInUp.withInitialValues({ opacity: 0, translateY: 30 })
      .duration(duration.medium4)
      .easing(easing.emphasizedDecelerate),
    exiting: FadeOutDown.duration(duration.short4).easing(easing.emphasizedAccelerate),
    isOver: true,
  },
} satisfies Record<Model['page']['_tag'], Motion>

const styles = StyleSheet.create({ layer: StyleSheet.absoluteFill })

// Keyed by the page's name: React reuses an element of the same type in the same place, and a page drawn in
// another's would keep its native views, and the text of their fields.
const page = (name: keyof typeof motions, drawn: ReactNode) => {
  const { isOver, ...animations }: Motion = motions[name]
  const shown = (
    <Animated.View key={name} {...animations} style={styles.layer}>
      {drawn}
    </Animated.View>
  )
  // A leaving page stays where it was in the native tree, under the page drawn in its place, whatever its `zIndex`.
  // The layers keep a page leaving to Home above it. Fabric drops a view that only lays out: `collapsable` keeps them.
  return (
    <Fragment>
      <Box key='under' collapsable={false} pointerEvents='box-none' style={styles.layer}>{isOver ? null : shown}</Box>
      <Box key='over' collapsable={false} pointerEvents='box-none' style={styles.layer}>{isOver ? shown : null}</Box>
    </Fragment>
  )
}

/** The page on top, alone: a page is drawn whole, over nothing but the page that leaves. */
export const view: View<Model, Message> = (model, dispatch) =>
  Match.valueTags(model.page, {
    Home: ({ model }) => page('Home', Home.view(model, Tea.dispatchTo(dispatch, 'Home'))),
    AddProducts: ({ model }) => page('AddProducts', AddProducts.view(model, Tea.dispatchTo(dispatch, 'AddProducts'))),
    EditProduct: ({ model }) => page('EditProduct', EditProduct.view(model, Tea.dispatchTo(dispatch, 'EditProduct'))),
    About: ({ model }) => page('About', About.view(model, Tea.dispatchTo(dispatch, 'About'))),
  })
