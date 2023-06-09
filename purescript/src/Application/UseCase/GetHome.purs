module MyApp.Application.UseCase.GetHome
  ( getHomeModel
  , FoodModel
  , HomeModel
  , Expiration
  ) where

import Prelude

import Control.Parallel (class Parallel, parallel, sequential)
import Data.Either (Either(..))
import Data.HashMap (HashMap, empty)
import Data.Tuple (Tuple(..))
import MyApp.Application.Query.GetFoods (class GetFoods, getFoods)
import MyApp.Application.Query.GetNow (class GetNow, getNow)

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
  :: forall f m
   . GetFoods m
  => Parallel f m
  => GetNow m
  => m HomeModel
getHomeModel = do
  y <- sequential $ Tuple <$> (parallel getNow) <*> (parallel getFoods)
  case y of
    Tuple (Left x) _ -> pure { foods: empty }
    Tuple _ (Left y) -> pure { foods: empty }
    Tuple _ _ -> pure { foods: empty }

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

