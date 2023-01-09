{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE Safe #-}
{-# LANGUAGE StandaloneKindSignatures #-}

module Domain
  ( PostEvent (..),
    AccountId (..),
    PostBody (..),
    createPost,
    removePost,
  )
where

import Control.Monad.Except (MonadError (..))
import Data.Foldable (foldl')
import Data.Kind (Type)
import Data.List.NonEmpty (NonEmpty)
import Data.Text (Text)
import Prelude hiding (id)

type AccountId :: Type
newtype AccountId = AccountId Text
  deriving stock (Eq)

type PostBody :: Type
newtype PostBody = PostBody Text

type IsAccountActive :: Type
newtype IsAccountActive = IsAccountActive Bool

type IsAccountMod :: Type
newtype IsAccountMod = IsAccountMod Bool

type PostEvent :: Type
data PostEvent
  = PostCreated AccountId PostBody
  | PostRemoved AccountId

type CreatePostError :: Type
data CreatePostError = AccountHasInvalidState

createPost ::
  MonadError CreatePostError m =>
  AccountId ->
  IsAccountActive ->
  PostBody ->
  m PostEvent
createPost userId (IsAccountActive isAccountActive) text
  | isAccountActive = return $ PostCreated userId text
  | otherwise = throwError AccountHasInvalidState

type RemovePostError :: Type
data RemovePostError = Unauthorized

removePost ::
  MonadError RemovePostError m =>
  AccountId ->
  IsAccountMod ->
  IsAccountActive ->
  NonEmpty PostEvent ->
  m (Maybe PostEvent)
removePost id (IsAccountMod isAccountMod) (IsAccountActive isAccountActive) postEvents
  | isAccountActive = do
      folded <- return $ foldPostState postEvents
      case folded of
        ActivePost id' _
          | isAccountMod || id == id' -> return $ Just $ PostRemoved id
          | otherwise -> throwError Unauthorized
        _ -> return Nothing
  | otherwise = throwError Unauthorized

type PostFoldedState :: Type
data PostFoldedState
  = InitialPost
  | ActivePost AccountId PostBody
  | RemovedPost AccountId AccountId PostBody

foldPostState :: Foldable m => m PostEvent -> PostFoldedState
foldPostState = foldl' reduce InitialPost
  where
    reduce InitialPost (PostCreated uid text) = ActivePost uid text
    reduce (ActivePost creator text) (PostRemoved remover) = RemovedPost creator remover text
    reduce state _ = state