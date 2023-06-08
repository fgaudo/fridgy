module Core.App where

import Prelude

import Application.UseCase.GetHome (HomeModel)
import Effect (Effect)
import Effect.Aff (Aff)
import Flame (QuerySelector)

type App =
  { selector :: QuerySelector
  , useCases ::
      { refreshHome :: Aff HomeModel
      }
  }
  -> Effect Unit