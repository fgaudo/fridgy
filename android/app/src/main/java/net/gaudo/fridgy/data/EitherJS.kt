package net.gaudo.fridgy.data

import com.getcapacitor.JSObject

object EitherJS {
    fun left(value: Any?): JSObject {
        return JSObject().put("_tag", "Left").put("left", value)
    }

    fun right(value: Any?): JSObject {
        return JSObject().put("_tag", "Right").put("right", value)
    }
}
