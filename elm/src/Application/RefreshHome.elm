module Application.RefreshHome exposing (..)

import Dict
import Process exposing (spawn)
import Reader exposing (Reader(..), reader)
import Task exposing (Task)
import Time exposing (Posix)


type FoodModelState
    = Expired
    | Ok


type FoodModel
    = FoodModel
        { id : String
        , name : String
        , expDate : Posix
        , state : FoodModelState
        }


type FoodPageModel
    = FoodPageModel
        { foods : Dict.Dict String FoodModel
        }


type alias FoodPageData =
    { foods : Dict.Dict String { name : String, id : String }
    }


type Msg
    = Attempted (Result () ())


refresh : Reader (Task err FoodPageData) (Task () FoodPageModel)
refresh =
    Reader
        (\t ->
            spawn t
        )
