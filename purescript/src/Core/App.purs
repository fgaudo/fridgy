module Core.App where

import Prelude

import Application.Query.GetFoods (class GetFoods)
import Application.Query.GetNow (class GetNow)
import Data.Newtype (class Newtype)
import Effect.Aff (Aff)
import Effect.Aff.Class (class MonadAff)
import Effect.Class (class MonadEffect)
import Infrastructure.Dexie.GetFoods (dexieGetFoods)
import Infrastructure.Generic.GetNow (genericGetNow)

newtype App a = App (Aff a)

derive newtype instance Functor App
derive newtype instance Apply App
derive newtype instance Applicative App
derive newtype instance Bind App
derive newtype instance Monad App
derive newtype instance MonadEffect App
derive newtype instance MonadAff App

derive instance Newtype (App a) _

instance GetFoods App where
  getFoods = dexieGetFoods

instance GetNow App where
  getNow = genericGetNow