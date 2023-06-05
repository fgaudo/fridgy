module Presentation.App exposing (..)

import Browser
import Reader exposing (Reader, reader)


view : Reader () (Program a Int Int)
view =
    reader <|
        Browser.application
            { init = \_ -> \_ -> \_ -> ( 0, Cmd.none )
            , onUrlChange = \_ -> 3
            , onUrlRequest = \_ -> 3
            , subscriptions = \_ -> Sub.none
            , update = \_ -> \_ -> ( 3, Cmd.none )
            , view = \_ -> { title = "", body = [] }
            }
