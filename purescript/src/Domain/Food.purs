module Domain.Food
  ( Food
  , id
  , name
  , isExpired
  , Expiration(..)
  , makeFood
  ) where

import Prelude

import Data.DateTime.Instant (Instant)

newtype Food = Food
  { name :: String
  , id :: String
  , expiration :: Instant
  }

name :: Food -> String
name (Food food) = food.name

id :: Food -> String
id (Food food) = food.id

data Expiration = NotExpired | Expired | Check

isExpired :: Instant -> Food -> Expiration
isExpired now (Food food) =
  if now > food.expiration then NotExpired
  else Expired

makeFood
  :: { name :: String
     , id :: String
     , expiration :: Instant
     }
  -> Food
makeFood = Food