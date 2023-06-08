module Main where

import Prelude

import Application.UseCase.GetHome (getHomeModel)
import Control.Monad.Reader (ReaderT(..), runReaderT)
import Data.HashMap (empty)
import Effect (Effect)
import Effect.Aff (Aff)
import Effect.Aff.Class (liftAff)
import Flame (QuerySelector(..))
import Infrastructure.Dexie.GetFoods
  ( DexieGetFoodsT(..)
  , Env
  )
import Infrastructure.Generic.GetNow (GenericGetNowT(..))
import Presentation.Home (app)

main :: Effect Unit
main = pure unit