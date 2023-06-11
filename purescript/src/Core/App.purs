module MyApp.Core.App (App(..)) where

import Prelude

import Control.Parallel (class Parallel, parallel, sequential)
import Data.Newtype (class Newtype)
import Effect.Aff (Aff, ParAff)
import Effect.Aff.Class (class MonadAff)
import Effect.Class (class MonadEffect)
import MyApp.Application.Query.GetFoods (class GetFoods)
import MyApp.Application.Query.GetNow (class GetNow)
import MyApp.Infrastructure.Dexie.GetFoods (dexieGetFoods)
import MyApp.Infrastructure.Generic.GetNow (genericGetNow)

newtype App :: forall k. (k -> Type) -> k -> Type
newtype App m a = App (m a)

derive newtype instance Functor m => Functor (App m)
derive newtype instance Apply m => Apply (App m)
derive newtype instance Applicative m => Applicative (App m)
derive newtype instance Bind m => Bind (App m)
derive newtype instance Monad m => Monad (App m)
derive newtype instance MonadEffect m => MonadEffect (App m)
derive newtype instance MonadAff m => MonadAff (App m)

derive instance Newtype (App m a) _

instance Parallel (App ParAff) (App Aff) where
  parallel (App a) = App (parallel a)
  sequential (App a) = App (sequential a)

instance MonadAff m => GetFoods (App m) where
  getFoods = dexieGetFoods

instance MonadAff m => GetNow (App m) where
  getNow = genericGetNow