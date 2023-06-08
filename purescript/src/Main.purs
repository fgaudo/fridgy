module MyApp.Main where

import Prelude

import Data.Newtype (unwrap)
import Effect (Effect)
import Flame (QuerySelector(..))
import MyApp.Application.UseCase.GetHome (HomeModel, getHomeModel)
import MyApp.Core.App (App)
import MyApp.Presentation.Home (app)

main :: Effect Unit
main = app
  { useCases:
      { refreshHome: unwrap getHomeModel'
      }
  , selector: QuerySelector "body"
  }
  where
  getHomeModel' = getHomeModel :: App HomeModel
