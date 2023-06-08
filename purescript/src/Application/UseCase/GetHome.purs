module Application.UseCase.GetHome
  ( getHomeModel
  , FoodModel
  , HomeModel
  , Expiration
  ) where

import Prelude

import Application.Query.GetFoods (class GetFoods)
import Application.Query.GetNow (class GetNow)
import Data.HashMap (HashMap, empty)

data Expiration = Expired | NotExpired

type FoodModel =
  { name :: String
  , id :: String
  , state :: Expiration
  }

type HomeModel =
  { foods :: HashMap String FoodModel
  }

getHomeModel
  :: forall m. GetFoods m => GetNow m => m HomeModel
getHomeModel =
  ( pure
      { foods: empty
      }
  )

homeDataToModel :: HomeModel
homeDataToModel =
  { foods: empty
  }

foodDataToModel :: FoodModel
foodDataToModel =

  { id: "Food.id food"
  , name: "Food.name food"
  , state: Expired
  }

retrievalErrorToModel :: forall m. Monad m => String -> m HomeModel
retrievalErrorToModel _ = pure $ { foods: empty }

