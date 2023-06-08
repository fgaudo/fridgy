module Main where

import Prelude

import Application.UseCase.GetHome (HomeModel, getHomeModel)
import Core.App (App)
import Data.Newtype (unwrap)
import Effect (Effect)
import Flame (QuerySelector(..))
import Presentation.Home (app)

main :: Effect Unit
main = app
  { useCases:
      { refreshHome: unwrap getHomeModel'
      }
  , selector: QuerySelector "body"
  }
  where
  getHomeModel' = getHomeModel :: App HomeModel
