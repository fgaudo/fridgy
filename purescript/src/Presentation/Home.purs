module Presentation.Home (app) where

import Prelude

import Application.UseCase.GetHome (HomeModel)
import Core.App (App)
import Data.Maybe (Maybe(..))
import Effect (Effect)
import Effect.Aff (Aff)
import Flame (Html, QuerySelector(..), (:>))
import Flame.Application.Effectful (AffUpdate)
import Flame.Application.Effectful as FAE
import Flame.Html.Element as HE

view :: String -> Html String
view _ =
  HE.main "main"
    [ HE.div_ "Not Fetched..."
    ]

update :: Aff HomeModel -> (AffUpdate String String)
update asd state =
  do
    lol <- asd
    pure $ identity

init :: String
init = "ciao"

app
  :: { selector :: QuerySelector
     , useCases ::
         { refreshHome :: Aff HomeModel
         }
     }
  -> Effect Unit
app { selector, useCases } = FAE.mount_ selector
  { init: init :> Nothing
  , subscribe: []
  , update: update useCases.refreshHome
  , view
  }