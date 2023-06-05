module Application.GetHome
  ( getHome
  , retrievalError
  , RetrievalError
  , FoodData
  , HomeData
  , HomeModel(..)
  , FoodModel(..)
  , class GetHomeData
  , getHomeData
  ) where

import Prelude

import Control.Monad.Except.Checked (ExceptV, handleErrors)
import Data.Map (Map, empty)
import Data.Variant (Variant, inj)
import Type.Prelude (Proxy(..))
import Type.Row (type (+))

type FoodData =
  { name :: String
  , id :: String
  }

type HomeData =
  { foods :: Map String FoodData
  }

newtype FoodModel = FoodModel
  { name :: String
  , id :: String
  }

newtype HomeModel = HomeModel
  { foods :: Map String FoodModel
  }

type RetrievalError r = (retrievalError :: String | r)

retrievalError :: forall r. String -> Variant (RetrievalError + r)
retrievalError = inj (Proxy :: Proxy "retrievalError")

class Monad m <= GetHomeData m where
  getHomeData :: forall r. ExceptV (RetrievalError + r) m HomeData

getHome
  :: forall m
   . GetHomeData m
  => m HomeModel
getHome =
  handleErrors
    { retrievalError: retrievalErrorToModel
    }
    getHomeModel
  where
  getHomeModel = do
    homeData <- getHomeData
    successToModel homeData

successToModel :: forall m. Monad m => HomeData -> m HomeModel
successToModel _ = pure $ HomeModel { foods: empty }

retrievalErrorToModel :: forall m. Monad m => String -> m HomeModel
retrievalErrorToModel _ = pure $ HomeModel { foods: empty }