module Main where

import Prelude

import Application.GetHome (HomeModel, getHome)
import Control.Monad.Reader (runReaderT)
import Data.Newtype (unwrap)
import Effect (Effect)
import Flame (QuerySelector(..))
import Infrastructure.GetHomeData (GetHomeDataProd)
import Presentation.Home (app)

main ∷ Effect Unit
main = app
  { useCases:
      { refreshHome: runReaderT (unwrap getHome') { param: "" }
      }
  , selector: QuerySelector "body"
  }
  where
  getHome' = (getHome :: GetHomeDataProd HomeModel)