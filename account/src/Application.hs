{-# LANGUAGE DeriveFunctor #-}
{-# LANGUAGE DerivingStrategies #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE StandaloneKindSignatures #-}

module Application
  ( createAccount,
  )
where

import Control.Monad.Except (MonadError, runExcept)
import Control.Monad.Free (MonadFree, liftF)
import Data.Kind (Type)
import Data.Text (Text)
import Domain qualified as D

type CreateAccount :: Type -> Type
data CreateAccount param
  = GenerateUUID (Text -> param)
  | HashPassword Text (Text -> param)
  deriving stock (Functor)

generateUUID :: MonadFree CreateAccount m => m Text
generateUUID = liftF $ GenerateUUID id

createAccount ::
  MonadFree CreateAccount m =>
  MonadError Text m =>
  m ()
createAccount =
  let asd =
        runExcept
          ( D.createAccount
              (D.AccountId "")
              (D.Email "")
              (D.FirstName "")
              (D.LastName "")
              (D.HashedPassword "")
              (D.DoesAccountEmailExist True)
          )
   in return ()

getPost :: MonadError Text m => Text -> Text -> m ()
getPost s = undefined s

getPosts :: MonadError Text m => Text -> Text -> m ()
getPosts = undefined
